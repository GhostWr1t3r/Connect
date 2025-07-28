"use client"

import { notFound } from "next/navigation"
import { useState, useEffect } from "react"
import { Heart, MessageSquare, Share2, MoreHorizontal, Send, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { likePost, getComments, createComment, likeComment, type Comment } from "@/app/actions"
import { cn } from "@/lib/utils"

interface PostPageProps {
  params: { id: string }
}

interface Post {
  id: string
  content: string
  media_url: string | null
  media_type: string | null
  created_at: string
  likes: number
}

const fetchPostById = async (postId: string) => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_URL}/api/posts?id=${postId}`, {
    cache: "no-store", // Ensure fresh data on each request
  })
  const data = await response.json()
  return data.success ? data.post : null
}

export default function PostPage({ params }: PostPageProps) {
  const [post, setPost] = useState<Post | null>(null)
  const [loading, setLoading] = useState(true)
  const [comments, setComments] = useState<Comment[]>([])
  const [commentContent, setCommentContent] = useState("")
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const { toast } = useToast()

  // Fetch post and comments
  useEffect(() => {
    async function loadData() {
      try {
        const fetchedPost = await fetchPostById(params.id)
        if (!fetchedPost) {
          return notFound()
        }
        setPost(fetchedPost)
        
        // Fetch comments for this post
        const fetchedComments = await getComments(params.id)
        setComments(fetchedComments)
      } catch (error) {
        console.error("Error loading post data:", error)
        toast({
          title: "Error",
          description: "Failed to load post data",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }
    
    loadData()
  }, [params.id, toast])

  // Handle post like
  const handleLikePost = async () => {
    if (!post) return
    
    try {
      // Optimistic update
      setPost({ ...post, likes: post.likes + 1 })
      await likePost(post.id, post.likes)
    } catch (error) {
      // Revert on error
      setPost({ ...post, likes: post.likes })
      toast({
        title: "Error",
        description: "Failed to like post",
        variant: "destructive",
      })
    }
  }

  // Handle comment submission
  const handleSubmitComment = async () => {
    if (!post || !commentContent.trim()) {
      toast({
        title: "Empty comment",
        description: "Please add some content to your comment",
        variant: "destructive",
      })
      return
    }

    try {
      const newComment = await createComment(post.id, commentContent, replyingTo || undefined)

      // Update local state
      setComments([...comments, newComment])

      // Reset form
      setCommentContent("")
      setReplyingTo(null)

      toast({
        title: "Success",
        description: "Your comment has been posted",
      })
    } catch (error) {
      console.error("Error creating comment:", error)
      toast({
        title: "Error",
        description: "Failed to post comment",
        variant: "destructive",
      })
    }
  }

  // Handle comment like
  const handleLikeComment = async (commentId: string, currentLikes: number) => {
    try {
      // Optimistic update
      setComments(
        comments.map((comment) =>
          comment.id === commentId ? { ...comment, likes: comment.likes + 1 } : comment
        )
      )

      await likeComment(commentId, currentLikes)
    } catch (error) {
      // Revert on error
      setComments(
        comments.map((comment) =>
          comment.id === commentId ? { ...comment, likes: currentLikes } : comment
        )
      )

      toast({
        title: "Error",
        description: "Failed to like comment",
        variant: "destructive",
      })
    }
  }

  // Set up reply to comment
  const handleReplyToComment = (commentId: string) => {
    setReplyingTo(commentId)
  }

  // Cancel reply
  const cancelReply = () => {
    setReplyingTo(null)
  }

  // Share post link
  const sharePost = () => {
    if (!post) return
    
    const url = `${window.location.origin}/post/${post.id}`
    navigator.clipboard.writeText(url)
    toast({
      title: "Link copied",
      description: "Post link copied to clipboard",
    })
  }

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    }).format(date)
  }

  // Render media content
  const renderMedia = (url: string | null, type: string | null) => {
    if (!url || !type) return null

    switch (type) {
      case "image":
        return (
          <div className="mt-3 rounded-lg overflow-hidden">
            <img
              src={url || "/placeholder.svg"}
              alt="Post media"
              className="w-full h-auto max-h-[500px] object-contain bg-black/5 dark:bg-white/5"
            />
          </div>
        )
      case "video":
        return (
          <div className="mt-3 rounded-lg overflow-hidden">
            <video src={url} controls className="w-full max-h-[500px]" />
          </div>
        )
      case "audio":
        return (
          <div className="mt-3">
            <audio src={url} controls className="w-full" />
          </div>
        )
      default:
        return null
    }
  }

  // Render comments for a post
  const renderComments = () => {
    if (comments.length === 0) {
      return <div className="py-6 text-center text-muted-foreground">No comments yet. Be the first to comment!</div>
    }

    // Group comments by parent_id
    const commentsByParent: Record<string, Comment[]> = {}
    const topLevelComments: Comment[] = []

    comments.forEach((comment) => {
      if (comment.parent_id) {
        if (!commentsByParent[comment.parent_id]) {
          commentsByParent[comment.parent_id] = []
        }
        commentsByParent[comment.parent_id].push(comment)
      } else {
        topLevelComments.push(comment)
      }
    })

    // Recursive function to render comment thread
    const renderCommentThread = (comment: Comment, depth = 0) => {
      const replies = commentsByParent[comment.id] || []

      return (
        <div key={comment.id} className={cn("border-l-2 pl-4", depth > 0 ? "ml-4 mt-3" : "mt-4")}>
          <div className="flex items-start gap-2">
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-xs">A</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="bg-muted/40 rounded-lg p-3">
                <div className="text-sm">{comment.content}</div>
              </div>
              <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                <span>{formatDate(comment.created_at)}</span>
                <button
                  className="flex items-center gap-1 hover:text-foreground"
                  onClick={() => handleReplyToComment(comment.id)}
                >
                  <MessageSquare className="h-3 w-3" /> Reply
                </button>
                <button
                  className="flex items-center gap-1 hover:text-foreground"
                  onClick={() => handleLikeComment(comment.id, comment.likes)}
                >
                  <Heart className="h-3 w-3" /> {comment.likes > 0 ? comment.likes : ""}
                </button>
              </div>
            </div>
          </div>

          {replies.map((reply) => renderCommentThread(reply, depth + 1))}
        </div>
      )
    }

    return <div className="space-y-2">{topLevelComments.map((comment) => renderCommentThread(comment))}</div>
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-6 text-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading post...</p>
      </div>
    )
  }

  if (!post) {
    return notFound()
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card className="overflow-hidden">
        <CardHeader className="p-4 pb-0">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
              <Avatar>
                <AvatarFallback>A</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">Anonymous</p>
                <p className="text-xs text-muted-foreground">{formatDate(post.created_at)}</p>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={sharePost}>
                  <Share2 className="h-4 w-4 mr-2" />
                  Copy link
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        <CardContent className="p-4">
          <p className="text-xl font-bold mb-4">{post.content}</p>
          {renderMedia(post.media_url, post.media_type)}
        </CardContent>

        <CardFooter className="p-4 pt-0 flex flex-col">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
              onClick={handleLikePost}
            >
              <Heart className="h-4 w-4" />
              <span>{post.likes > 0 ? post.likes : ""}</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
            >
              <MessageSquare className="h-4 w-4" />
              <span>{comments.length > 0 ? comments.length : ""}</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
              onClick={sharePost}
            >
              <Share2 className="h-4 w-4" />
            </Button>
          </div>

          <div className="w-full mt-4">
            <Separator className="mb-4" />

            {renderComments()}

            <div className="mt-4">
              {replyingTo && (
                <div className="mb-2 flex items-center justify-between bg-muted/40 rounded p-2 text-xs">
                  <span>Replying to comment</span>
                  <Button variant="ghost" size="icon" className="h-5 w-5" onClick={cancelReply}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-xs">A</AvatarFallback>
                </Avatar>
                <div className="flex-1 flex items-center gap-2">
                  <Input
                    placeholder="Write a comment..."
                    value={commentContent}
                    onChange={(e) => setCommentContent(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    size="icon"
                    onClick={handleSubmitComment}
                    disabled={!commentContent.trim()}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
