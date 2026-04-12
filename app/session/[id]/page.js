"use client"

import { useEffect, useRef, useState } from "react"
import { getCurrentStep, nextStep } from "../../../lib/session-engine"
import { speakText, stopSpeech } from "../../../lib/speech"

export default function SessionPage({ params }) {
  const [plan, setPlan] = useState(null)
  const [session, setSession] = useState(null)
  const [voiceState, setVoiceState] = useState("idle")
  const [transcript, setTranscript] = useState("")
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const timerRef = useRef(null)
  const monitorRef = useRef(null)
  const recognitionRef = useRef(null)

  useEffect(() => {
    loadSession()
  }, [])

  useEffect(() => {
    if (!plan || !session) return
    const step = getCurrentStep(plan, session)
    if (!step || session.status !== "active") return

    speakText(
      `Step ${session.currentStepIndex + 1}. ${step.instruction}`,
      () => setVoiceState("speaking"),
      () => setVoiceState("idle")
    )
  }, [plan?.id, session?.currentStepIndex, session?.status])

  useEffect(() => {
    if (!session || session.status !== "active") return

    timerRef.current = setInterval(() => {
      setSession((prev) => ({ ...prev, cookTimeSec: prev.cookTimeSec + 1 }))
    }, 1000)

    return () => clearInterval(timerRef.current)
  }, [session?.status])

  useEffect(() => {
    if (!session || session.status !== "active") return

    startCamera()

    monitorRef.current = setInterval(async () => {
      const frame = captureFrame()
      if (!frame) return

      const res = await fetch(`/api/sessions/${params.id}/monitor`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ image: frame })
      })

      const result = await res.json()

      if (result.feedback) {
        setSession((prev) => ({ ...prev, feedback: result.feedback }))
      }

      if (result.shouldAdvance) {
        handleNext()
      }
    }, 8000)

    return () => clearInterval(monitorRef.current)
  }, [session?.status, plan?.id])

  async function loadSession() {
    const res = await fetch(`/api/sessions/${params.id}`)
    const data = await res.json()
    setPlan(data.plan)
    setSession(data.session)
  }

  async function sync(next) {
    setSession(next)

    await fetch(`/api/sessions/${params.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        currentStepIndex: next.currentStepIndex,
        status: next.status,
        cookTimeSec: next.cookTimeSec,
        feedback: next.feedback,
        lastMonitorAt: new Date().toISOString()
      })
    })
  }

  async function handleNext() {
    if (!plan || !session) return
    stopSpeech()

    const next = nextStep(session, plan)
    await sync(next)
  }

  async function handleRepeat() {
    if (!plan || !session) return
    stopSpeech()

    const step = getCurrentStep(plan, session)
    if (!step) return

    speakText(
      `Step ${session.currentStepIndex + 1}. ${step.instruction}`,
      () => setVoiceState("speaking"),
      () => setVoiceState("idle")
    )
  }

  async function handlePause() {
    stopSpeech()
    await sync({ ...session, status: "paused", feedback: "Session paused." })
  }

  async function handleResume() {
    await sync({ ...session, status: "active", feedback: "Session resumed." })
  }

  async function handleEnd() {
    stopSpeech()
    await sync({ ...session, status: "ended", feedback: "Session ended." })
  }

  function startListening() {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition

    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser.")
      return
    }

    stopSpeech()

    const recognition = new SpeechRecognition()
    recognitionRef.current = recognition
    recognition.lang = "en-US"
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    recognition.onstart = () => setVoiceState("listening")
    recognition.onend = () => setVoiceState("idle")
    recognition.onerror = () => setVoiceState("idle")
    recognition.onresult = (event) => {
      const text = event.results[0][0].transcript || ""
      const lower = text.toLowerCase()
      setTranscript(text)

      if (/next|continue|go on/.test(lower)) handleNext()
      else if (/repeat|again/.test(lower)) handleRepeat()
      else if (/pause|stop/.test(lower)) handlePause()
      else if (/resume|continue cooking/.test(lower)) handleResume()
      else if (/end|finish|quit/.test(lower)) handleEnd()
    }

    recognition.start()
  }

  function startCamera() {
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" } })
      .then((stream) => {
        if (videoRef.current) videoRef.current.srcObject = stream
      })
      .catch(() => {})
  }

  function captureFrame() {
    if (!videoRef.current || !canvasRef.current) return null

    const video = videoRef.current
    const canvas = canvasRef.current

    if (!video.videoWidth || !video.videoHeight) return null

    const ctx = canvas.getContext("2d")
    if (!ctx) return null

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    ctx.drawImage(video, 0, 0)

    return canvas.toDataURL("image/png")
  }

  if (!plan || !session) {
    return <div style={{ padding: 24 }}>Loading...</div>
  }

  const step = getCurrentStep(plan, session)

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#1b120d",
        color: "#fff",
        padding: 16,
        display: "flex",
        justifyContent: "center"
      }}
    >
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={heroCard}>
          <h1 style={{ margin: 0, fontSize: 34 }}>{plan.dishName}</h1>
          <div style={{ color: "#FFD7C8", marginTop: 6 }}>
            Step {Math.min(session.currentStepIndex + 1, plan.steps.length)} of {plan.steps.length}
          </div>
        </div>

        <div style={panel}>
          <div style={label}>Instruction</div>
          <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.2, marginTop: 10 }}>
            {session.status === "completed" ? "All steps completed." : step?.instruction}
          </div>
          <div style={{ marginTop: 12, color: "#F7C7B3" }}>
            Heat: {step?.heatLevel || "medium"} • {step?.durationSec || 0}s
          </div>
        </div>

        <div style={panel}>
          <div style={label}>Feedback</div>
          <div style={{ marginTop: 10, fontSize: 20 }}>
            {session.feedback || "Waiting for update."}
          </div>
        </div>

        <div style={panel}>
          <div style={label}>System status</div>
          <div style={{ marginTop: 10, color: "#F7C7B3", lineHeight: 1.8 }}>
            <div>Voice: {voiceState}</div>
            <div>Session: {session.status}</div>
            <div>
              Cook time: {Math.floor(session.cookTimeSec / 60)}:
              {String(session.cookTimeSec % 60).padStart(2, "0")}
            </div>
            <div>Transcript: {transcript || "—"}</div>
          </div>
        </div>

        <div style={panel}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            style={{ width: "100%", borderRadius: 18 }}
          />
          <div style={{ marginTop: 12, color: "#F7C7B3" }}>
            Camera monitoring active
          </div>
        </div>

        <div style={grid2}>
          <button onClick={handleNext} style={primaryBtn}>Next</button>
          <button onClick={handleRepeat} style={secondaryBtn}>Repeat</button>
          <button
            onClick={session.status === "paused" ? handleResume : handlePause}
            style={secondaryBtn}
          >
            {session.status === "paused" ? "Resume" : "Pause"}
          </button>
          <button onClick={() => stopSpeech()} style={secondaryBtn}>Interrupt</button>
        </div>

        <div style={grid2}>
          <button onClick={startListening} style={secondaryBtn}>Voice command</button>
          <button onClick={handleEnd} style={dangerBtn}>End Session</button>
        </div>
      </div>

      <canvas ref={canvasRef} style={{ display: "none" }} />
    </main>
  )
}

const heroCard = {
  background: "linear-gradient(180deg, #ff8d3a, #ff6b3d)",
  borderRadius: 26,
  padding: 22,
  boxShadow: "0 20px 50px rgba(0,0,0,0.35)"
}

const panel = {
  background: "#2a1b14",
  borderRadius: 26,
  padding: 20,
  marginTop: 14,
  border: "1px solid rgba(255,138,74,0.18)"
}

const label = {
  color: "#F39A6B",
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: "0.08em"
}

const grid2 = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 12,
  marginTop: 14
}

const primaryBtn = {
  border: "none",
  borderRadius: 18,
  padding: 16,
  background: "#FF6B3D",
  color: "#fff",
  fontWeight: 700,
  cursor: "pointer"
}

const secondaryBtn = {
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 18,
  padding: 16,
  background: "rgba(255,255,255,0.06)",
  color: "#fff",
  fontWeight: 700,
  cursor: "pointer"
}

const dangerBtn = {
  border: "none",
  borderRadius: 18,
  padding: 16,
  background: "#E74C3C",
  color: "#fff",
  fontWeight: 700,
  cursor: "pointer"
}