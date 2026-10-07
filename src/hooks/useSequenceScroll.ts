import { useEffect, useRef, useState, useCallback } from 'react'
import { SEQUENCE_CONFIG } from '../config/sequenceConfig'

export function useSequenceScroll(containerRef: React.RefObject<HTMLDivElement | null>) {
  const [activeChapterIndex, setActiveChapterIndex] = useState(0)
  const [scrollProgress, setScrollProgress] = useState(0)

  // Target progress mutable ref for requestAnimationFrame consumption (0.0 to 1.0)
  const targetProgressRef = useRef(0)
  const lastProgressStateRef = useRef(0)
  // Mutable ref so the scroll handler never captures a stale chapter index
  const activeChapterIndexRef = useRef(0)

  const chapters = SEQUENCE_CONFIG.chapters

  // Keep the ref in sync with state
  useEffect(() => {
    activeChapterIndexRef.current = activeChapterIndex
  }, [activeChapterIndex])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleScroll = () => {
      const rect = container.getBoundingClientRect()
      const scrollableDist = container.scrollHeight - window.innerHeight
      if (scrollableDist <= 0) return

      // Compute progress: when container top is at 0, progress is 0.
      // When container bottom is at window bottom, progress is 1.
      const currentScrollY = -rect.top
      const p = Math.max(0, Math.min(1, currentScrollY / scrollableDist))

      targetProgressRef.current = p

      // Active chapter calculation with hysteresis — read from ref, never stale
      // Chapter progress points: 0.0, 7/22 (~0.318), 12/22 (~0.545), 1.0
      const cur = activeChapterIndexRef.current
      let newChapter = cur
      if (cur === 0) {
        if (p >= 0.18) newChapter = 1
      } else if (cur === 1) {
        if (p < 0.14) newChapter = 0
        else if (p >= 0.46) newChapter = 2
      } else if (cur === 2) {
        if (p < 0.40) newChapter = 1
        else if (p >= 0.80) newChapter = 3
      } else if (cur === 3) {
        if (p < 0.74) newChapter = 2
      }

      if (newChapter !== cur) {
        activeChapterIndexRef.current = newChapter
        setActiveChapterIndex(newChapter)
      }

      // Throttle React state update for progress bar to avoid 60fps re-render overhead
      if (Math.abs(p - lastProgressStateRef.current) > 0.005 || p === 0 || p === 1) {
        lastProgressStateRef.current = p
        setScrollProgress(p)
      }
    }

    // Initial measure
    handleScroll()

    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleScroll)
    }
    // Effect registers once per container mount — no chapter dep needed now
  }, [containerRef])

  // Navigate to matching chapter progress
  const scrollToChapter = useCallback((index: number) => {
    const container = containerRef.current
    if (!container) return

    const scrollableDist = container.scrollHeight - window.innerHeight
    if (scrollableDist <= 0) return

    const chapterP = chapters[index]?.progress ?? 0
    const targetScrollY = container.offsetTop + chapterP * scrollableDist

    window.scrollTo({
      top: targetScrollY,
      behavior: 'smooth',
    })
  }, [containerRef, chapters])

  const scrollToStart = useCallback(() => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }, [])

  return {
    targetProgressRef,
    activeChapterIndex,
    scrollProgress,
    scrollToChapter,
    scrollToStart,
  }
}
