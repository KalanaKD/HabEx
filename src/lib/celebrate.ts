/**
 * Small celebration helpers. Confetti is skipped when the OS asks for
 * reduced motion; the toast/overlay still show so feedback isn't lost.
 */
import confetti from 'canvas-confetti'

const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Burst from a screen point (e.g. the check button) — every completion. */
export function burstAt(x: number, y: number): void {
  if (reduceMotion()) return
  void confetti({
    particleCount: 28,
    spread: 60,
    startVelocity: 28,
    scalar: 0.8,
    ticks: 90,
    origin: { x: x / window.innerWidth, y: y / window.innerHeight },
    colors: ['#6366f1', '#10b981', '#f59e0b', '#0ea5e9'],
    disableForReducedMotion: true,
  })
}

/** Two side cannons — all habits done for the day. */
export function shower(): void {
  if (reduceMotion()) return
  const opts = { particleCount: 60, spread: 70, startVelocity: 45, ticks: 160, disableForReducedMotion: true }
  void confetti({ ...opts, angle: 60, origin: { x: 0, y: 0.7 } })
  void confetti({ ...opts, angle: 120, origin: { x: 1, y: 0.7 } })
}

/** Big centre burst with stars — level up. */
export function fireworks(): void {
  if (reduceMotion()) return
  const end = Date.now() + 900
  const frame = () => {
    void confetti({ particleCount: 6, spread: 360, startVelocity: 30, ticks: 120, origin: { x: 0.5, y: 0.4 }, shapes: ['star', 'circle'], colors: ['#fbbf24', '#f59e0b', '#a78bfa', '#6366f1'], disableForReducedMotion: true })
    if (Date.now() < end) requestAnimationFrame(frame)
  }
  frame()
}
