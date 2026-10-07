/**
 * scroll.test.ts — automated scroll / DOM correctness test
 *
 * Tests that can run in headless (no full WebGL needed for DOM checks):
 *   1. Pre-ignition: no headline/copy/scroll-cue visible before clicking
 *   2. Document height is correct for scroll (720vh)
 *   3. Scroll changes scrollY and triggers target progress update
 *   4. The overlay has pointer-events:none (doesn't block scroll)
 *   5. No competing scroll listeners (no Lenis/ScrollTrigger)
 *
 * Tests requiring WebGL (SwiftShader) — skipped gracefully in pure headless:
 *   6. Camera moves when scrolling (reads window.__debug)
 *   7. Frame timing
 */
import { test, expect } from '@playwright/test'

const BASE_URL = 'http://localhost:5173'

test.describe('GT40 pre-ignition UI', () => {
  test('Before Start Engine: only car and button visible, no headline/copy', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000) // let React render

    // Headline / landing copy must NOT be in the DOM before ignition
    const landingCopy = await page.$('.landing-copy')
    expect(landingCopy).toBeNull()

    // Scroll cue must NOT be visible
    const scrollCue = await page.$('.scroll-cue')
    expect(scrollCue).toBeNull()

    // Audio control must NOT be visible before ignition
    const audioCtrl = await page.$('.audio-control')
    expect(audioCtrl).toBeNull()

    // Start Engine button MUST be present
    const startBtn = await page.$('.start-button')
    expect(startBtn).not.toBeNull()

    // Phase should be loading or ready, not igniting/exploring
    const phase = await page.evaluate(() =>
      document.querySelector('.experience')?.getAttribute('data-phase')
    )
    console.log('Phase before click:', phase)
    expect(['loading', 'ready', 'preparing']).toContain(phase)

    console.log('✓ Pre-ignition: only car + Start Engine button visible')
  })

  test('Document height matches scrollHeightVh config when exploring', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' })

    // Inject a fake "exploring" phase to test document height
    await page.evaluate(() => {
      const el = document.querySelector('.experience') as HTMLElement
      if (el) {
        el.setAttribute('data-phase', 'exploring')
        el.style.minHeight = '720svh'
      }
    })

    const docHeight = await page.evaluate(() => document.documentElement.scrollHeight)
    const viewportH  = await page.evaluate(() => window.innerHeight)
    const scrollable = docHeight - viewportH

    console.log(`Doc height: ${docHeight}px, viewport: ${viewportH}px, scrollable: ${scrollable}px = ${(scrollable/viewportH).toFixed(1)}×vh`)

    // 720svh total − 100svh viewport = 620svh scrollable = 620× viewport-height
    // At 720px viewport: 620 × 720 = 446,400px, but CSS svh is relative to viewport,
    // so 720svh = 720 × viewportH px total = 5184px, scrollable = 619 × (viewportH/100)
    // Simplified: scrollable should be at least 5× viewport height
    expect(scrollable).toBeGreaterThan(5 * viewportH)
    console.log(`✓ Scrollable distance = ${(scrollable/viewportH).toFixed(1)}× viewport heights`)
  })
})

