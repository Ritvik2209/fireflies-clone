import { useCallback, useEffect, useRef, useState } from "react";

/** A media time and the moment it was taken (performance.now()): the clock counts from here. */
interface Anchor {
  ms: number;
  time: number;
}

/**
 * A simulated media player: a clock from 0 to `durationMs` at `rate`× speed, with no audio.
 *
 * The position is computed from an anchor, `anchor.ms + (now − anchor.time) × rate`, rather than
 * added up frame by frame, so it never drifts and stays right when frames are skipped (e.g. in a
 * background tab). Play, pause, seek and speed changes all just set a new anchor.
 * While paused, `anchor.ms` is the position.
 */
export function usePlayer(durationMs: number) {
  const [currentMs, setCurrentMs] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [rate, setRateState] = useState(1);
  const anchor = useRef<Anchor>({ ms: 0, time: 0 });

  // While playing, recompute the position on every animation frame (about 60 times a second).
  useEffect(() => {
    if (!isPlaying) return;
    let frame = 0;
    const tick = () => {
      const ms = anchor.current.ms + (performance.now() - anchor.current.time) * rate;
      if (ms >= durationMs) {
        // The end: stop there.
        anchor.current = { ms: durationMs, time: performance.now() };
        setCurrentMs(durationMs);
        setIsPlaying(false);
        return;
      }
      setCurrentMs(ms);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [isPlaying, rate, durationMs]);

  /** The exact position right now (`currentMs` can be up to a frame behind while playing). */
  const positionNow = useCallback((): number => {
    if (!isPlaying) return anchor.current.ms;
    const ms = anchor.current.ms + (performance.now() - anchor.current.time) * rate;
    return Math.min(ms, durationMs);
  }, [isPlaying, rate, durationMs]);

  const play = useCallback(() => {
    if (isPlaying) return;
    const from = anchor.current.ms >= durationMs ? 0 : anchor.current.ms; // at the end, start over
    anchor.current = { ms: from, time: performance.now() };
    setCurrentMs(from);
    setIsPlaying(true);
  }, [isPlaying, durationMs]);

  const pause = useCallback(() => {
    const ms = positionNow();
    anchor.current = { ms, time: performance.now() };
    setCurrentMs(ms);
    setIsPlaying(false);
  }, [positionNow]);

  const toggle = useCallback(() => (isPlaying ? pause() : play()), [isPlaying, pause, play]);

  /** Jumps to `ms` (clamped to the meeting). Playing or paused stays as it was. */
  const seek = useCallback(
    (ms: number) => {
      const target = Math.min(Math.max(ms, 0), durationMs);
      anchor.current = { ms: target, time: performance.now() };
      setCurrentMs(target);
    },
    [durationMs],
  );

  /** Changes the speed from the current position, so the time doesn't jump. */
  const setRate = useCallback(
    (next: number) => {
      anchor.current = { ms: positionNow(), time: performance.now() };
      setRateState(next);
    },
    [positionNow],
  );

  return { currentMs, isPlaying, rate, play, pause, toggle, seek, setRate };
}
