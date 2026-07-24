# Tuning the `\iterate` operator glyph

Everything about the loop's appearance lives in one object, `ITERATE_EM`, at the
top of `packages/mathquill/src/commands/math/iterate.ts`. Every value is a
**multiple of font-size** (1em = the surrounding math size), so the glyph scales
with the text. `reflow()` reads the object on every call, which is what makes
live tuning possible.

## Re-running the tuner

The sliders drive `window.MQ_ITERATE_EM`, a debug hook that is **deliberately
not in the shipped source**. To tune, temporarily add this line just below the
`ITERATE_EM` object in `iterate.ts`, and delete it again when you are done:

```ts
(window as any).MQ_ITERATE_EM = ITERATE_EM;
```

Then:

```
cd packages/mathquill
node build.js
start iterate-test.html          # or just open the file in a browser
```

The **Tuning** panel has a slider per value. They mutate that object and reflow
every field on the page, so changes are immediate — `reflow()` re-reads
`ITERATE_EM` on every call, which is what makes live tuning work at all. The
panel prints a copy-ready spec dump; paste those numbers back into `ITERATE_EM`
to make them permanent. **Hard-refresh (Ctrl+Shift+R) after every rebuild**, or
you will be looking at a cached bundle.

The page also carries three diagnostics worth keeping:

- **Static field** — set once via `.latex()`, never edited. Proves the glyph
  renders on first paint rather than only after an edit.
- **First-render check** — snapshots the seed's metrics before and after
  webfonts load. Measurements taken pre-font are wrong; this is how that class
  of bug was found.
- **Geometry readout** — what actually got drawn (svg size in em, seed width,
  and the `above`/`below` extents `reflow()` measured).

The three diagnostics work whether or not the tuning hook is present; only the
slider panel needs it.

## The geometry model

The vertical construction is derived from the **loop alone** — the seed text
never reshapes it. Build it as if there were no definition at all: the arrow
comes down the upper-left and its **tip** meets the lower line's base. That
meeting point is the **anchor**.

- The anchor sits at the loop's vertical centre, moved by `gapCentreOffset`.
- The gap opens **symmetrically about the anchor** — the tip rises by `gap/2`,
  the line base drops by `gap/2` — so the anchor never drifts as the gap grows.
  A gap of 0 means the tip touches the line base, overlapping text and all.
- The seed rides on the anchor, moved by `textOffset` / `seedOffsetX`. Those
  move **only the text**; nothing shifts to avoid overlaps.
- Horizontally the variable is centred **on** the loop's left edge line — its
  name overhangs to the left by half its own width, and `=value` trails right
  into the interior.

Bounds are only the strictly geometric ones: the straight runs off the corners
may shrink to zero length.

## The tunables

| Key | Meaning |
|---|---|
| `stroke` | Line width of the loop. |
| `radius` | Corner radius. Clamped to `min(H/2, loopWidth/2)` so corners can't overlap. |
| `arrowLen` | Arrowhead length, tip to base. |
| `arrowHalfWidth` | Half the arrowhead's width. |
| `gap` | Break between arrow tip and line base. A **floor** — a tall seed grows it. |
| `gapPad` | Extra clearance added when a seed is taller than `gap`. |
| `gapCentreOffset` | Anchor's offset from the loop's vertical centre. |
| `textOffset` | Seed's vertical offset from the gap centre. Text only. |
| `seedOffsetX` | Seed's horizontal nudge. The left edge and arrow stay put; the right edge follows so `padRight` is preserved. |
| `padRight` | Interior space between the seed and the loop's right edge. |
| `seedPadY` | Clearance above/below a seed tall enough to drive the height. |
| `height` | Loop height. A **floor** — geometry or a tall seed can exceed it. |
| `upperOffset` | Gap between the loop and the upper limit. |
| `lowerOffset` | Gap between the loop and the lower limit. |
| `trailingGap` | Space between the operator and the body that follows it. Applied as `margin-right`, on top of the `.2em` padding on `.mq-iterate`. |
| `axisHeight` | Height of the math axis above the text baseline — where the loop's centre sits. |

## Gotchas that cost time before

**`gapCentreOffset` saturates.** The arrow's base can't rise above the top
corner's end, so the anchor is clamped to at least
`stroke/2 + radius + arrowLen + gap/2`. At the current values that limit is
≈1.3975em while `H/2` is 1.235em, so an offset below ≈0.1625em does nothing —
the slider is dead in that direction and the upper-left straight run is already
zero-length. Raise `height`, or shrink `radius`/`arrowLen`, to get headroom back.

**`seedPadY` looks dead for ordinary text.** It only applies when the seed is
what's driving the loop's height. For `g=0` the height comes from the `height`
floor instead, so the slider does nothing until you put a matrix in the seed.

**`axisHeight` is not a fixed shift.** The operator's baseline is pinned to the
loop's *bottom* by `.mq-iterate-strut`, so `reflow()` applies
`vertical-align: axisHeight - H/2` — recomputed from the measured `H` every
time. A static shift would only be correct at one loop height and would break
as soon as the loop stretched.

**The gap only clears what crosses the left edge.** If the seed opens with a
variable (`Variable` covers Latin and Greek), only that one glyph crosses the
line — everything after the `=` sits in the interior — so the gap stays tight
around it and the arrow points straight at the letter. If it opens with anything
else (a bare matrix), the whole seed crosses and the gap expands to clear it.
The loop's *height* takes its own constraint either way, so `g=[matrix]` keeps a
tight gap while still growing tall enough to contain the matrix.

**Measurements are only as good as the fonts.** `reflow()` measures rendered
glyphs, so anything measured before the webfonts load is wrong. The app calls
`reflowOnFontsReady()` (`apps/app/src/integrations/reflowOnFontsReady.ts`) for
this; any other host must do the same.

## Current values

```
stroke             0.140      padRight           0.310
radius             0.330      seedPadY           0.670
arrowLen           0.385      height             2.470
arrowHalfWidth     0.210      upperOffset       -0.015
gap                1.225      lowerOffset        0.120
gapPad             0.000      axisHeight         0.250
gapCentreOffset    0.140      trailingGap        0.150
textOffset        -0.240
seedOffsetX        0.000
```

Limits render full size (1em, not scriptstyle) by decision. LaTeX form is
`\iterate{g=init}_{from}^{to}`, with the body as trailing content rather than a
block of the operator — the same shape as `\sum`.
