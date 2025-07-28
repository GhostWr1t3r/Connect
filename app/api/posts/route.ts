import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

// Initialize Supabase client with service role key
const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const postId = searchParams.get("id")

    if (postId) {
      // Get a specific post
      const { data, error } = await supabase.from("posts").select("*").eq("id", postId).single()

      if (error) {
        return NextResponse.json(
          { success: false, message: "Failed to fetch post", error: error.message },
          { status: 500 },
        )
      }

      return NextResponse.json({ success: true, post: data })
    } else {
      // Get all posts with pagination
      const page = Number.parseInt(searchParams.get("page") || "1")
      const limit = Number.parseInt(searchParams.get("limit") || "10")
      const offset = (page - 1) * limit

      const { data, error, count } = await supabase
        .from("posts")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) {
        return NextResponse.json(
          { success: false, message: "Failed to fetch posts", error: error.message },
          { status: 500 },
        )
      }

      return NextResponse.json({
        success: true,
        posts: data,
        pagination: {
          page,
          limit,
          total: count,
          pages: Math.ceil((count || 0) / limit),
        },
      })
    }
  } catch (error) {
    console.error("Error fetching posts:", error)
    return NextResponse.json(
      { success: false, message: "Failed to fetch posts", error: String(error) },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { content, media_url, media_type } = body

    if (!content && !media_url) {
      return NextResponse.json({ success: false, message: "Post must have content or media" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("posts")
      .insert([
        {
          content: content || null,
          media_url: media_url || null,
          media_type: media_type || null,
        },
      ])
      .select()

    if (error) {
      return NextResponse.json(
        { success: false, message: "Failed to create post", error: error.message },
        { status: 500 },
      )
    }

    return NextResponse.json({ success: true, post: data[0] })
  } catch (error) {
    console.error("Error creating post:", error)
    return NextResponse.json(
      { success: false, message: "Failed to create post", error: String(error) },
      { status: 500 },
    )
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { id, content, media_url, media_type } = body

    if (!id) {
      return NextResponse.json({ success: false, message: "Post ID is required" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("posts")
      .update({
        content: content || null,
        media_url: media_url || null,
        media_type: media_type || null,
      })
      .eq("id", id)
      .select()

    if (error) {
      return NextResponse.json(
        { success: false, message: "Failed to update post", error: error.message },
        { status: 500 },
      )
    }

    return NextResponse.json({ success: true, post: data[0] })
  } catch (error) {
    console.error("Error updating post:", error)
    return NextResponse.json(
      { success: false, message: "Failed to update post", error: String(error) },
      { status: 500 },
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const postId = searchParams.get("id")

    if (!postId) {
      return NextResponse.json({ success: false, message: "Post ID is required" }, { status: 400 })
    }

    // First, delete any associated media
    const { data: post } = await supabase.from("posts").select("media_url").eq("id", postId).single()

    if (post?.media_url) {
      const mediaPath = post.media_url.split("/").pop()
      if (mediaPath) {
        await supabase.storage.from("media").remove([mediaPath])
      }
    }

    // Then delete the post (comments will be cascade deleted due to foreign key)
    const { error } = await supabase.from("posts").delete().eq("id", postId)

    if (error) {
      return NextResponse.json(
        { success: false, message: "Failed to delete post", error: error.message },
        { status: 500 },
      )
    }

    return NextResponse.json({ success: true, message: "Post deleted successfully" })
  } catch (error) {
    console.error("Error deleting post:", error)
    return NextResponse.json(
      { success: false, message: "Failed to delete post", error: String(error) },
      { status: 500 },
    )
  }
}

