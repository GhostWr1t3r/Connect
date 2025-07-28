import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Initialize Supabase client with service role key
    const supabaseUrl = process.env.SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // List all files in the media bucket
    const { data, error } = await supabase.storage.from("media").list()

    if (error) {
      console.error("Error listing files:", error)
      return NextResponse.json(
        { success: false, message: "Failed to list files", error: error.message },
        { status: 500 },
      )
    }

    // Get public URLs for all files
    const filesWithUrls = data.map((file) => {
      const { data: urlData } = supabase.storage.from("media").getPublicUrl(file.name)

      return {
        ...file,
        url: urlData.publicUrl,
      }
    })

    return NextResponse.json({
      success: true,
      files: filesWithUrls,
    })
  } catch (error) {
    console.error("List error:", error)
    return NextResponse.json({ success: false, message: "Failed to list files", error: String(error) }, { status: 500 })
  }
}

