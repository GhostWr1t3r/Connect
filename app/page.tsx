"use client"

import { Suspense } from "react"
import Connect from "../connect.tsx"
import { Loader2 } from 'lucide-react'

export default function Home() {
  return ( 
    <Suspense fallback={
      <div className="w-full h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading...</span>
      </div>
    }>
      <Connect />
    </Suspense>
  )
}
