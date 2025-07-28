import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabaseUrl = process.env.SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    // Use service role key for admin privileges
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Check if bucket exists
    const { data: buckets } = await supabase.storage.listBuckets()
    const mediaBucketExists = buckets?.some((bucket) => bucket.name === "media")

    if (!mediaBucketExists) {
      // Create media bucket with public access
      const { error } = await supabase.storage.createBucket("media", {
        public: true, // This makes the bucket publicly accessible
        fileSizeLimit: 10485760, // 10MB
      })

      if (error) {
        console.error("Error creating bucket:", error)
        return NextResponse.json(
          { success: false, message: "Failed to create media bucket", error: error.message },
          { status: 500 },
        )
      }

      // Update bucket to allow public access
      // Note: The newer Supabase JS client doesn't have createPolicy method
      // Instead, we set the bucket to public when creating it

      return NextResponse.json({ success: true, message: "Media bucket created successfully" })
    }

    return NextResponse.json({ success: true, message: "Media bucket already exists" })
  } catch (error) {
    console.error("Error creating bucket:", error)
    return NextResponse.json(
      { success: false, message: "Failed to create media bucket", error: String(error) },
      { status: 500 },
    )
  }
}

