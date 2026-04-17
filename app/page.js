"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"

export default function HomePage() {
  const [image, setImage] = useState(null)
  const [fileName, setFileName] = useState("")
  const [loading, setLoading] = useState(false)
  const inputRef = useRef(null)
  const router = useRouter()

  function handleUpload(file) {
    const reader = new FileReader()
    setFileName(file.name)

    reader.onloadend = () => {
      setImage(reader.result)
    }

    reader.readAsDataURL(file)
  }

  async function analyze() {
    if (!image) return

    setLoading(true)

    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ image, fileName })
    })

    const data = await res.json()
    setLoading(false)

    if (data.plan?.id) {
      router.push(`/preview/${data.plan.id}`)
    } else {
      alert(data.error || "Failed to analyze image")
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f5f5f5",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: 24
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 460,
          background: "#fff",
          borderRadius: 20,
          padding: 32,
          boxShadow: "0 15px 40px rgba(0,0,0,0.08)"
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 36, fontWeight: 800 }}>RUE</div>
          <div style={{ color: "#666" }}>AI Sous Chef</div>
        </div>

        <div
          onClick={() => inputRef.current?.click()}
          style={{
            border: "2px dashed #ddd",
            borderRadius: 14,
            padding: 28,
            textAlign: "center",
            cursor: "pointer"
          }}
        >
          Upload or Drag Food Photo
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleUpload(file)
            }}
          />
        </div>

        {image && (
          <img
            src={image}
            alt="food"
            style={{
              width: "100%",
              borderRadius: 14,
              marginTop: 16
            }}
          />
        )}

        {fileName && (
          <div style={{ marginTop: 10, fontSize: 13, color: "#666" }}>
            {fileName}
          </div>
        )}

        <button
          onClick={analyze}
          disabled={!image || loading}
          style={{
            width: "100%",
            marginTop: 18,
            padding: 16,
            border: "none",
            borderRadius: 14,
            background: "#FF6B3D",
            color: "#fff",
            fontWeight: 700,
            fontSize: 16,
            cursor: "pointer"
          }}
        >
          {loading ? "Analyzing..." : "Ask RUE"}
        </button>
      </div>
    </main>
  )
}