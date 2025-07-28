"use client"

export async function deleteMedia(url: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/delete-media?path=${encodeURIComponent(url)}`, {
      method: "DELETE",
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.message || "Failed to delete file")
    }

    const data = await response.json()

    if (!data.success) {
      throw new Error(data.message || "Failed to delete file")
    }

    return true
  } catch (error) {
    console.error("Delete error:", error)
    throw error
  }
}

