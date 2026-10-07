import { useCallback, useEffect, useRef, useState } from 'react'
import { useProgress } from '@react-three/drei'
import { Volume2, VolumeX } from 'lucide-react'
import { ExperienceCanvas } from './components/canvas/ExperienceCanvas'
import { useExperience } from './hooks/useExperience'
import { useMotion } from './hooks/useMotion'
import { CHOREOGRAPHY as C } from './config/choreography'
import type { Motion } from './config/choreography'
import { EngineAudio, type AudioMode } from './audio/EngineAudio'
import { useGLTF } from '@react-three/drei'
import { EXPERIENCE_CONFIG } from './config/experience'
import { CATEGORY_ORDER, CATEGORY_LABELS } from './components/explorer/vehicleComponents'
import type { VehicleComponent } from './components/explorer/vehicleComponents'
import type { ExplorerActions, InspectionSelection } from './components/canvas/ComponentExplorerController'
import './App.css'

function Loading() {
  const { progress, active } = useProgress()
  return (
    <p className="loading" role="status" aria-live="polite">
      {active
        ? `LOADING — ${Math.floor(progress / 10) * 10}%`
        : 'PREPARING'}
    </p>
  )
}

export default function App() {
  const { state, dispatch } = useExperience()
  const motion = useRef<Motion>({ time: 0, readyTime: 0, progress: 0, target: 0, active: false })
  const wake   = useRef<() => void>(() => {})
  const overlay = useRef<HTMLDivElement>(null)
  const audio  = useRef<EngineAudio | null>(null)
  const started = useRef(false)
  const explorerHintShown = useRef(false)
  const explorerActions = useRef<ExplorerActions>({ select: () => false, lock: () => {}, close: () => {} })

  const [muted, setMuted]                   = useState(true)
  const [audioFailed, setAudioFailed]       = useState(false)
  const [audioState, setAudioState]         = useState<AudioMode>('LOCKED')
  const [hasStarted, setHasStarted]         = useState(false)
  const [chapter, setChapter]               = useState(0)
  const [free, setFree]                     = useState(false)
  const [canvasKey, setCanvasKey]           = useState(0)
  const [catalog, setCatalog] = useState<VehicleComponent[]>([])
  const [selection, setSelection] = useState<InspectionSelection | null>(null)
  const [componentListOpen, setComponentListOpen] = useState(false)
  const [hintVisible, setHintVisible] = useState(false)
  const [cardPosition, setCardPosition] = useState({ left: 0, top: 0, width: 0, height: 0, edgeX: 0, edgeY: 0 })

  useEffect(() => {
    const engine = new EngineAudio(next => { setAudioState(next); setAudioFailed(next === 'ERROR') })
    audio.current = engine
    void engine.preload()

    const visibility = () => engine.visibility()
    const scrollAudio = () => {
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight)
      engine.setScrollProgress(window.scrollY / maxScroll)
    }
    document.addEventListener('visibilitychange', visibility)
    addEventListener('scroll', scrollAudio, { passive: true })
    addEventListener('resize', scrollAudio)
    scrollAudio()
    return () => {
      engine.dispose()
      document.removeEventListener('visibilitychange', visibility)
      removeEventListener('scroll', scrollAudio)
      removeEventListener('resize', scrollAudio)
    }
  }, [dispatch])

  const onCanvasReady = useCallback(() => dispatch({ type: 'CANVAS_READY' }), [dispatch])
  const onReady       = useCallback(() => dispatch({ type: 'MODEL_READY' }), [dispatch])
  const onGeometry    = useCallback(() => dispatch({ type: 'GEOMETRY' }), [dispatch])
  const onModelError  = useCallback((message: string) => dispatch({ type: 'MODEL_ERROR', message }), [dispatch])
  const onWebglError  = useCallback((message: string) => dispatch({ type: 'WEBGL_ERROR', message }), [dispatch])
  const complete      = useCallback(() => { dispatch({ type: 'COMPLETE' }) }, [dispatch])
  useMotion(state.phase, motion, wake, overlay, complete, setChapter)

  const onComponentSelection = useCallback((next: InspectionSelection | null) => { setSelection(next); if (next) setHintVisible(false) }, [])
  const onComponentCatalog = useCallback((items: VehicleComponent[]) => {
    setCatalog(items)
    if (!explorerHintShown.current && items.length > 0) {
      explorerHintShown.current = true
      setHintVisible(true)
    }
  }, [])

  useEffect(() => {
    if (!hintVisible) return
    const timeout = window.setTimeout(() => setHintVisible(false), 4200)
    return () => window.clearTimeout(timeout)
  }, [hintVisible])

  useEffect(() => {
    if (!selection) return
    const place = () => {
      const mobile = matchMedia('(max-width: 700px), (pointer: coarse)').matches
      const tablet = !mobile && innerWidth <= 900
      let width = mobile ? Math.min(innerWidth - 28, 420) : Math.min(300, innerWidth * .27)
      let height = mobile ? 260 : 280
      let left: number
      let top: number
      let edgeY = selection.anchor.y
      if (mobile) { left = (innerWidth - width) / 2; top = Math.max(16, innerHeight - height - 22) }
      else if (tablet) { width = Math.min(560, innerWidth - 28); height = Math.min(210, innerHeight * .22); left = (innerWidth - width) / 2; top = Math.max(selection.vehicle.bottom + 12, innerHeight - height - 12); top = Math.min(top, innerHeight - height - 12); edgeY = top }
      else {
        const preferRight = selection.component.preferredCardSide === 'right' || (!selection.component.preferredCardSide && selection.anchor.x < innerWidth / 2)
        const rightEdge = innerWidth - width - 16
        const rightFits = rightEdge > selection.anchor.x + 70
        left = preferRight && rightFits ? rightEdge : 16
        if (!preferRight && left + width > selection.anchor.x - 20) left = rightEdge
        top = Math.max(90, Math.min(innerHeight - height - 36, selection.anchor.y - height / 2))
        const chapterCopy = document.querySelector('.chapter-copy')?.getBoundingClientRect()
        if (chapterCopy && chapterCopy.width && left < chapterCopy.right && left + width > chapterCopy.left && top < chapterCopy.bottom && top + height > chapterCopy.top) {
          if (left < innerWidth / 2 && rightFits) left = rightEdge
          else top = Math.max(90, Math.min(innerHeight - height - 30, chapterCopy.bottom + 14))
        }
        edgeY = Math.max(top + 28, Math.min(top + height - 28, selection.anchor.y))
      }
      if (mobile) {
        const below = innerHeight - selection.anchor.y - 24 >= 165
        top = below ? selection.anchor.y + 48 : selection.anchor.y - 236 - 18
        height = Math.min(236, innerHeight - Math.max(76, top) - 88)
        top = below ? top : Math.max(76, top)
        if (!below) top = Math.max(242, top)
        top = Math.max(76, Math.min(innerHeight - height - 12, top))
        edgeY = below ? top : top + height
      }
      const edgeX = mobile || tablet ? Math.max(left + 22, Math.min(left + width - 22, selection.anchor.x)) : (selection.anchor.x < left ? left : left + width)
      setCardPosition({ left, top, width, height, edgeX, edgeY })
    }
    place(); addEventListener('resize', place)
    return () => removeEventListener('resize', place)
  }, [selection])

  const start = async () => {
    if (started.current || state.requested || !state.modelReady) return
    started.current = true
    setHasStarted(true)
    dispatch({ type: 'REQUEST' })
    const engine = audio.current
    if (engine) {
      engine.startFromGesture()
      setMuted(false)
    }
    motion.current.time = 0
    motion.current.active = true
    dispatch({ type: 'START' })
    wake.current()
  }

  const toggleAudio = async () => {
    if (!muted) { const ok = await audio.current?.setMuted(true) ?? false; if (ok) setMuted(true); return }
    const enabled = await audio.current?.setMuted(false) ?? false
    setMuted(!enabled)
    setAudioFailed(!enabled)
  }

  const retry = () => {
    useGLTF.clear(EXPERIENCE_CONFIG.model.path)
    audio.current?.reset()
    started.current = false
    motion.current = { time: 0, readyTime: 0, progress: 0, target: 0, active: false }
    setFree(false); setChapter(0); scrollTo(0, 0)
    setHasStarted(false)
    overlay.current?.style.setProperty('--time', '0')
    overlay.current?.style.setProperty('--landing-opacity', '1')
    overlay.current?.style.setProperty('--chapter-opacity', '0')
    setMuted(true); setAudioFailed(false)
    setCanvasKey(k => k + 1); dispatch({ type: 'RESET' })
  }

  const igniting   = state.phase === 'igniting'
  const exploring  = state.phase === 'exploring'
  const entered    = igniting || exploring
  const preIgnition = !entered && state.phase !== 'error'

  return (
    <div
      className="experience"
      data-phase={state.phase}
      data-engine={audioState}
      data-reduced={state.reduced}
      style={{ minHeight: exploring ? `${C.scrollHeightVh}svh` : '100svh' }}
    >
      <main className="pinned-stage">
        <div className="studio-background" aria-hidden="true">
          <div className="studio-background-base" />
          <div className="studio-background-blue" />
          <div className="studio-background-floor" />
          <div className="studio-background-interior" />
          <div className="studio-background-engine" />
        </div>
        <ExperienceCanvas
          key={canvasKey}
          state={state}
          motion={motion}
          wake={wake}
          onCanvasReady={onCanvasReady}
          onReady={onReady}
          onGeometry={onGeometry}
          onModelError={onModelError}
          onWebglError={onWebglError}
          free={free}
          onComponentSelection={onComponentSelection}
          onComponentCatalog={onComponentCatalog}
          explorerActions={explorerActions}
        />
        <div className={`overlay${selection ? ' has-component-selection' : ''}`} data-chapter={chapter} ref={overlay}>
          {/* ── PRE-IGNITION: only car + Start Engine button ── */}
          {preIgnition && (
            <div className="ignition-ui">
              <button
                className="start-button"
                onClick={() => void start()}
                disabled={state.requested || !state.modelReady}
                aria-label="Start the Ford GT40 engine"
              >
                <i aria-hidden="true" />
                {state.requested ? 'IGNITION' : 'START ENGINE'}
                <span aria-hidden="true">↗</span>
              </button>
            </div>
          )}

          {/* Loading indicator — pre-ignition only */}
          {!state.modelReady && state.phase !== 'error' && <Loading />}

          {/* ── POST-IGNITION content ── */}

          {/* Audio toggle — shown after ignition starts, but ONLY if audio is available
              or has just failed (so user can see it failed) */}
          {entered && (
            <button
              className="audio-control"
              onClick={toggleAudio}
              aria-label={muted ? 'Enable engine sound' : 'Mute engine sound'}
              aria-pressed={!muted}
            >
              {muted ? <VolumeX size={17} /> : <Volume2 size={17} />}
              <span>
                {audioFailed ? 'SOUND UNAVAILABLE' : muted ? 'SOUND OFF' : 'SOUND ON'}
              </span>
            </button>
          )}

          {entered && hasStarted && !audioFailed && ['IDLING', 'REVVING', 'SCROLL_FADED', 'MUTED'].includes(audioState) && (
            <button
              className="rev-control"
              onClick={() => audio.current?.rev()}
              disabled={muted || audioState !== 'IDLING' || chapter > 0 || audioFailed}
              aria-pressed={audioState === 'REVVING'}
              aria-label={audioState === 'REVVING' ? 'Engine revving' : 'Rev engine'}
            >
              <i aria-hidden="true" /> REV ENGINE
            </button>
          )}

          {/* Landing copy — revealed by CSS --time animation after ignition */}
          {entered && (
            <section className="landing-copy" aria-label="The machine that changed Le Mans">
              <p className="eyebrow"><span className="eyebrow-blue">FORD GT40</span><i /><span className="eyebrow-sand">LE MANS</span><i /><span className="eyebrow-orange">1969</span></p>
              <h1 className="hero-title">
                <span><b className="hero-title-blue">THE MACHINE</b></span>
                <span><b className="hero-title-sand">THAT CHANGED</b></span>
                <span><b className="hero-title-orange">LE MANS</b></span>
              </h1>
              <p className="support"><span>BUILT TO ENDURE.</span><br /><span>BORN TO WIN.</span></p>
            </section>
          )}

          {/* Scroll cue */}
          {entered && (
            <p className="scroll-cue">SCROLL TO EXPLORE <span aria-hidden="true">↓</span></p>
          )}

          {/* Chapter copy — exploring only */}
          {exploring && (
            <section className="chapter-copy" data-chapter={`0${chapter + 1}`} aria-label="The GT40 story">
              <p className="eyebrow chapter-label">FORD GT40 MK I / P/1075</p>
              <h2>{C.chapters[chapter].title}</h2>
              <p>{C.chapters[chapter].copy}</p>
              {chapter === C.chapters.length - 1 && (
                <button className="free-button" onClick={() => setFree(!free)}>
                  {free ? 'RETURN TO THE STORY' : 'EXPLORE FREELY'} <span>↗</span>
                </button>
              )}
            </section>
          )}

          {exploring && catalog.length > 0 && (
            <div className="component-explorer" onPointerEnter={() => setHintVisible(false)}>
              <button className="component-list-toggle" aria-expanded={componentListOpen} aria-controls="component-list" onClick={() => { setComponentListOpen(open => !open); setHintVisible(false) }}>COMPONENTS <span>{catalog.length.toString().padStart(2, '0')}</span></button>
              {componentListOpen && <nav className="component-list-panel" id="component-list" aria-label="GT40 components">
                {CATEGORY_ORDER.map(category => {
                  const members = catalog.filter(component => component.category === category)
                  return members.length ? <section key={category}><h3>{CATEGORY_LABELS[category]}</h3>{members.map(component => <button key={component.id} onClick={() => { if (explorerActions.current.select(component.id)) { explorerActions.current.lock(); setHintVisible(false); setComponentListOpen(false) } }} aria-label={`Inspect ${component.name}`}>{component.shortName}</button>)}</section> : null
                })}
              </nav>}
              {hintVisible && <p className="component-hint">{matchMedia('(hover: hover) and (pointer: fine)').matches ? 'HOVER TO INSPECT' : 'TAP A COMPONENT TO INSPECT'}</p>}
              {selection && <>
                <svg className="component-connector" aria-hidden="true"><line pathLength="1" x1={selection.anchor.x} y1={selection.anchor.y} x2={cardPosition.edgeX} y2={cardPosition.edgeY} /><circle className="component-anchor-halo" cx={selection.anchor.x} cy={selection.anchor.y} r="7" /><circle cx={selection.anchor.x} cy={selection.anchor.y} r="2.5" /></svg>
                <article key={selection.component.id} className={`component-card${selection.locked ? ' is-locked' : ''}`} style={{ left: cardPosition.left, top: cardPosition.top, width: cardPosition.width, maxHeight: cardPosition.height }} aria-labelledby="component-title" aria-live={selection.locked ? 'polite' : 'off'}>
                  <div className="component-card-top"><p>{selection.component.categoryLabel}</p><span>{selection.locked ? 'PINNED' : 'PREVIEW'}</span><button className="component-close" onClick={() => explorerActions.current.close()} aria-label="Close component inspection">×</button></div>
                  <h2 id="component-title">{selection.component.name}</h2>
                  <p className="component-purpose">{selection.component.purpose}</p>
                  <dl>{selection.component.facts.map(fact => <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}</dl>
                  {!selection.locked && <button className="component-pin" onClick={() => explorerActions.current.lock()}>PIN INSPECTION</button>}
                </article>
              </>}
            </div>
          )}

          {/* Error fallback */}
          {state.phase === 'error' && (
            <section className="fallback" role="alert">
              <img src={`${import.meta.env.BASE_URL}images/gt40-loading.webp`} alt="Gulf blue and orange Ford GT40 number 6" />
              <p>{state.error}</p>
              <button onClick={retry}>TRY AGAIN</button>
            </section>
          )}

          {/* Corner signature */}
          {entered && (
            <p className="signature" aria-hidden="true">
              <span>GULF / NO. 6</span><span>24 HEURES DU MANS</span>
            </p>
          )}
        </div>
      </main>
    </div>
  )
}
