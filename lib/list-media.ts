"use client"

export type MediaFile = {
  name: string
  id: string
  created_at: string
  updated_at: string
  last_accessed_at: string
  metadata: any
  url: string
}

export async function listMedia(): Promise<MediaFile[]> {
  try {
    const response = await fetch("/api/list-media")

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.message || "Failed to list files")
    }

    const data = await response.json()

    if (!data.success) {
      throw new Error(data.message || "Failed to list files")
    }

    return data.files
  } catch (error) {
    console.error("List error:", error)
    throw error
  }
}

