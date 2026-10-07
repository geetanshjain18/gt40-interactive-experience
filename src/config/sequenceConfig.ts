import type { SequenceChapter, SequenceFrame } from '../types/sequence'

export const SEQUENCE_CONFIG = {
  theme: {
    background: '#141414',
    surface: '#22211F',
    textMain: '#F4F0E8',
    textSecondary: '#B8B2A8',
    accent: '#C5AE88',
  },
  scroll: {
    // 2.5 viewport heights for measured, fluid sequence scrubbing
    totalHeightVh: 250,
  },
  playback: {
    // Smoothing response: lambda = 14 provides immediate response without lag,
    // settling precisely at frame stops with zero drift
    smoothingLambda: 14,
    // Crossfade width in fractional frame units (0.0 to 1.0)
    // Keep brief (0.28) so adjacent frames blend smoothly without double wheels or ghosting
    crossfadeWidth: 0.28,
    // Maximum DPR cap to prevent mobile overdraw
    maxDpr: 2.0,
  },
  chapters: [
    {
      id: 'front-perspective',
      number: '01',
      title: 'Front perspective',
      subtitle: 'FRONT PERSPECTIVE',
      caption: 'Explore its sculpted form, signature grille, and purposeful stance.',
      frameIndex: 0,
      progress: 0.0,
    },
    {
      id: 'the-silhouette',
      number: '02',
      title: 'The silhouette',
      subtitle: 'THE SILHOUETTE',
      caption: 'A taut, unbroken roofline flows into flush waistline glazing and an aerodynamic taper.',
      frameIndex: 7, // Frame #07 (raw 11 - left side profile)
      progress: 7 / 22,
    },
    {
      id: 'rear-perspective',
      number: '03',
      title: 'Rear perspective',
      subtitle: 'REAR PERSPECTIVE',
      caption: 'Broad athletic rear haunches resolve into a clean, reductionist tailgate graphic.',
      frameIndex: 12, // Frame #12 (raw 18 - direct rear view)
      progress: 12 / 22,
    },
    {
      id: 'complete-view',
      number: '04',
      title: 'Complete view',
      subtitle: 'COMPLETE VIEW',
      caption: 'The GT40 profile completes the automotive study.',
      frameIndex: 22, // Frame #22 (raw 35 - direct front return)
      progress: 1.0,
    },
  ] as SequenceChapter[],
  // Explicit playback order of the 23 curated WebP frames
  frames: Array.from({ length: 23 }, (_, idx) => ({
    sequenceIndex: idx,
    sourceRawIndex: [
      0, 1, 2, 4, 6, 8, 10, 11,
      12, 13, 15, 17, 18,
      19, 21, 23, 24, 26,
      28, 29, 31, 34, 35
    ][idx],
    filename: `seq_${String(idx).padStart(2, '0')}.webp`,
    path: `/sequence/optimized/seq_${String(idx).padStart(2, '0')}.webp`,
    progress: idx / 22,
  })) as SequenceFrame[],
}
