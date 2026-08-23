import { cn } from '@/lib/utils'

interface Props {
  className?: string
  animate?: boolean
}

/**
 * Mascot LaptopWorld — chú robot laptop cute inline SVG.
 * Không dùng image file → luôn crisp mọi kích thước.
 */
export function MascotIcon({ className, animate = false }: Props) {
  return (
    <svg
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(className, animate && 'transition-transform hover:scale-110')}
      aria-hidden="true"
    >
      {/* Antenna */}
      <line x1="32" y1="4" x2="32" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="32" cy="4" r="2.5" fill="#fbbf24" />

      {/* Head — laptop shape */}
      <rect x="10" y="10" width="44" height="34" rx="6" fill="currentColor" />
      {/* Screen inner */}
      <rect x="14" y="14" width="36" height="26" rx="3" fill="#0f172a" />

      {/* Eyes */}
      <circle cx="24" cy="26" r="3.5" fill="#38bdf8" className={animate ? 'origin-center' : ''}>
        {animate && (
          <animate attributeName="r" values="3.5;1;3.5" keyTimes="0;0.05;0.1" dur="4s" repeatCount="indefinite" />
        )}
      </circle>
      <circle cx="40" cy="26" r="3.5" fill="#38bdf8">
        {animate && (
          <animate attributeName="r" values="3.5;1;3.5" keyTimes="0;0.05;0.1" dur="4s" repeatCount="indefinite" />
        )}
      </circle>
      {/* Sparkle in eye */}
      <circle cx="25" cy="25" r="1" fill="white" />
      <circle cx="41" cy="25" r="1" fill="white" />

      {/* Smile */}
      <path d="M22 33 Q32 39 42 33" stroke="#38bdf8" strokeWidth="2" fill="none" strokeLinecap="round" />

      {/* Base — keyboard */}
      <path d="M6 46 L58 46 L54 54 L10 54 Z" fill="currentColor" opacity="0.85" />
      <line x1="24" y1="50" x2="40" y2="50" stroke="#0f172a" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}
