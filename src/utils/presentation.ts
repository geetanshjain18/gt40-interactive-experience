/** Absolute targets avoid accumulated rotation error when scrolling in reverse. */
export function clampProgress(progress: number) {
  return Number.isFinite(progress) ? Math.min(1, Math.max(0, progress)) : 0
}

/** Fit the complete rotating silhouette inside narrow portrait viewports. */
export function presentationCameraFit(
  width: number, height: number, desktopDistance: number, mobileDistance: number,
  desktopFov: number, mobileFov: number, carLength: number,
) {
  const aspect = Math.max(width, 1) / Math.max(height, 1)
  const portrait = width < 768 || aspect < 1.15
  const fov = portrait ? mobileFov : desktopFov
  const horizontalFov = 2 * Math.atan(Math.tan(fov * Math.PI / 360) * aspect)
  const silhouetteRadius = carLength * 0.56
  const safeDistance = silhouetteRadius * 1.07 / Math.sin(horizontalFov / 2)
  return { fov, distance: Math.max(width < 768 ? mobileDistance : desktopDistance, safeDistance) }
}
