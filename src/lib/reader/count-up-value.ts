/**
 * The number shown `elapsed` milliseconds into a count-up from 0 to `value` (ease-out cubic). `elapsed` can be a hair below zero:
 * the animation frame's timestamp is the start of the frame, which can be earlier than the performance.now() taken just before the
 * frame was asked for. That gave Math.round(-0.004) = -0, and the figure flashed as "-0". The result is never below 0 or above `value`.
 */
export function countUpValue(value: number, elapsedMs: number, durationMs: number): number {
  const t = Math.max(0, Math.min(1, elapsedMs / durationMs));
  const shown = Math.round(value * (1 - Math.pow(1 - t, 3)));
  return Math.max(0, Math.min(value, shown)) + 0;
}
