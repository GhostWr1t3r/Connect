"use server"

import { createClient } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"

// Create a single supabase client for server components
const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Types
export type Post = {
  id: string
  content: string
  media_url: string | null
  media_type: "image" | "video" | "audio" | null
  created_at: string
  likes: number
}

export type Comment = {
  id: string
  post_id: string
  parent_id: string | null
  content: string
  created_at: string
  likes: number
}

// Post actions
export async function getPosts() {
  const { data, error } = await supabase.from("posts").select("*").order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching posts:", error)
    return []
  }

  return data as Post[]
}

export async function createPost(content: string, mediaUrl?: string, mediaType?: "image" | "video" | "audio") {
  const { data, error } = await supabase
    .from("posts")
    .insert([
      {
        content,
        media_url: mediaUrl || null,
        media_type: mediaType || null,
      },
    ])
    .select()

  if (error) {
    console.error("Error creating post:", error)
    throw new Error("Failed to create post")
  }

  revalidatePath("/")
  return data[0] as Post
}

export async function likePost(postId: string, currentLikes: number) {
  const { error } = await supabase
    .from("posts")
    .update({ likes: currentLikes + 1 })
    .eq("id", postId)

  if (error) {
    console.error("Error liking post:", error)
    throw new Error("Failed to like post")
  }

  revalidatePath("/")
}

// Comment actions
export async function getComments(postId: string) {
  const { data, error } = await supabase
    .from("comments")
    .select("*")
    .eq("post_id", postId)
    .order("created_at", { ascending: true })

  if (error) {
    console.error("Error fetching comments:", error)
    return []
  }

  return data as Comment[]
}

export async function createComment(postId: string, content: string, parentId?: string) {
  const { data, error } = await supabase
    .from("comments")
    .insert([
      {
        post_id: postId,
        content,
        parent_id: parentId || null,
      },
    ])
    .select()

  if (error) {
    console.error("Error creating comment:", error)
    throw new Error("Failed to create comment")
  }

  revalidatePath("/")
  return data[0] as Comment
}

export async function likeComment(commentId: string, currentLikes: number) {
  const { error } = await supabase
    .from("comments")
    .update({ likes: currentLikes + 1 })
    .eq("id", commentId)

  if (error) {
    console.error("Error liking comment:", error)
    throw new Error("Failed to like comment")
  }

  revalidatePath("/")
}

// Media upload
export async function uploadMedia(file: File, path: string) {
  const { data, error } = await supabase.storage.from("media").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  })

  if (error) {
    console.error("Error uploading media:", error)
    throw new Error("Failed to upload media")
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("media").getPublicUrl(data.path)

  return publicUrl
}

