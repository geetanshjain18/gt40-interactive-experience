export interface SequenceFrame {
  sequenceIndex: number
  sourceRawIndex: number
  filename: string
  path: string
  progress: number
}

export interface SequenceChapter {
  id: string
  number: string
  title: string
  subtitle: string
  caption: string
  frameIndex: number
  progress: number
}

export interface SequenceManifest {
  version: string
  totalFrames: number
  canvas: {
    width: number
    height: number
  }
  frames: SequenceFrame[]
  chapters: SequenceChapter[]
}