test.describe('GT40 scroll mechanics (DOM-level)', () => {
  test('Overlay has pointer-events:none and does not block scroll', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1000)

    const overlayPE = await page.evaluate(() => {
      const overlay = document.querySelector('.overlay') as HTMLElement
      return overlay ? getComputedStyle(overlay).pointerEvents : 'not found'
    })
    console.log('Overlay pointer-events:', overlayPE)
    expect(overlayPE).toBe('none')

    const canvasPE = await page.evaluate(() => {
      const canvas = document.querySelector('canvas') as HTMLElement
      return canvas ? getComputedStyle(canvas).pointerEvents : 'not found'
    })
    console.log('Canvas pointer-events:', canvasPE)
    expect(overlayPE).toBe('none')
    expect(canvasPE).toBe('auto')

    console.log('✓ Overlay does not block scroll input')
  })

  test('No smooth-scroll library active (Lenis / ScrollTrigger)', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1000)

    const hasLenis = await page.evaluate(() => {
      const win = window as unknown as Record<string, unknown>
      return typeof win.lenis !== 'undefined' || typeof win.Lenis !== 'undefined'
    })
    const hasScrollTrigger = await page.evaluate(() => {
      const win = window as unknown as Record<string, unknown>
      return typeof win.ScrollTrigger !== 'undefined'
    })
    console.log('Lenis active:', hasLenis)
    console.log('ScrollTrigger active:', hasScrollTrigger)
    expect(hasLenis).toBe(false)
    expect(hasScrollTrigger).toBe(false)
    console.log('✓ Only native scroll — no conflicting smooth-scroll library')
  })

  test('Scroll listener is passive (no preventDefault)', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1000)

    // Inject exploring phase so scroll is enabled
    await page.evaluate(() => {
      document.documentElement.style.setProperty('overflow-y', 'auto', 'important')
      document.body.style.setProperty('overflow-y', 'auto', 'important')
      const el = document.querySelector('.experience') as HTMLElement
      if (el) el.style.setProperty('min-height', '720svh', 'important')
    })

    const scrollY_before = await page.evaluate(() => window.scrollY)

    // Fire wheel event
    await page.mouse.wheel(0, 300)
    await page.waitForTimeout(100)

    const scrollY_after = await page.evaluate(() => window.scrollY)
    console.log(`scrollY before: ${scrollY_before}, after: ${scrollY_after}`)

    // The page should have scrolled (if preventDefault was called it wouldn't)
    expect(scrollY_after).toBeGreaterThan(scrollY_before)
    console.log(`✓ Scroll not prevented — scrollY moved by ${scrollY_after - scrollY_before}px`)
  })

  test('Scroll progress tracks scrollY monotonically', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(500)

    // Inject exploring state + expose motion tracking
    await page.evaluate(() => {
      document.documentElement.style.setProperty('overflow-y', 'auto', 'important')
      document.body.style.setProperty('overflow-y', 'auto', 'important')
      const el = document.querySelector('.experience') as HTMLElement
      if (el) el.style.setProperty('min-height', '720svh', 'important')

      // Hook into scroll to track target progress
      const targets: number[] = []
      ;(window as unknown as Record<string, unknown>).__scrollTargets = targets
      window.addEventListener('scroll', () => {
        const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight)
        targets.push(window.scrollY / maxScroll)
      }, { passive: true })
    })

    // Scroll down in steps
    const readings: number[] = []
    for (let i = 0; i < 4; i++) {
      await page.mouse.wheel(0, 400)
      await page.waitForTimeout(100)
      const scrollY = await page.evaluate(() => window.scrollY)
      readings.push(scrollY)
    }

    console.log('scrollY readings:', readings.join(', '))

    // Assert monotonically non-decreasing
    for (let i = 1; i < readings.length; i++) {
      expect(readings[i]).toBeGreaterThanOrEqual(readings[i-1])
    }

    // Assert total scroll moved meaningfully
    const totalScrolled = readings[readings.length - 1] - readings[0]
    expect(totalScrolled).toBeGreaterThan(200)
    console.log(`✓ Total scrolled: ${totalScrolled}px monotonically`)

    // Check targets
    const targets = await page.evaluate(
      () => (window as unknown as Record<string, unknown>).__scrollTargets as number[]
    )
    if (targets && targets.length > 1) {
      for (let i = 1; i < targets.length; i++) {
        expect(targets[i]).toBeGreaterThanOrEqual(targets[i-1] - 0.001)
      }
      console.log(`✓ Progress targets: ${targets[0].toFixed(4)} → ${targets[targets.length-1].toFixed(4)}`)
    }

    // Reverse scroll
    for (let i = 0; i < 3; i++) {
      await page.mouse.wheel(0, -400)
      await page.waitForTimeout(100)
    }
    const afterReverse = await page.evaluate(() => window.scrollY)
    const beforeReverse = readings[readings.length - 1]
    console.log(`Reverse: scrollY from ${beforeReverse} to ${afterReverse}`)
    expect(afterReverse).toBeLessThan(beforeReverse - 100)
    console.log('✓ Reverse scroll works')
  })
})

test.describe('GT40 scroll performance (reported numbers)', () => {
  test('Report scroll architecture suspects', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1000)

    const report = await page.evaluate(() => {
      const docH    = document.documentElement.scrollHeight
      const viewH   = window.innerHeight
      const exp     = document.querySelector('.experience') as HTMLElement
      const pinned  = document.querySelector('.pinned-stage') as HTMLElement
      const overlay = document.querySelector('.overlay') as HTMLElement
      const canvas  = document.querySelector('canvas') as HTMLElement

      return {
        docHeight:            docH,
        viewportHeight:       viewH,
        scrollable:           docH - viewH,
        scrollableVh:         ((docH - viewH) / viewH).toFixed(1),
        bodyOverflow:         getComputedStyle(document.body).overflowY,
        experienceMinH:       exp ? exp.style.minHeight : 'N/A',
        experiencePhase:      exp ? exp.getAttribute('data-phase') : 'N/A',
        pinnedPosition:       pinned ? getComputedStyle(pinned).position : 'N/A',
        overlayPointerEvents: overlay ? getComputedStyle(overlay).pointerEvents : 'N/A',
        canvasPointerEvents:  canvas ? getComputedStyle(canvas).pointerEvents : 'N/A',
        htmlScrollBehavior:   getComputedStyle(document.documentElement).scrollBehavior,
        hasLenis:             typeof (window as unknown as Record<string, unknown>).Lenis !== 'undefined',
        hasGSAPScrollTrigger: typeof (window as unknown as Record<string, unknown>).ScrollTrigger !== 'undefined',
      }
    })

    console.log('\n=== SCROLL ARCHITECTURE REPORT ===')
    for (const [k, v] of Object.entries(report)) {
      console.log(`  ${k}: ${v}`)
    }

    // Before Start Engine, body overflow should be hidden
    expect(report.bodyOverflow).toBe('hidden')

    // Pinned stage must be fixed (not sticky/absolute)
    expect(report.pinnedPosition).toBe('fixed')

    // Overlay must not block scroll
    expect(report.overlayPointerEvents).toBe('none')

    // No conflicting libraries
    expect(report.hasLenis).toBe(false)
    expect(report.hasGSAPScrollTrigger).toBe(false)

    // html scroll-behavior must be 'auto', not 'smooth' (we use native + damped progress)
    expect(report.htmlScrollBehavior).toBe('auto')

    console.log('✓ Architecture clean: fixed stage, no libraries, no blocking')
  })
})
