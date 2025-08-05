"use client"

import type React from "react"
import { useState, useRef, useEffect, useCallback, Fragment } from "react"
import {
  Heart,
  MessageSquare,
  Share2,
  MoreHorizontal,
  ImageIcon,
  Video,
  Mic,
  Send,
  X,
  Sparkles,
  Search,
  Plus,
  Bookmark,
  Eye,
  Clock,
  Loader2,
  ArrowUp,
  Globe,
  Shield,
  Lock,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { uploadMedia } from "./lib/upload-media"
import {
  getPosts,
  createPost,
  likePost,
  getComments,
  createComment,
  likeComment,
  type Post,
  type Comment,
} from "./app/actions"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { useTheme } from "next-themes"

export default function Connect() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)
  const [postContent, setPostContent] = useState("")
  const [mediaFile, setMediaFile] = useState<File | null>(null)
  const [mediaPreview, setMediaPreview] = useState<string | null>(null)
  const [mediaType, setMediaType] = useState<"image" | "video" | "audio" | null>(null)
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({})
  const [comments, setComments] = useState<Record<string, Comment[]>>({})
  const [loadingComments, setLoadingComments] = useState<Record<string, boolean>>({})
  const [commentContent, setCommentContent] = useState<Record<string, string>>({})
  const [replyingTo, setReplyingTo] = useState<Record<string, string | null>>({})
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({})
  const [likedComments, setLikedComments] = useState<Record<string, boolean>>({})
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({})
  const [searchQuery, setSearchQuery] = useState("")
  const [filteredPosts, setFilteredPosts] = useState<Post[]>([])
  const [userIp, setUserIp] = useState<string>("")
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const [isPostDialogOpen, setIsPostDialogOpen] = useState(false)
  const [isComposeExpanded, setIsComposeExpanded] = useState(false)
  const [quickPostContent, setQuickPostContent] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const quickFileInputRef = useRef<HTMLInputElement>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()
  const { setTheme } = useTheme()

  // Set dark theme on mount
  useEffect(() => {
    setTheme("dark")
  }, [setTheme])

  // Get user IP
  useEffect(() => {
    const fetchIp = async () => {
      try {
        const res = await fetch("/api/get-ip")
        const data = await res.json()
        // Mask the last two octets
        const ipParts = data.ip.split(".")
        if (ipParts.length === 4) {
          ipParts[2] = "**"
          ipParts[3] = "**"
          setUserIp(ipParts.join("."))
        } else {
          setUserIp(data.ip)
        }
      } catch (error) {
        console.error("Failed to fetch IP:", error)
        setUserIp("Unknown")
      }
    }
    fetchIp()
  }, [])

  // Filter posts based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredPosts(posts)
      return
    }
    const filtered = posts.filter((post) => post.content.toLowerCase().includes(searchQuery.toLowerCase()))
    setFilteredPosts(filtered)
  }, [searchQuery, posts])

  // Fetch posts on component mount and ensure bucket exists
  useEffect(() => {
    async function initialize() {
      try {
        // Ensure bucket exists first
        try {
          const response = await fetch("/api/create-bucket")
          if (!response.ok) {
            console.error("Failed to initialize bucket")
          }
        } catch (bucketError) {
          console.error("Error initializing bucket:", bucketError)
          // Continue anyway, we'll try again when uploading
        }

        // Fetch posts
        const fetchedPosts = await getPosts(1, 5) // Reduced page size for faster initial load
        setPosts(fetchedPosts)
        setFilteredPosts(fetchedPosts)
        setHasMore(fetchedPosts.length === 5) // Assuming 5 posts per page

        // Fetch comment counts for all posts
        await Promise.all(
          fetchedPosts.map(async (post) => {
            try {
              const postComments = await getComments(post.id)
              setCommentCounts((prev) => ({ ...prev, [post.id]: postComments.length }))
              setComments((prev) => ({ ...prev, [post.id]: postComments }))
            } catch (error) {
              console.error(`Error fetching comments for post ${post.id}:`, error)
            }
          }),
        )

        // Load liked status from localStorage
        const savedLikedPosts = localStorage.getItem("likedPosts")
        if (savedLikedPosts) {
          setLikedPosts(JSON.parse(savedLikedPosts))
        }
        const savedLikedComments = localStorage.getItem("likedComments")
        if (savedLikedComments) {
          setLikedComments(JSON.parse(savedLikedComments))
        }
      } catch (error) {
        console.error("Error initializing:", error)
        toast({
          title: "Error",
          description: "Failed to load posts",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }
    initialize()
  }, [toast])

  // Save liked status to localStorage when it changes
  useEffect(() => {
    localStorage.setItem("likedPosts", JSON.stringify(likedPosts))
  }, [likedPosts])

  useEffect(() => {
    localStorage.setItem("likedComments", JSON.stringify(likedComments))
  }, [likedComments])

  // Handle scroll to top button visibility
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 500) {
        setShowScrollTop(true)
      } else {
        setShowScrollTop(false)
      }
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // Load more posts when scrolling
  const loadMorePosts = useCallback(async () => {
    if (loadingMore || !hasMore) return

    try {
      setLoadingMore(true)
      const nextPage = page + 1
      const morePosts = await getPosts(nextPage, 5) // Fetch 5 posts at a time

      if (morePosts.length > 0) {
        setPosts((prev) => [...prev, ...morePosts])
        setFilteredPosts((prev) => {
          if (searchQuery.trim()) {
            return [
              ...prev,
              ...morePosts.filter((post) => post.content.toLowerCase().includes(searchQuery.toLowerCase())),
            ]
          }
          return [...prev, ...morePosts]
        })
        setPage(nextPage)
        setHasMore(morePosts.length === 5) // Assuming 5 posts per page

        // Fetch comment counts for new posts
        await Promise.all(
          morePosts.map(async (post) => {
            try {
              const postComments = await getComments(post.id)
              setCommentCounts((prev) => ({ ...prev, [post.id]: postComments.length }))
              setComments((prev) => ({ ...prev, [post.id]: postComments }))
            } catch (error) {
              console.error(`Error fetching comments for post ${post.id}:`, error)
            }
          }),
        )
      } else {
        setHasMore(false)
      }
    } catch (error) {
      console.error("Error loading more posts:", error)
      toast({
        title: "Error",
        description: "Failed to load more posts",
        variant: "destructive",
      })
    } finally {
      setLoadingMore(false)
    }
  }, [page, loadingMore, hasMore, toast, searchQuery])

  // Set up intersection observer for infinite scrolling
  useEffect(() => {
    if (loading) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadMorePosts()
        }
      },
      { threshold: 0.1 },
    )

    observerRef.current = observer
    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current)
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [loading, hasMore, loadingMore, loadMorePosts])

  // Handle media file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, isQuickCompose = false) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Maximum file size is 10MB",
        variant: "destructive",
      })
      return
    }

    setMediaFile(file)

    // Determine media type and create preview
    if (file.type.startsWith("image/")) {
      setMediaType("image")
      const reader = new FileReader()
      reader.onload = (e) => setMediaPreview(e.target?.result as string)
      reader.readAsDataURL(file)
    } else if (file.type.startsWith("video/")) {
      setMediaType("video")
      const reader = new FileReader()
      reader.onload = (e) => setMediaPreview(e.target?.result as string)
      reader.readAsDataURL(file)
    } else if (file.type.startsWith("audio/")) {
      setMediaType("audio")
      setMediaPreview(null) // No preview for audio
    } else {
      toast({
        title: "Unsupported file type",
        description: "Please upload an image, video, or audio file",
        variant: "destructive",
      })
      setMediaFile(null)
      setMediaType(null)
      setMediaPreview(null)
      return
    }

    // If this is from quick compose, expand it
    if (isQuickCompose) {
      setIsComposeExpanded(true)
    }

    toast({
      title: "File selected",
      description: `${file.name} is ready to upload`,
    })
  }

  // Clear media selection
  const clearMedia = () => {
    setMediaFile(null)
    setMediaPreview(null)
    setMediaType(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
    if (quickFileInputRef.current) {
      quickFileInputRef.current.value = ""
    }
  }

  // Handle post submission
  const handleSubmitPost = async (content = postContent) => {
    if (!content.trim() && !mediaFile) {
      toast({
        title: "Empty post",
        description: "Please add some content or media to your post",
        variant: "destructive",
      })
      return
    }

    try {
      setIsUploading(true)
      setUploadProgress(0)
      let mediaUrl = null
      let mediaTypeToSave = null

      // Upload media if present
      if (mediaFile) {
        try {
          setUploadProgress(25)
          const uploadResult = await uploadMedia(mediaFile)
          mediaUrl = uploadResult.url
          mediaTypeToSave = uploadResult.type
          setUploadProgress(75)
        } catch (uploadError: any) {
          console.error("Media upload error:", uploadError)
          toast({
            title: "Media upload failed",
            description:
              uploadError.message || "Could not upload your media file. Your post will be created without media.",
            variant: "destructive",
          })
        }
      }

      // Only create post if we have content or media was successfully uploaded
      if (content.trim() || mediaUrl) {
        setUploadProgress(90)
        // Create post
        const newPost = await createPost(content, mediaUrl, mediaTypeToSave as any)

        // Update local state
        setPosts([newPost, ...posts])
        setFilteredPosts([newPost, ...filteredPosts])
        setCommentCounts((prev) => ({ ...prev, [newPost.id]: 0 }))

        // Reset form
        setPostContent("")
        setQuickPostContent("")
        clearMedia()
        setIsComposeExpanded(false)
        setUploadProgress(100)

        toast({
          title: "Success",
          description: "Your post has been published",
        })
      } else {
        toast({
          title: "Post not created",
          description: "Your post needs either text content or media",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      console.error("Error creating post:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to create post",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
      setIsPostDialogOpen(false)
    }
  }

  // Handle quick post submission
  const handleQuickPost = async () => {
    if (!quickPostContent.trim() && !mediaFile) {
      toast({
        title: "Empty post",
        description: "Please add some content or media to your post",
        variant: "destructive",
      })
      return
    }
    await handleSubmitPost(quickPostContent)
  }

  // Handle post like
  const handleLikePost = async (postId: string, currentLikes: number) => {
    // Check if already liked
    if (likedPosts[postId]) {
      toast({
        title: "Already liked",
        description: "You've already liked this post",
      })
      return
    }

    try {
      // Optimistic update
      setPosts(posts.map((post) => (post.id === postId ? { ...post, likes: post.likes + 1 } : post)))
      setFilteredPosts(filteredPosts.map((post) => (post.id === postId ? { ...post, likes: post.likes + 1 } : post)))
      setLikedPosts({ ...likedPosts, [postId]: true })

      await likePost(postId, currentLikes)
      toast({
        title: "Liked!",
        description: "You liked this post",
      })
    } catch (error: any) {
      // Revert on error
      setPosts(posts.map((post) => (post.id === postId ? { ...post, likes: currentLikes } : post)))
      setFilteredPosts(filteredPosts.map((post) => (post.id === postId ? { ...post, likes: currentLikes } : post)))
      setLikedPosts({ ...likedPosts, [postId]: false })
      toast({
        title: "Error",
        description: error.message || "Failed to like post",
        variant: "destructive",
      })
    }
  }

  // Fetch comments for a post
  const fetchComments = async (postId: string) => {
    if (loadingComments[postId]) return

    try {
      setLoadingComments({ ...loadingComments, [postId]: true })
      const fetchedComments = await getComments(postId)
      setComments({ ...comments, [postId]: fetchedComments })
      setCommentCounts({ ...commentCounts, [postId]: fetchedComments.length })
    } catch (error) {
      console.error("Error fetching comments:", error)
      toast({
        title: "Error",
        description: "Failed to load comments",
        variant: "destructive",
      })
    } finally {
      setLoadingComments({ ...loadingComments, [postId]: false })
    }
  }

  // Toggle comments section
  const toggleComments = async (postId: string) => {
    const isOpen = openComments[postId]
    // If opening comments and we don't have them yet, fetch them
    if (!isOpen && !comments[postId]) {
      await fetchComments(postId)
    }
    setOpenComments({ ...openComments, [postId]: !isOpen })
  }

  // Handle comment submission
  const handleSubmitComment = async (postId: string) => {
    const content = commentContent[postId]
    const parentId = replyingTo[postId]

    if (!content?.trim()) {
      toast({
        title: "Empty comment",
        description: "Please add some content to your comment",
        variant: "destructive",
      })
      return
    }

    try {
      const newComment = await createComment(postId, content, parentId || undefined)

      // Update local state
      const updatedComments = [...(comments[postId] || []), newComment]
      setComments({
        ...comments,
        [postId]: updatedComments,
      })
      setCommentCounts({
        ...commentCounts,
        [postId]: updatedComments.length,
      })

      // Reset form
      setCommentContent({ ...commentContent, [postId]: "" })
      setReplyingTo({ ...replyingTo, [postId]: null })

      toast({
        title: "Comment posted!",
        description: "Your comment has been added successfully",
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
  const handleLikeComment = async (postId: string, commentId: string, currentLikes: number) => {
    // Check if already liked
    if (likedComments[commentId]) {
      toast({
        title: "Already liked",
        description: "You've already liked this comment",
      })
      return
    }

    try {
      // Optimistic update
      setComments({
        ...comments,
        [postId]: comments[postId].map((comment) =>
          comment.id === commentId ? { ...comment, likes: comment.likes + 1 } : comment,
        ),
      })
      setLikedComments({ ...likedComments, [commentId]: true })

      await likeComment(commentId, currentLikes)
      toast({
        title: "Liked!",
        description: "You liked this comment",
      })
    } catch (error: any) {
      // Revert on error
      setComments({
        ...comments,
        [postId]: comments[postId].map((comment) =>
          comment.id === commentId ? { ...comment, likes: currentLikes } : comment,
        ),
      })
      setLikedComments({ ...likedComments, [commentId]: false })
      toast({
        title: "Error",
        description: error.message || "Failed to like comment",
        variant: "destructive",
      })
    }
  }

  // Set up reply to comment
  const handleReplyToComment = (postId: string, commentId: string) => {
    setReplyingTo({ ...replyingTo, [postId]: commentId })
    // Focus the comment input
    setTimeout(() => {
      const commentInput = document.getElementById(`comment-input-${postId}`)
      if (commentInput) {
        commentInput.focus()
      }
    }, 100)
  }

  // Cancel reply
  const cancelReply = (postId: string) => {
    setReplyingTo({ ...replyingTo, [postId]: null })
  }

  // Copy post link to clipboard
  const sharePost = (postId: string) => {
    const url = `${window.location.origin}/post/${postId}`
    navigator.clipboard.writeText(url)
    toast({
      title: "Link copied!",
      description: "Post link copied to clipboard",
    })
  }

  // Scroll to top
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffSecs = Math.floor(diffMs / 1000)
    const diffMins = Math.floor(diffSecs / 60)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffSecs < 60) {
      return "just now"
    } else if (diffMins < 60) {
      return `${diffMins}m ago`
    } else if (diffHours < 24) {
      return `${diffHours}h ago`
    } else if (diffDays < 7) {
      return `${diffDays}d ago`
    } else {
      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
      }).format(date)
    }
  }

  // Render media content
  const renderMedia = (url: string | null, type: string | null) => {
    if (!url || !type) return null

    switch (type) {
      case "image":
        return (
          <div className="mt-3 rounded-xl overflow-hidden bg-zinc-900/50">
            <img
              src={url || "/placeholder.svg"}
              alt="Post media"
              className="w-full h-auto max-h-[500px] object-contain"
              loading="lazy"
            />
          </div>
        )
      case "video":
        return (
          <div className="mt-3 rounded-xl overflow-hidden">
            <video src={url} controls className="w-full max-h-[500px]" preload="metadata" />
          </div>
        )
      case "audio":
        return (
          <div className="mt-3 p-3 rounded-xl bg-zinc-900/50">
            <audio src={url} controls className="w-full" preload="metadata" />
          </div>
        )
      default:
        return null
    }
  }

  // Render media preview
  const renderMediaPreview = () => {
    if (!mediaPreview && !mediaType) return null

    return (
      <div className="relative mt-3 rounded-xl overflow-hidden border border-zinc-800/50 bg-zinc-900/30">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 bg-black/80 rounded-full z-10 hover:bg-black/60 h-8 w-8"
          onClick={clearMedia}
        >
          <X className="h-4 w-4" />
        </Button>
        {mediaType === "image" && mediaPreview && (
          <img
            src={mediaPreview || "/placeholder.svg"}
            alt="Media preview"
            className="w-full h-auto max-h-[300px] object-contain"
          />
        )}
        {mediaType === "video" && mediaPreview && (
          <video src={mediaPreview} controls className="w-full max-h-[300px]" />
        )}
        {mediaType === "audio" && mediaFile && (
          <div className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-zinc-800/50">
              <Mic className="h-6 w-6 text-zinc-400" />
            </div>
            <div>
              <span className="text-sm text-zinc-300 font-medium">{mediaFile.name}</span>
              <p className="text-xs text-zinc-500">Audio file ready to upload</p>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Render post skeleton
  const renderPostSkeleton = () => (
    <div className="bg-zinc-900/60 backdrop-blur-sm rounded-xl overflow-hidden animate-pulse border border-zinc-800/50 shadow-lg">
      <div className="p-4 pb-0">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 w-10 rounded-full bg-zinc-800/50" />
            <div>
              <Skeleton className="h-4 w-24 bg-zinc-800/50" />
              <Skeleton className="h-3 w-16 mt-1 bg-zinc-800/50" />
            </div>
          </div>
          <Skeleton className="h-8 w-8 rounded-full bg-zinc-800/50" />
        </div>
      </div>
      <div className="p-4">
        <Skeleton className="h-4 w-full mb-2 bg-zinc-800/50" />
        <Skeleton className="h-4 w-3/4 mb-2 bg-zinc-800/50" />
        <Skeleton className="h-4 w-1/2 bg-zinc-800/50" />
        <Skeleton className="h-48 w-full mt-3 rounded-xl bg-zinc-800/50" />
      </div>
      <div className="p-4 pt-0">
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-16 rounded-md bg-zinc-800/50" />
          <Skeleton className="h-8 w-16 rounded-md bg-zinc-800/50" />
          <Skeleton className="h-8 w-16 rounded-md bg-zinc-800/50" />
        </div>
      </div>
    </div>
  )

  // Render comments for a post
  const renderComments = (postId: string) => {
    if (loadingComments[postId]) {
      return (
        <div className="space-y-4 py-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-start gap-2 animate-pulse">
              <Skeleton className="h-6 w-6 rounded-full bg-zinc-800/50" />
              <div className="flex-1">
                <Skeleton className="h-16 w-full rounded-xl bg-zinc-800/50" />
                <div className="flex items-center gap-4 mt-1">
                  <Skeleton className="h-3 w-16 bg-zinc-800/50" />
                  <Skeleton className="h-3 w-12 bg-zinc-800/50" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )
    }

    const postComments = comments[postId] || []
    if (postComments.length === 0) {
      return (
        <div className="py-6 text-center text-zinc-500">
          <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-20" />
          <p>No comments yet. Be the first to comment!</p>
        </div>
      )
    }

    // Group comments by parent_id
    const commentsByParent: Record<string, Comment[]> = {}
    const topLevelComments: Comment[] = []

    postComments.forEach((comment) => {
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
        <div
          key={comment.id}
          className={cn(
            "border-l border-zinc-800/50 pl-4",
            depth > 0 ? "ml-4 mt-3" : "mt-4",
            depth > 0 &&
              "relative before:absolute before:w-4 before:h-px before:bg-zinc-800/50 before:top-3 before:-left-0",
          )}
        >
          <div className="flex items-start gap-2">
            <Avatar className="h-6 w-6 border-none bg-zinc-800/80">
              <AvatarFallback className="text-xs bg-zinc-800/80 text-zinc-300">A</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="bg-zinc-800/30 backdrop-blur-sm rounded-xl p-3 border border-zinc-800/30">
                <div className="text-sm text-zinc-300">{comment.content}</div>
              </div>
              <div className="flex items-center gap-4 mt-1 text-xs text-zinc-500">
                <span>{formatDate(comment.created_at)}</span>
                <button
                  className="flex items-center gap-1 hover:text-zinc-300 transition-colors"
                  onClick={() => handleReplyToComment(postId, comment.id)}
                >
                  <MessageSquare className="h-3 w-3" /> Reply
                </button>
                <button
                  className={cn(
                    "flex items-center gap-1 hover:text-zinc-300 transition-colors",
                    likedComments[comment.id] && "text-zinc-300",
                  )}
                  onClick={() => handleLikeComment(postId, comment.id, comment.likes)}
                  disabled={likedComments[comment.id]}
                >
                  <Heart className={cn("h-3 w-3", likedComments[comment.id] && "fill-zinc-300")} />
                  {comment.likes > 0 ? comment.likes : ""}
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-black to-zinc-950 text-white">
      <div ref={scrollContainerRef} className="max-w-2xl mx-auto px-4 py-6">
        {/* Floating Header */}
        <header className="sticky top-0 z-50 backdrop-blur-xl bg-black/70 -mx-4 px-4 py-3 border-b border-zinc-800/50 flex justify-between items-center">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
            Connect
          </h1>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full bg-zinc-900/80 hover:bg-zinc-800 text-white"
              onClick={() => setIsSearchFocused(true)}
            >
              <Search className="h-4 w-4" />
            </Button>
            <Dialog open={isPostDialogOpen} onOpenChange={setIsPostDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="default"
                  size="sm"
                  className="rounded-full bg-gradient-to-r from-zinc-700 to-zinc-900 hover:from-zinc-600 hover:to-zinc-800 border border-zinc-700/50 shadow-lg"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Create
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-zinc-900/95 backdrop-blur-xl border-zinc-800/50 text-white shadow-xl">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold">Create a new post</DialogTitle>
                </DialogHeader>
                <div className="mt-4">
                  <Textarea
                    placeholder="What's on your mind?"
                    className="min-h-[120px] resize-none bg-zinc-800/50 border-zinc-700/50 text-white placeholder:text-zinc-500 rounded-xl"
                    value={postContent}
                    onChange={(e) => setPostContent(e.target.value)}
                  />
                  {renderMediaPreview()}
                  <div className="flex items-center gap-2 mt-4">
                    <Input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      onChange={(e) => handleFileChange(e)}
                      accept="image/*,video/*,audio/*"
                    />
                    <Tabs defaultValue="image" className="w-full">
                      <TabsList className="grid grid-cols-3 bg-zinc-800/50 p-1 rounded-xl">
                        <TabsTrigger
                          value="image"
                          onClick={() => fileInputRef.current?.click()}
                          className="text-zinc-300 data-[state=active]:bg-zinc-700/50 rounded-lg"
                        >
                          <ImageIcon className="h-4 w-4 mr-2" />
                          Image
                        </TabsTrigger>
                        <TabsTrigger
                          value="video"
                          onClick={() => fileInputRef.current?.click()}
                          className="text-zinc-300 data-[state=active]:bg-zinc-700/50 rounded-lg"
                        >
                          <Video className="h-4 w-4 mr-2" />
                          Video
                        </TabsTrigger>
                        <TabsTrigger
                          value="audio"
                          onClick={() => fileInputRef.current?.click()}
                          className="text-zinc-300 data-[state=active]:bg-zinc-700/50 rounded-lg"
                        >
                          <Mic className="h-4 w-4 mr-2" />
                          Audio
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>
                </div>
                <DialogFooter className="mt-4">
                  <div className="flex items-center text-xs text-zinc-500 mr-auto">
                    <Shield className="h-3 w-3 mr-1" />
                    <span>Your identity is protected</span>
                  </div>
                  <DialogClose asChild>
                    <Button
                      variant="outline"
                      className="bg-zinc-800/50 border-zinc-700/50 hover:bg-zinc-700/50 text-white rounded-xl"
                    >
                      Cancel
                    </Button>
                  </DialogClose>
                  <Button
                    onClick={() => handleSubmitPost()}
                    disabled={isUploading || (!postContent.trim() && !mediaFile)}
                    className="bg-gradient-to-r from-zinc-700 to-zinc-900 hover:from-zinc-600 hover:to-zinc-800 text-white border border-zinc-700/50 rounded-xl"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {uploadProgress > 0 ? `${uploadProgress}%` : "Uploading..."}
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Post
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </header>

        <div className="mt-6 text-center">
          <p className="text-zinc-400 text-xl mb-2">Morocco’s next-gen anonymous social hub</p>
          <p className="text-zinc-400 mb-2">Share your thoughts and experiences anonymously — no sign-up needed!</p>

          <div className="flex items-center justify-center gap-2 text-xs text-zinc-600">
            <Globe className="h-3 w-3" />
            <span>Your IP: {userIp || "Loading..."}</span>
            <Lock className="h-3 w-3 ml-1" />
          </div>
        </div>

        {/* Search Overlay */}
        {isSearchFocused && (
          <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md p-4 flex flex-col">
            <div className="relative max-w-2xl mx-auto w-full mt-16">
              <Input
                type="text"
                placeholder="Search posts..."
                className="w-full pl-10 py-6 bg-zinc-900/50 border-zinc-800/50 text-white placeholder:text-zinc-500 rounded-xl text-lg"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Search className="w-5 h-5 text-zinc-500" />
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full hover:bg-zinc-800/50"
                onClick={() => setIsSearchFocused(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            {searchQuery.trim() && (
              <div className="max-w-2xl mx-auto w-full mt-4 overflow-auto flex-1">
                {filteredPosts.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-zinc-500">No posts match your search</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredPosts.map((post) => (
                      <div
                        key={post.id}
                        className="bg-zinc-900/60 backdrop-blur-sm rounded-xl p-4 border border-zinc-800/50 cursor-pointer hover:border-zinc-700/50 transition-colors"
                        onClick={() => {
                          setIsSearchFocused(false)
                          setTimeout(() => {
                            document.getElementById(`post-${post.id}`)?.scrollIntoView({ behavior: "smooth" })
                          }, 100)
                        }}
                      >
                        <p className="text-sm text-zinc-300 line-clamp-2">{post.content}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-zinc-500">
                          <span>{formatDate(post.created_at)}</span>
                          <span className="flex items-center gap-1">
                            <Heart className="h-3 w-3" /> {post.likes}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" /> {commentCounts[post.id] || 0}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Quick Compose */}
        <div className="mt-6 mb-6">
          <div
            className={cn(
              "bg-zinc-900/60 backdrop-blur-sm rounded-xl border border-zinc-800/50 transition-all duration-300 shadow-lg hover:border-zinc-700/50",
              isComposeExpanded ? "p-4" : "p-3",
            )}
          >
            {isComposeExpanded ? (
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <Avatar className="h-8 w-8 border-none bg-zinc-800/80">
                    <AvatarFallback className="bg-zinc-800/80 text-zinc-300">A</AvatarFallback>
                  </Avatar>
                  <Textarea
                    placeholder="What's on your mind?"
                    className="flex-1 resize-none bg-transparent border-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 p-0 text-sm min-h-[80px] placeholder:text-zinc-500"
                    value={quickPostContent}
                    onChange={(e) => setQuickPostContent(e.target.value)}
                    autoFocus
                  />
                </div>
                {renderMediaPreview()}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      ref={quickFileInputRef}
                      className="hidden"
                      onChange={(e) => handleFileChange(e, true)}
                      accept="image/*,video/*,audio/*"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full bg-zinc-800/50 hover:bg-zinc-700/50 transition-colors"
                      onClick={() => quickFileInputRef.current?.click()}
                      title="Upload image"
                    >
                      <ImageIcon className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full bg-zinc-800/50 hover:bg-zinc-700/50 transition-colors"
                      onClick={() => quickFileInputRef.current?.click()}
                      title="Upload video"
                    >
                      <Video className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full bg-zinc-800/50 hover:bg-zinc-700/50 transition-colors"
                      onClick={() => quickFileInputRef.current?.click()}
                      title="Upload audio"
                    >
                      <Mic className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-zinc-400 hover:text-zinc-300 hover:bg-transparent"
                      onClick={() => {
                        setQuickPostContent("")
                        clearMedia()
                        setIsComposeExpanded(false)
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      className="rounded-full bg-gradient-to-r from-zinc-700 to-zinc-900 hover:from-zinc-600 hover:to-zinc-800 border border-zinc-700/50"
                      disabled={!quickPostContent.trim() && !mediaFile}
                      onClick={handleQuickPost}
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          {uploadProgress > 0 ? `${uploadProgress}%` : "Posting..."}
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Post
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div
                className="flex items-center gap-2 cursor-text hover:bg-zinc-800/30 rounded-lg p-2 -m-2 transition-colors"
                onClick={() => setIsComposeExpanded(true)}
              >
                <Avatar className="h-8 w-8 border-none bg-zinc-800/80">
                  <AvatarFallback className="bg-zinc-800/80 text-zinc-300">A</AvatarFallback>
                </Avatar>
                <span className="text-zinc-500 text-sm">What's on your mind?</span>
                <div className="ml-auto flex items-center gap-1">
                  <div className="p-1 rounded bg-zinc-800/50">
                    <ImageIcon className="h-3 w-3 text-zinc-600" />
                  </div>
                  <div className="p-1 rounded bg-zinc-800/50">
                    <Video className="h-3 w-3 text-zinc-600" />
                  </div>
                  <div className="p-1 rounded bg-zinc-800/50">
                    <Mic className="h-3 w-3 text-zinc-600" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Posts List */}
        {loading && filteredPosts.length === 0 ? (
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <Fragment key={i}>{renderPostSkeleton()}</Fragment>
            ))}
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="text-center py-12 border border-zinc-800/50 rounded-xl bg-zinc-900/60 backdrop-blur-sm">
            <Sparkles className="h-12 w-12 mx-auto mb-4 text-zinc-700" />
            <p className="text-zinc-500 mb-4">
              {searchQuery ? "No posts match your search" : "No posts yet. Be the first to post!"}
            </p>
            {!searchQuery && (
              <Button
                className="bg-gradient-to-r from-zinc-700 to-zinc-900 hover:from-zinc-600 hover:to-zinc-800 text-white border border-zinc-700/50 rounded-xl"
                onClick={() => setIsPostDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Post
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {filteredPosts.map((post, index) => (
              <div
                id={`post-${post.id}`}
                key={post.id}
                className="bg-zinc-900/60 backdrop-blur-sm rounded-xl overflow-hidden border border-zinc-800/50 hover:border-zinc-700/50 transition-colors shadow-lg"
              >
                <div className="p-4 pb-0">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <Avatar className="border-none bg-zinc-800/80">
                        <AvatarFallback className="bg-zinc-800/80 text-zinc-300">A</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium text-zinc-300">Anonymous</p>
                        <p className="text-xs text-zinc-500 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(post.created_at)}
                        </p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-800/50 rounded-full"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">More options</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="bg-zinc-900/95 backdrop-blur-xl border-zinc-800/50 text-zinc-300 rounded-xl shadow-xl"
                      >
                        <DropdownMenuItem
                          onClick={() => sharePost(post.id)}
                          className="hover:bg-zinc-800/50 cursor-pointer rounded-lg focus:bg-zinc-800/50"
                        >
                          <Share2 className="h-4 w-4 mr-2" />
                          Copy link
                        </DropdownMenuItem>
                        <DropdownMenuItem className="hover:bg-zinc-800/50 cursor-pointer rounded-lg focus:bg-zinc-800/50">
                          <Bookmark className="h-4 w-4 mr-2" />
                          Save post
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                <div className="p-4">
                  <p className="whitespace-pre-wrap text-zinc-200">{post.content}</p>
                  {renderMedia(post.media_url, post.media_type)}
                </div>

                <div className="p-4 pt-0 flex flex-col">
                  <div className="flex items-center gap-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "flex items-center gap-1 text-zinc-500 hover:text-zinc-300 hover:bg-transparent rounded-full px-3 transition-colors",
                        likedPosts[post.id] && "text-zinc-300",
                      )}
                      onClick={() => handleLikePost(post.id, post.likes)}
                      disabled={likedPosts[post.id]}
                    >
                      <Heart
                        className={cn(
                          "h-4 w-4 transition-all",
                          likedPosts[post.id] && "fill-zinc-300 text-zinc-300 scale-110",
                        )}
                      />
                      <span>{post.likes > 0 ? post.likes : ""}</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex items-center gap-1 text-zinc-500 hover:text-zinc-300 hover:bg-transparent rounded-full px-3 transition-colors"
                      onClick={() => toggleComments(post.id)}
                    >
                      <MessageSquare className="h-4 w-4" />
                      <span>{commentCounts[post.id] || 0}</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex items-center gap-1 text-zinc-500 hover:text-zinc-300 hover:bg-transparent rounded-full px-3 transition-colors"
                      onClick={() => sharePost(post.id)}
                    >
                      <Share2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex items-center gap-1 text-zinc-500 hover:text-zinc-300 hover:bg-transparent rounded-full px-3 ml-auto transition-colors"
                    >
                      <Eye className="h-4 w-4" />
                      <span>View</span>
                    </Button>
                  </div>

                  {openComments[post.id] && (
                    <div className="w-full mt-4 overflow-hidden">
                      <Separator className="mb-4 bg-zinc-800/50" />
                      {renderComments(post.id)}
                      <div className="mt-4">
                        {replyingTo[post.id] && (
                          <div className="mb-2 flex items-center justify-between bg-zinc-800/30 backdrop-blur-sm rounded-xl p-2 text-xs border border-zinc-800/30">
                            <span className="text-zinc-400">Replying to comment</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 text-zinc-500 hover:text-zinc-300 hover:bg-transparent rounded-full"
                              onClick={() => cancelReply(post.id)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6 border-none bg-zinc-800/80">
                            <AvatarFallback className="text-xs bg-zinc-800/80 text-zinc-300">A</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 flex items-center gap-2">
                            <Input
                              id={`comment-input-${post.id}`}
                              placeholder={replyingTo[post.id] ? "Write a reply..." : "Write a comment..."}
                              value={commentContent[post.id] || ""}
                              onChange={(e) =>
                                setCommentContent({
                                  ...commentContent,
                                  [post.id]: e.target.value,
                                })
                              }
                              className="flex-1 bg-zinc-800/30 border-zinc-700/30 text-white placeholder:text-zinc-500 rounded-xl"
                            />
                            <Button
                              size="icon"
                              onClick={() => handleSubmitComment(post.id)}
                              disabled={!commentContent[post.id]?.trim()}
                              className="bg-gradient-to-r from-zinc-700 to-zinc-900 hover:from-zinc-600 hover:to-zinc-800 text-white border border-zinc-700/50 rounded-full"
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Load more indicator */}
            {hasMore && (
              <div ref={loadMoreRef} className="py-4 text-center">
                {loadingMore ? (
                  <div className="flex justify-center items-center gap-2">
                    <div className="animate-spin h-5 w-5 border-2 border-zinc-500 border-t-transparent rounded-full"></div>
                    <span className="text-sm text-zinc-500">Loading more posts...</span>
                  </div>
                ) : (
                  <span className="text-sm text-zinc-700">Scroll for more posts</span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Scroll to top button */}
      {showScrollTop && (
        <button
          className="fixed bottom-6 right-6 bg-zinc-800/80 backdrop-blur-sm text-white p-3 rounded-full shadow-lg border border-zinc-700/50 hover:bg-zinc-700/80 transition-colors"
          onClick={scrollToTop}
        >
          <ArrowUp className="h-5 w-5" />
        </button>
      )}
    </div>
  )
}
