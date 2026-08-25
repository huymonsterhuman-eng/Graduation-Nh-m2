import { useCallback, useRef, useState } from 'react'
import { toast } from 'sonner'

/**
 * Copy text vào clipboard với toast tiếng Việt + state `copied` tự reset sau 1.5s.
 *
 * Cách dùng:
 *   const { copy, copied } = useCopyToClipboard()
 *   <Button onClick={() => copy(order.code, 'Đã sao chép mã đơn')}>
 *     {copied ? <Check /> : <Copy />}
 *   </Button>
 */
export function useCopyToClipboard(resetMs = 1500) {
  const [copied, setCopied] = useState(false)
  const timerRef = useRef<number | null>(null)

  const copy = useCallback(async (text: string, successMessage = 'Đã sao chép') => {
    if (!text) return
    try {
      // Ưu tiên Clipboard API. Fallback textarea + execCommand cho môi trường
      // không HTTPS / iframe không cấp quyền clipboard-write.
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        const ta = document.createElement('textarea')
        ta.value = text
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
      setCopied(true)
      toast.success(successMessage)
      if (timerRef.current) window.clearTimeout(timerRef.current)
      timerRef.current = window.setTimeout(() => setCopied(false), resetMs)
    } catch (e) {
      toast.error('Không sao chép được vào clipboard')
      console.error(e)
    }
  }, [resetMs])

  return { copy, copied }
}
