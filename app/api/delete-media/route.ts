import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const path = searchParams.get("path")

    if (!path) {
      return NextResponse.json({ success: false, message: "No file path provided" }, { status: 400 })
    }

    // Initialize Supabase client with service role key
    const supabaseUrl = process.env.SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Extract filename from URL
    const filename = path.split("/").pop()

    if (!filename) {
      return NextResponse.json({ success: false, message: "Invalid file path" }, { status: 400 })
    }

    // Delete the file
    const { error } = await supabase.storage.from("media").remove([filename])

    if (error) {
      console.error("Error deleting file:", error)
      return NextResponse.json(
        { success: false, message: "Failed to delete file", error: error.message },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      message: "File deleted successfully",
    })
  } catch (error) {
    console.error("Delete error:", error)
    return NextResponse.json(
      { success: false, message: "Failed to delete file", error: String(error) },
      { status: 500 },
    )
  }
}

