"use client"

export async function uploadMedia(file: File): Promise<{ url: string; type: "image" | "video" | "audio" }> {
  try {
    // Create form data for the file
    const formData = new FormData()
    formData.append("file", file)

    // Upload via server-side API route
    const response = await fetch("/api/upload-media", {
      method: "POST",
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.message || "Failed to upload file")
    }

    const data = await response.json()

    if (!data.success) {
      throw new Error(data.message || "Failed to upload file")
    }

    return {
      url: data.url,
      type: data.type,
    }
  } catch (error) {
    console.error("Upload error:", error)
    throw error
  }
}

