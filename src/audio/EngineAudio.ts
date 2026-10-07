import { AUDIO as A } from '../config/audio'

export type AudioMode = 'LOCKED' | 'READY' | 'STARTING' | 'IDLING' | 'REVVING' | 'SCROLL_FADED' | 'MUTED' | 'ERROR'
type Track = keyof typeof A.paths
const assetRequests = new Map<Track, Promise<ArrayBuffer | undefined>>()

/** One gesture-owned Web Audio engine; scroll and mute gains stay independent. */
export class EngineAudio {
  private context?: AudioContext
  private master?: GainNode
  private scrollGain?: GainNode
  private clickGain?: GainNode
  private startGain?: GainNode
  private idleGain?: GainNode
  private revGain?: GainNode
  private buffers = new Map<Track, AudioBuffer>()
  private bytes = new Map<Track, ArrayBuffer>()
  private pending?: Promise<void>
  private sources = new Set<AudioBufferSourceNode>()
  private startSource?: AudioBufferSourceNode
  private revSource?: AudioBufferSourceNode
  private suspendTimer?: ReturnType<typeof setTimeout>
  private mode: AudioMode = 'LOCKED'
  private lastPublished?: AudioMode
  private muted = false
  private scrollProgress = 0
  private disposed = false
  failed = false
  private readonly onState: (state: AudioMode) => void

  constructor(onState: (state: AudioMode) => void = () => {}) { this.onState = onState }

  private publish() {
    if (this.disposed) return
    const state = this.failed ? 'ERROR' : this.muted ? 'MUTED' : this.scrollProgress >= .35 && this.mode === 'IDLING' ? 'SCROLL_FADED' : this.mode
    if (state !== this.lastPublished) { this.lastPublished = state; this.onState(state) }
  }

  preload() {
    return this.pending ??= (async () => {
      const load = async (key: Track, required: boolean) => {
        const configured = A.paths[key]
        let request = assetRequests.get(key)
        if (!request) {
          request = fetch(configured).then(async response => response.ok && response.headers.get('content-type')?.startsWith('audio/') ? response.arrayBuffer() : undefined).catch(() => undefined)
          assetRequests.set(key, request)
        }
        const bytes = await request
        if (bytes) { this.bytes.set(key, bytes); return }
        if (required) throw new Error(`Missing audio asset: ${configured}`)
      }
      try {
        await Promise.all([
          load('click', true), load('start', true), load('idle', true), load('rev', false),
        ])
        if (!this.failed && this.mode === 'LOCKED') this.mode = 'READY'
      } catch {
        this.failed = true
        this.mode = 'ERROR'
      }
      this.publish()
    })()
  }

  private ensureContext() {
    if (this.context) return this.context
    const context = new AudioContext()
    const master = context.createGain()
    const scroll = context.createGain()
    const click = context.createGain()
    master.gain.value = 0
    scroll.gain.value = 1
    click.gain.value = A.click
    scroll.connect(master)
    click.connect(master)
    master.connect(context.destination)
    this.context = context
    if (import.meta.env.DEV && new URLSearchParams(location.search).has('qa')) {
      (window as Window & { __GT40_AUDIO_QA__?: EngineAudio }).__GT40_AUDIO_QA__ = this
    }
    this.master = master
    this.scrollGain = scroll
    this.clickGain = click
    return context
  }

  private async decodeAssets() {
    if (this.failed) return false
    await this.preload()
    const context = this.context!
    await Promise.all([...this.bytes].map(async ([key, bytes]) => {
      if (!this.buffers.has(key)) this.buffers.set(key, await context.decodeAudioData(bytes.slice(0)))
    }))
    if (!this.buffers.has('click') || !this.buffers.has('start') || !this.buffers.has('idle')) {
      this.failed = true
      this.mode = 'ERROR'
      this.publish()
      return false
    }
    return true
  }

  private play(buffer: AudioBuffer, gain: GainNode, at: number, loop = false) {
    const context = this.context!
    const source = context.createBufferSource()
    source.buffer = buffer
    source.loop = loop
    source.connect(gain)
    this.sources.add(source)
    source.onended = () => {
      this.sources.delete(source)
      source.disconnect()
      if (source === this.startSource && this.mode === 'STARTING') {
        this.mode = 'IDLING'
        this.publish()
        this.setScrollProgress(this.scrollProgress)
      }
      if (source === this.revSource) {
        this.revSource = undefined
        if (this.mode === 'REVVING') this.mode = 'IDLING'
        this.publish()
      }
    }
    source.start(at)
    return source
  }

