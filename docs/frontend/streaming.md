# Streaming display

Ask (and any later surface that paints model-native text) keeps two clocks.

**Arrival** is the SSE reader. Deltas, file scans and cites update session
state as soon as a frame is parsed. The Worker already flushes the first
bytes of a stream; this layer does not re-batch them.

**Display** is `useDisplayClock` in `shared/lib`. It segments each new suffix
once with `Intl.Segmenter` (code points if that fails) and releases graphemes
on `requestAnimationFrame` from the unrendered backlog:

`rate = clamp(pending / 0.25s, 20, 800)` graphemes per second;
`budget += rate × elapsed`; emit `floor(budget)`, at most 512 per frame.

The 250 ms time constant overlaps adjacent transport batches. Elapsed time is
wall-clock, so 60 Hz and 120 Hz cover the same progress. Leftover budget
carries to the next frame.

Smoothness stops when the fragment is known to be finished (`done` / `error`),
when `prefers-reduced-motion` is set, when more than 4,096 graphemes are
waiting, or when the tab is hidden (a 50 ms timer drains the queue because
rAF pauses). Freshness then wins: the paint head snaps to the arrival head.

Structural events (scanned files, cites) are not played per grapheme. They
apply on arrival. Ending the turn flushes any remaining answer text in the
same frame so the UI never animates a stream the runtime has already closed.
