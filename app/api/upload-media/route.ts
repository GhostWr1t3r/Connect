import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    // Get the form data from the request
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ success: false, message: "No file provided" }, { status: 400 })
    }

    // Create a unique file path
    const fileExt = file.name.split(".").pop()
    const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`
    const filePath = fileName

    // Initialize Supabase client with service role key
    const supabaseUrl = process.env.SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Ensure the bucket exists
    const { data: buckets } = await supabase.storage.listBuckets()
    const mediaBucketExists = buckets?.some((bucket) => bucket.name === "media")

    if (!mediaBucketExists) {
      // Create media bucket
      const { error } = await supabase.storage.createBucket("media", {
        public: true,
      })

      if (error) {
        console.error("Error creating bucket:", error)
        return NextResponse.json(
          { success: false, message: "Failed to create media bucket", error: error.message },
          { status: 500 },
        )
      }
    }

    // Convert File to ArrayBuffer for upload
    const arrayBuffer = await file.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    // Upload the file using service role key
    const { error: uploadError, data } = await supabase.storage.from("media").upload(filePath, buffer, {
      contentType: file.type,
      cacheControl: "3600",
      upsert: false,
    })

    if (uploadError) {
      console.error("Error uploading file:", uploadError)
      return NextResponse.json(
        { success: false, message: "Failed to upload file", error: uploadError.message },
        { status: 500 },
      )
    }

    // Get the public URL
    const { data: urlData } = supabase.storage.from("media").getPublicUrl(filePath)

    // Determine media type
    let type: "image" | "video" | "audio"
    if (file.type.startsWith("image/")) {
      type = "image"
    } else if (file.type.startsWith("video/")) {
      type = "video"
    } else if (file.type.startsWith("audio/")) {
      type = "audio"
    } else {
      return NextResponse.json({ success: false, message: "Unsupported file type" }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
      type,
    })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json(
      { success: false, message: "Failed to upload file", error: String(error) },
      { status: 500 },
    )
  }
}

