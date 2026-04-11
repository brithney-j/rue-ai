"use client"

import { useEffect, useRef, useState } from "react"

const STORAGE_KEY = "rue-active-session"

export default function Home() {
  const [image, setImage] = useState(null)
  const [reply, setReply] = useState("")
  const [loading, setLoading] = useState(false)

  const [monitorMode, setMonitorMode] = useState(false)
  const [cookTime, setCookTime] = useState(0)

  const [steps, setSteps] = useState([])
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [sessionStatus, setSessionStatus] = useState("idle")
  const [voiceState, setVoiceState] = useState("idle")

  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const fileInputRef = useRef(null)

  const monitorIntervalRef = useRef(null)
  const timerIntervalRef = useRef(null)
  const currentUtteranceRef = useRef(null)
  const monitorBusyRef = useRef(false)

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)

    if (!saved) return

    try {
      const parsed = JSON.parse(saved)

      setImage(parsed.image || null)
      setReply(parsed.reply || "")
      setSteps(parsed.steps || [])
      setCurrentStepIndex(parsed.currentStepIndex || 0)
      setSessionStatus(parsed.sessionStatus || "idle")
      setCookTime(parsed.cookTime || 0)
      setMonitorMode(parsed.monitorMode || false)
    } catch {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [])

  useEffect(() => {
    const payload = {
      image,
      reply,
      steps,
      currentStepIndex,
      sessionStatus,
      cookTime,
      monitorMode
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  }, [image, reply, steps, currentStepIndex, sessionStatus, cookTime, monitorMode])

  useEffect(() => {
    if (!monitorMode) return

    if (!timerIntervalRef.current) {
      timerIntervalRef.current = setInterval(() => {
        setCookTime((prev) => prev + 1)
      }, 1000)
    }

    return () => {}
  }, [monitorMode])

  useEffect(() => {
    return () => {
      stopSpeaking()
      stopMonitoring()
      stopCamera()
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
        timerIntervalRef.current = null
      }
    }
  }, [])

  function unlockSpeech() {
    const msg = new SpeechSynthesisUtterance("")
    msg.volume = 0
    window.speechSynthesis.speak(msg)
  }

  function stopSpeaking() {
    window.speechSynthesis.cancel()
    currentUtteranceRef.current = null
    setVoiceState("idle")
  }

  function speak(text) {
    if (!text) return

    stopSpeaking()

    const speech = new SpeechSynthesisUtterance(text)
    currentUtteranceRef.current = speech

    speech.rate = 1
    speech.pitch = 1
    speech.lang = "en-US"

    speech.onstart = () => {
      setVoiceState("speaking")
    }

    speech.onend = () => {
      setVoiceState("idle")
    }

    speech.onerror = () => {
      setVoiceState("idle")
    }

    window.speechSynthesis.speak(speech)
  }

  function openFilePicker() {
    fileInputRef.current.click()
  }

  function handleUpload(file) {
    const reader = new FileReader()

    reader.onloadend = () => {
      setImage(reader.result)
      setReply("")
      setSteps([])
      setCurrentStepIndex(0)
      setSessionStatus("idle")
      setCookTime(0)
      setMonitorMode(false)
      stopSpeaking()
      stopMonitoring()
      stopCamera()
    }

    reader.readAsDataURL(file)
  }

  function handleDrop(e) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]

    if (file) {
      handleUpload(file)
    }
  }

  async function askAI() {
    if (!image) return

    unlockSpeech()
    setLoading(true)
    stopSpeaking()

    const res = await fetch("/api/cook", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        image
      })
    })

    const data = await res.json()

    setReply(data.reply || "")
    setSteps(Array.isArray(data.steps) ? data.steps : [])
    setCurrentStepIndex(0)
    setSessionStatus("active")
    setLoading(false)

    await startMonitorMode()

    if (data.steps && data.steps.length > 0) {
      setTimeout(() => {
        speak(`Are you ready to start cooking? Step 1. ${data.steps[0]}`)
      }, 300)
    } else {
      setTimeout(() => {
        speak(data.reply)
      }, 300)
    }
  }

  async function startMonitorMode() {
    if (monitorMode) return

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
      })

      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }

      setMonitorMode(true)
      startMonitoring()
    } catch (error) {
      console.error("Camera access failed:", error)
    }
  }

  function stopCamera() {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks()
      tracks.forEach((track) => track.stop())
      videoRef.current.srcObject = null
    }
  }

  function captureFrame() {
    const canvas = canvasRef.current
    const video = videoRef.current

    if (!video || !canvas || !video.videoWidth || !video.videoHeight) return null

    const ctx = canvas.getContext("2d")

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    ctx.drawImage(video, 0, 0)

    return canvas.toDataURL("image/png")
  }

  function startMonitoring() {
    if (monitorIntervalRef.current) return

    monitorIntervalRef.current = setInterval(async () => {
      if (monitorBusyRef.current) return
      if (sessionStatus !== "active") return

      const frame = captureFrame()
      if (!frame) return

      monitorBusyRef.current = true

      try {
        const res = await fetch("/api/cook", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            mode: "monitor",
            image: frame
          })
        })

        const data = await res.json()

        if (data.reply && voiceState !== "speaking") {
          speak(data.reply)
        }
      } catch (error) {
        console.error("Monitor request failed:", error)
      } finally {
        monitorBusyRef.current = false
      }
    }, 8000)
  }

  function stopMonitoring() {
    if (monitorIntervalRef.current) {
      clearInterval(monitorIntervalRef.current)
      monitorIntervalRef.current = null
    }
  }

  function getCurrentStep() {
    if (!steps.length) return ""
    return steps[currentStepIndex] || ""
  }

  function handleNextStep() {
    if (!steps.length) return

    stopSpeaking()

    const nextIndex = currentStepIndex + 1

    if (nextIndex >= steps.length) {
      setSessionStatus("completed")
      speak("Nice work. You finished all the cooking steps.")
      return
    }

    setCurrentStepIndex(nextIndex)

    setTimeout(() => {
      speak(`Step ${nextIndex + 1}. ${steps[nextIndex]}`)
    }, 150)
  }

  function handleRepeatStep() {
    const step = getCurrentStep()
    if (!step) return

    stopSpeaking()
    speak(`Step ${currentStepIndex + 1}. ${step}`)
  }

  function handlePause() {
    stopSpeaking()
    setSessionStatus("paused")
  }

  function handleResume() {
    const step = getCurrentStep()
    if (!step) return

    setSessionStatus("active")
    speak(`Resuming. Step ${currentStepIndex + 1}. ${step}`)
  }

  function handleEndSession() {
    stopSpeaking()
    setSessionStatus("ended")
    stopMonitoring()
    stopCamera()

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current)
      timerIntervalRef.current = null
    }
  }

  function handleInterruptVoice() {
    stopSpeaking()
  }

  function resetSession() {
    stopSpeaking()
    stopMonitoring()
    stopCamera()

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current)
      timerIntervalRef.current = null
    }

    setImage(null)
    setReply("")
    setLoading(false)
    setMonitorMode(false)
    setCookTime(0)
    setSteps([])
    setCurrentStepIndex(0)
    setSessionStatus("idle")
    setVoiceState("idle")

    localStorage.removeItem(STORAGE_KEY)
  }

  const currentStep = getCurrentStep()

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f5f5f5",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "system-ui",
        padding: 20
      }}
    >
      <div
        style={{
          background: "white",
          padding: 40,
          borderRadius: 16,
          width: 460,
          boxShadow: "0 15px 40px rgba(0,0,0,0.08)"
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 25 }}>
          <div style={{ fontSize: 34, fontWeight: 700 }}>
            🔊 RUE
          </div>

          <div style={{ fontSize: 14, color: "#666" }}>
            AI Sous Chef • Beta
          </div>
        </div>

        {!image && (
          <>
            <div
              onClick={openFilePicker}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              style={{
                border: "2px dashed #ddd",
                padding: 30,
                borderRadius: 12,
                textAlign: "center",
                cursor: "pointer",
                marginBottom: 20
              }}
            >
              📸 Upload or Drag Food Photo

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => {
                  const file = e.target.files[0]
                  if (file) {
                    handleUpload(file)
                  }
                }}
              />
            </div>
          </>
        )}

        {image && (
          <img
            src={image}
            alt="food"
            style={{
              width: "100%",
              borderRadius: 12,
              marginBottom: 20
            }}
          />
        )}

        {image && !reply && (
          <button
            onClick={askAI}
            disabled={loading}
            style={{
              width: "100%",
              padding: 16,
              background: "#FF6B3D",
              color: "white",
              border: "none",
              borderRadius: 12,
              fontSize: 16,
              fontWeight: 600,
              marginBottom: 16
            }}
          >
            {loading ? "RUE is analyzing..." : "Ask RUE"}
          </button>
        )}

        {reply && (
          <div
            style={{
              marginTop: 20,
              padding: 18,
              background: "#FFF7F2",
              borderRadius: 12,
              fontSize: 16,
              fontWeight: 500,
              whiteSpace: "pre-line"
            }}
          >
            👨‍🍳 RUE says:

            <div style={{ marginTop: 8 }}>
              {reply}
            </div>
          </div>
        )}

        {steps.length > 0 && (
          <div
            style={{
              marginTop: 20,
              padding: 18,
              background: "#FFF3E8",
              borderRadius: 12,
              border: "1px solid #FFD8C9"
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 8 }}>
              Current cooking step
            </div>

            <div style={{ fontSize: 14, color: "#666", marginBottom: 10 }}>
              Step {Math.min(currentStepIndex + 1, steps.length)} of {steps.length}
            </div>

            <div style={{ fontSize: 18, fontWeight: 600, lineHeight: 1.4 }}>
              {sessionStatus === "completed"
                ? "All cooking steps completed."
                : sessionStatus === "ended"
                ? "Session ended."
                : currentStep}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
                marginTop: 16
              }}
            >
              <button
                onClick={handleNextStep}
                disabled={sessionStatus === "completed" || sessionStatus === "ended"}
                style={buttonStyle("#FF6B3D", "white")}
              >
                Next
              </button>

              <button
                onClick={handleRepeatStep}
                disabled={sessionStatus === "ended"}
                style={buttonStyle("#fff", "#333", true)}
              >
                Repeat
              </button>

              <button
                onClick={sessionStatus === "paused" ? handleResume : handlePause}
                disabled={sessionStatus === "completed" || sessionStatus === "ended"}
                style={buttonStyle("#fff", "#333", true)}
              >
                {sessionStatus === "paused" ? "Resume" : "Pause"}
              </button>

              <button
                onClick={handleInterruptVoice}
                disabled={voiceState !== "speaking"}
                style={buttonStyle("#fff", "#333", true)}
              >
                Interrupt voice
              </button>
            </div>

            <button
              onClick={handleEndSession}
              disabled={sessionStatus === "ended"}
              style={{
                ...buttonStyle("#fff", "#B42318", true),
                width: "100%",
                marginTop: 10,
                borderColor: "#F5C2C7"
              }}
            >
              End session
            </button>
          </div>
        )}

        {monitorMode && (
          <div style={{ textAlign: "center", marginTop: 20 }}>
            <div
              style={{
                fontWeight: 700,
                fontSize: 18,
                marginBottom: 8
              }}
            >
              🔊 RUE Cooking Mode
            </div>

            <video
              ref={videoRef}
              autoPlay
              playsInline
              style={{
                width: "100%",
                borderRadius: 12
              }}
            />

            <div
              style={{
                marginTop: 12,
                fontSize: 14,
                color: "#22A06B",
                fontWeight: 600
              }}
            >
              Monitoring Active
            </div>

            <div
              style={{
                marginTop: 6,
                fontSize: 13,
                color: "#666"
              }}
            >
              Cook time: {Math.floor(cookTime / 60)}:{String(cookTime % 60).padStart(2, "0")}
            </div>

            <div
              style={{
                marginTop: 6,
                fontSize: 13,
                color: "#666"
              }}
            >
              Voice: {voiceState} • Session: {sessionStatus}
            </div>
          </div>
        )}

        {(image || reply || steps.length > 0) && (
          <button
            onClick={resetSession}
            style={{
              ...buttonStyle("#fff", "#333", true),
              width: "100%",
              marginTop: 20
            }}
          >
            Start over
          </button>
        )}
      </div>

      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  )
}

function buttonStyle(background, color, outlined = false) {
  return {
    width: "100%",
    padding: 14,
    background,
    color,
    border: outlined ? "1px solid #ddd" : "none",
    borderRadius: 12,
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer"
  }
}