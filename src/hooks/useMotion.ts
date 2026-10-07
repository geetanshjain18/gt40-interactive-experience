/**
 * useMotion - single source of truth for scroll-driven animation.
 *
 * ARCHITECTURE:
 *   native scroll  ->  motion.target  (0-1, set synchronously in scroll handler)
 *   render loop    ->  motion.progress (frame-rate-independent exponential damping)
 *   lambda = 8     ->  settles in ~375 ms, no overshoot, no drift
 *
 * No smooth-scroll library. No GSAP scroll. One scroll listener, one rAF loop.
 * Camera, lights and DOM text all read motion.progress or motion.time from refs.
 */
import { useEffect, useRef } from 'react'
import { CHOREOGRAPHY as C, smooth } from '../config/choreography'
import type { Motion } from '../config/choreography'
import type { Phase } from './useExperience'

const DEV = import.meta.env.DEV

export function useMotion(
  phase:    Phase,
  motion:   { current: Motion },
  wake:     React.RefObject<() => void>,
  overlay:  React.RefObject<HTMLDivElement | null>,
  complete: () => void,
  chapter:  (i: number) => void,
) {
  const completeRef = useRef(complete)
  const chapterRef  = useRef(chapter)
  useEffect(() => { completeRef.current = complete; chapterRef.current = chapter }, [complete, chapter])

  // --- Dev performance overlay ---------------------------------------------
  const devOverlay = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (!DEV || !new URLSearchParams(location.search).has('qa')) return
    const el = document.createElement('div')
    el.id = 'perf-overlay'
    el.style.cssText = [
      'position:fixed;bottom:12px;right:12px;z-index:9999',
      'font:10px/1.6 monospace;color:#0f0;background:rgba(0,0,0,.72)',
      'padding:6px 9px;border-radius:3px;pointer-events:none',
      'white-space:pre;opacity:0.85',
    ].join(';')
    document.body.appendChild(el)
    devOverlay.current = el
    return () => { el.remove(); devOverlay.current = null }
  }, [])

  useEffect(() => {
    let raf = 0
    let last = performance.now()
    let index = -1
    const stage = overlay.current?.parentElement
    // FPS rolling average
    const fpsWindow: number[] = []

    const tick = (now: number) => {
      raf = 0
      const dt = document.hidden
        ? 0
        : Math.max(0, Math.min((now - last) / 1000, 0.1)) // cap at 100 ms
      last = now

      // --- Igniting phase: run the ignition timeline -------------------------
      if (phase === 'ready' && !motion.current.active) {
        motion.current.readyTime = Math.min(C.headlight.preGlowDuration, motion.current.readyTime + dt)
      }

      if (phase === 'igniting') {
        motion.current.time = Math.min(C.duration, motion.current.time + dt)
        overlay.current?.style.setProperty('--time', String(motion.current.time))
        if (motion.current.time >= C.duration) {
          completeRef.current()
          wake.current()
          return
        }
      }

      // --- Exploring phase: damp progress toward scroll target --------------
      if (phase === 'exploring') {
        const m = motion.current
        // Frame-rate-independent exponential damping
        const damp = 1 - Math.exp(-C.damping * dt)
        m.progress += (m.target - m.progress) * damp

        // Snap when very close to avoid perpetual micro-updates
        if (Math.abs(m.target - m.progress) < 0.00005) m.progress = m.target

        // Chapter detection: find nearest chapter rest point
        let nearest = 0
        for (let i = 1; i < C.chapters.length; i++) {
          if (Math.abs(C.chapters[i].rest - m.progress) <
              Math.abs(C.chapters[nearest].rest - m.progress)) nearest = i
        }
        if (nearest !== index) { index = nearest; chapterRef.current(nearest) }

        const distance = Math.abs(C.chapters[nearest].rest - m.progress)
        overlay.current?.style.setProperty(
          '--chapter-opacity',
          String(smooth(m.progress / 0.03) * smooth((m.progress - 0.12) / 0.08) * (1 - smooth(distance / 0.075))),
        )
        overlay.current?.style.setProperty(
          '--challenger-opacity',
          String(Math.min(1, m.progress / 0.025)),
        )
        overlay.current?.style.setProperty(
          '--landing-opacity',
          String(1 - smooth(m.progress / .12)),
        )
        stage?.style.setProperty('--studio-shift', `${(m.progress - 0.5) * 44}px`)
        stage?.style.setProperty('--studio-interior', String(smooth(1 - Math.abs(m.progress - 0.46) / 0.12) * 0.72))
        stage?.style.setProperty('--studio-engine', String(smooth(1 - Math.abs(m.progress - 0.69) / 0.12) * 0.8))
      }

      // --- Dev overlay ------------------------------------------------------
      if (DEV && devOverlay.current) {
        const fps = dt > 0 ? 1 / dt : 0
        fpsWindow.push(fps)
        if (fpsWindow.length > 30) fpsWindow.shift()
        const avgFps = fpsWindow.reduce((a, b) => a + b, 0) / fpsWindow.length
        const m = motion.current
        devOverlay.current.textContent = [
          `fps  ${avgFps.toFixed(0).padStart(3)} | frame ${(dt * 1000).toFixed(1).padStart(5)} ms`,
          `prog ${m.progress.toFixed(4)} | tgt  ${m.target.toFixed(4)}`,
          `time ${m.time.toFixed(2)} s | phase ${phase}`,
        ].join('\n')
      }

      wake.current()

      const needsMore =
        (phase === 'ready' && motion.current.readyTime < C.headlight.preGlowDuration) ||
        phase === 'igniting' ||
        (phase === 'exploring' && Math.abs(motion.current.target - motion.current.progress) > 0.000025)
      if (!document.hidden && needsMore) raf = requestAnimationFrame(tick)
    }

    // Scroll handler: update target synchronously, then kick the rAF
    const scroll = () => {
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight)
      // Finish the landing section before starting the model orbit.
      motion.current.target = Math.max(0, Math.min(1,
        window.scrollY / Math.max(1, maxScroll),
      ))
      if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick) }
    }

    const visible = () => {
      last = performance.now()
      if (!document.hidden) { cancelAnimationFrame(raf); raf = requestAnimationFrame(tick) }
    }

    if (phase === 'ready' || phase === 'igniting' || phase === 'exploring') raf = requestAnimationFrame(tick)
    if (phase === 'exploring') {
      addEventListener('scroll', scroll, { passive: true })
      addEventListener('resize', scroll)
      scroll() // seed the target from current scroll position
    }
    document.addEventListener('visibilitychange', visible)

    return () => {
      cancelAnimationFrame(raf)
      removeEventListener('scroll', scroll)
      removeEventListener('resize', scroll)
      document.removeEventListener('visibilitychange', visible)
    }
  }, [phase, motion, wake, overlay, devOverlay])
}
