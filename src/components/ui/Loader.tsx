import { useProgress } from '@react-three/drei'
import { useEffect, useState } from 'react'

interface LoaderProps {
  onReady?: () => void
}

export function Loader({ onReady }: LoaderProps) {
  const { active, progress, errors } = useProgress()
  const [dismissed, setDismissed] = useState(false)

  const isComplete = !active && progress >= 100 && errors.length === 0

  useEffect(() => {
    if (isComplete && !dismissed) {
      const timer = setTimeout(() => {
        setDismissed(true)
        onReady?.()
      }, 600)
      return () => clearTimeout(timer)
    }
  }, [isComplete, dismissed, onReady])

  if (dismissed) return null

  return (
    <div
      aria-live="polite"
      aria-label="Loading 3D model asset"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: '#141414',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: isComplete ? 0 : 1,
        transition: 'opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
        pointerEvents: isComplete ? 'none' : 'auto',
      }}
    >
      <div style={{ textAlign: 'center', width: 'clamp(220px, 45vw, 300px)' }}>
        {/* Wordmark */}
        <p
          style={{
            fontFamily: 'Outfit, sans-serif',
            fontSize: 11,
            letterSpacing: '0.24em',
            textTransform: 'uppercase',
            color: '#C5AE88',
            marginBottom: 24,
            opacity: 0.9,
          }}
        >
          VELAR / EXTERIOR STUDY
        </p>

        {/* Progress track */}
        <div
          style={{
            width: '100%',
            height: 1.5,
            backgroundColor: '#262422',
            borderRadius: 1,
            overflow: 'hidden',
            marginBottom: 12,
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${Math.round(progress)}%`,
              backgroundColor: '#C5AE88',
              transition: 'width 0.25s ease-out',
              borderRadius: 1,
            }}
          />
        </div>

        <span
          style={{
            display: 'block',
            fontFamily: 'monospace',
            fontSize: 11,
            letterSpacing: '0.12em',
            color: '#736E65',
          }}
        >
          {isComplete ? 'READY' : `${Math.round(progress)}%`}
        </span>

        {errors.length > 0 && (
          <p
            style={{
              marginTop: 16,
              fontSize: 13,
              color: '#D96868',
              lineHeight: 1.5,
            }}
          >
            Failed to load 3D model asset. Verify file at{' '}
            <code style={{ color: '#F4F0E8', fontSize: 12 }}>
              public/models/velar.glb
            </code>.
          </p>
        )}
      </div>
    </div>
  )
}
