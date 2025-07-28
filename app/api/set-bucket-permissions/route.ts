import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabaseUrl = process.env.SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    // Use service role key for admin privileges
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Execute SQL to set bucket permissions
    const { error } = await supabase.rpc("set_bucket_public", { bucket_name: "media" })

    if (error) {
      console.error("Error setting bucket permissions:", error)

      // Try alternative approach - update the bucket to be public
      const { error: updateError } = await supabase.storage.updateBucket("media", {
        public: true,
      })

      if (updateError) {
        console.error("Error updating bucket:", updateError)
        return NextResponse.json(
          { success: false, message: "Failed to set bucket permissions", error: updateError.message },
          { status: 500 },
        )
      }
    }

    return NextResponse.json({ success: true, message: "Bucket permissions set successfully" })
  } catch (error) {
    console.error("Error setting bucket permissions:", error)
    return NextResponse.json(
      { success: false, message: "Failed to set bucket permissions", error: String(error) },
      { status: 500 },
    )
  }
}