  /** Call synchronously from Start Engine's trusted click handler. */
  startFromGesture() {
    if ((this.mode !== 'READY' && this.mode !== 'LOCKED') || this.failed || this.disposed) return
    const context = this.ensureContext()
    const resume = context.resume()
    this.muted = false
    this.mode = 'STARTING'
    const now = context.currentTime
    this.master!.gain.cancelScheduledValues(now)
    this.master!.gain.setTargetAtTime(1, now, .045)
    this.publish()
    void Promise.all([resume, this.decodeAssets()]).then(([, decoded]) => {
      if (this.disposed || !this.context || !this.clickGain) return
      if (!decoded) return
      const ctx = this.context
      const clickAt = ctx.currentTime + .005
      this.play(this.buffers.get('click')!, this.clickGain, clickAt)
      this.startGain = ctx.createGain()
      this.idleGain = ctx.createGain()
      this.revGain = ctx.createGain()
      this.startGain.gain.value = A.startVolume
      this.idleGain.gain.value = 0
      this.revGain.gain.value = 0
      this.startGain.connect(this.scrollGain!)
      this.idleGain.connect(this.scrollGain!)
      this.revGain.connect(this.scrollGain!)
      const startAt = clickAt + A.starterDelay
      this.startSource = this.play(this.buffers.get('start')!, this.startGain, startAt)
      const crossfade = Math.min(A.crossfade, this.buffers.get('start')!.duration * .25)
      const idleAt = startAt + Math.max(0, this.buffers.get('start')!.duration - crossfade)
      this.startGain.gain.setValueAtTime(A.startVolume, idleAt)
      this.startGain.gain.linearRampToValueAtTime(0, idleAt + crossfade)
      this.idleGain.gain.setValueAtTime(0, idleAt)
      this.idleGain.gain.linearRampToValueAtTime(A.idleVolume, idleAt + crossfade)
      this.play(this.buffers.get('idle')!, this.idleGain, idleAt, true)
      if (this.scrollProgress >= .35) this.setScrollProgress(this.scrollProgress)
    }).catch(() => {
      this.failed = true
      this.mode = 'ERROR'
      this.publish()
    })
  }

  async setMuted(value: boolean) {
    if (this.failed) return false
    const context = this.context ?? this.ensureContext()
    if (!value) {
      const resumed = context.resume()
      const decoded = await this.decodeAssets()
      await resumed
      if (!decoded) return false
    }
    this.muted = value
    const now = context.currentTime
    this.master!.gain.cancelScheduledValues(now)
    this.master!.gain.setTargetAtTime(value ? 0 : 1, now, .11)
    this.publish()
    return true
  }

  rev() {
    const context = this.context
    if (!context || this.mode !== 'IDLING' || this.muted || this.failed || this.scrollProgress > .14 || this.revSource) return false
    const buffer = this.buffers.get('rev')
    if (!buffer || !this.idleGain || !this.revGain) return false
    this.mode = 'REVVING'
    this.publish()
    const now = context.currentTime
    const idleTarget = this.scrollProgress <= .05 ? A.idleVolume : A.idleVolume * (1 - this.scrollFade(this.scrollProgress))
    const at = now + .035
    const end = at + buffer.duration
    const blend = Math.min(A.revReturnFade, buffer.duration * .25)
    this.idleGain.gain.cancelScheduledValues(now)
    this.idleGain.gain.setTargetAtTime(0, now, .045)
    this.revGain.gain.cancelScheduledValues(now)
    this.revGain.gain.setValueAtTime(0, at)
    this.revGain.gain.linearRampToValueAtTime(A.revVolume, at + .12)
    this.revGain.gain.setValueAtTime(A.revVolume, end - blend)
    this.revGain.gain.linearRampToValueAtTime(0, end)
    this.idleGain.gain.setValueAtTime(0, end - blend)
    this.idleGain.gain.linearRampToValueAtTime(idleTarget, end)
    this.revSource = this.play(buffer, this.revGain, at)
    return true
  }

  private scrollFade(progress: number) {
    const t = Math.max(0, Math.min(1, (progress - .05) / .30))
    return t * t * (3 - 2 * t)
  }

  setScrollProgress(progress: number) {
    this.scrollProgress = Math.max(0, Math.min(1, progress))
    const context = this.context
    if (!context || this.disposed) { this.publish(); return }
    clearTimeout(this.suspendTimer)
    if (this.scrollProgress < .35 && context.state === 'suspended' && !this.muted) void context.resume()
    const factor = 1 - this.scrollFade(this.scrollProgress)
    const target = this.scrollProgress <= .05 ? 1 : factor
    const now = context.currentTime
    this.scrollGain!.gain.cancelScheduledValues(now)
    this.scrollGain!.gain.setTargetAtTime(target, now, .16)
    if (this.scrollProgress >= .35 && this.mode === 'IDLING' && !this.muted) {
      this.suspendTimer = setTimeout(() => {
        if (this.scrollProgress >= .35 && this.mode === 'IDLING' && this.context?.state === 'running') void this.context.suspend()
      }, 1800)
    }
    this.publish()
  }

  visibility() {
    const context = this.context
    if (!context) return
    if (document.hidden) void context.suspend()
    else if (!this.muted && this.mode !== 'LOCKED' && this.mode !== 'READY') void context.resume()
  }

  reset() {
    clearTimeout(this.suspendTimer)
    for (const source of this.sources) { try { source.stop() } catch { /* already ended */ } source.disconnect() }
    this.sources.clear()
    this.startSource = undefined
    this.revSource = undefined
    this.scrollProgress = 0
    this.muted = false
    this.failed = false
    this.mode = this.buffers.size ? 'READY' : 'LOCKED'
    if (this.master && this.context) this.master.gain.setTargetAtTime(0, this.context.currentTime, .03)
    this.publish()
  }

  dispose() {
    this.disposed = true
    clearTimeout(this.suspendTimer)
    for (const source of this.sources) { try { source.stop() } catch { /* already ended */ } source.disconnect() }
    this.sources.clear()
    void this.context?.close()
  }
}
