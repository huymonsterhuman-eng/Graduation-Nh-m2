import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Wrap Web Speech API (SpeechRecognition) — chỉ hoạt động trên Chrome/Edge.
 * Trả về text transcribed live. Firefox không hỗ trợ → isSupported=false.
 */

// Type declarations minimal cho SpeechRecognition (không có sẵn trong TS lib)
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
  resultIndex: number
}
interface SpeechRecognitionResultList {
  length: number
  [index: number]: SpeechRecognitionResult
}
interface SpeechRecognitionResult {
  isFinal: boolean
  [index: number]: SpeechRecognitionAlternative
}
interface SpeechRecognitionAlternative {
  transcript: string
}
interface SpeechRecognitionInstance extends EventTarget {
  lang: string
  continuous: boolean
  interimResults: boolean
  start(): void
  stop(): void
  onresult: ((e: SpeechRecognitionEvent) => void) | null
  onerror: ((e: Event) => void) | null
  onend: (() => void) | null
}
interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor
    webkitSpeechRecognition?: SpeechRecognitionConstructor
  }
}

export function useVoiceInput(lang = 'vi-VN') {
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)

  const isSupported = typeof window !== 'undefined' &&
    !!(window.SpeechRecognition || window.webkitSpeechRecognition)

  const start = useCallback(() => {
    if (!isSupported) {
      setError('Trình duyệt không hỗ trợ nhận diện giọng nói. Dùng Chrome hoặc Edge.')
      return
    }
    setError(null)
    setTranscript('')

    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!Ctor) return
    const rec = new Ctor()
    rec.lang = lang
    rec.continuous = false
    rec.interimResults = true

    rec.onresult = (e: SpeechRecognitionEvent) => {
      let text = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        text += e.results[i][0].transcript
      }
      setTranscript(text)
    }
    rec.onerror = () => {
      setError('Không nhận được giọng. Thử lại.')
      setListening(false)
    }
    rec.onend = () => setListening(false)

    rec.start()
    recognitionRef.current = rec
    setListening(true)
  }, [isSupported, lang])

  const stop = useCallback(() => {
    recognitionRef.current?.stop()
    setListening(false)
  }, [])

  useEffect(() => {
    return () => { recognitionRef.current?.stop() }
  }, [])

  return { listening, transcript, error, isSupported, start, stop }
}
