export function cleanSpeech(text) {
  return String(text || "")
    .replace(/[\u{1F300}-\u{1FAFF}]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
}

export function speakText(text, onStart, onEnd) {
  if (typeof window === "undefined") return

  const cleaned = cleanSpeech(text)
  if (!cleaned) return

  window.speechSynthesis.cancel()

  const utterance = new SpeechSynthesisUtterance(cleaned)
  utterance.lang = "en-US"
  utterance.rate = 1
  utterance.pitch = 1
  utterance.onstart = () => onStart && onStart()
  utterance.onend = () => onEnd && onEnd()
  utterance.onerror = () => onEnd && onEnd()

  window.speechSynthesis.speak(utterance)
}

export function stopSpeech() {
  if (typeof window === "undefined") return
  window.speechSynthesis.cancel()
}