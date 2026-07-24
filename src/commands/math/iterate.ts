/*********************************************
 * The iterate operator — \iterate{g=0}_{k=1}^{n}
 *
 * A rounded-rectangle loop broken on its LEFT edge. The returning line comes
 * DOWN the upper-left and ends in a downward arrowhead whose tip points at the
 * recursion variable — g feeding back into g. The variable name is centred ON
 * the left edge line (overhanging it by half its own width); its seed
 * "=value" trails right into the interior. Limits stack above and below like
 * \sum. The iterated body is trailing content, NOT a block of the operator.
 *
 * Blocks: 0 = seed (g=init), 1 = lower limit, 2 = upper limit.
 *
 * Vertical construction is derived from the loop alone — the seed text never
 * reshapes it. The anchor is the point where the arrow TIP would touch the
 * lower line's base at zero gap; the gap then opens symmetrically about that
 * anchor, so it never drifts as the gap grows. Only strictly geometric bounds
 * are applied: the straight runs off the corners may shrink to zero length.
 *
 * The loop's WIDTH tracks the measured seed block, so the SVG is redrawn in
 * reflow(), which MathQuill calls after every edit. Its height is fixed in em.
 *********************************************/

// Geometry as multiples of font-size, locked by the visual study.
const ITERATE_EM = {
  stroke: 0.14,
  radius: 0.33,
  arrowLen: 0.385,
  arrowHalfWidth: 0.21,
  gap: 1.225, // arrow tip -> line base (a floor; a tall seed grows it)
  gapPad: 0, // extra clearance added around a seed taller than `gap`
  gapCentreOffset: 0.14, // of the gap's centre, from vertical centre
  textOffset: -0.24, // of the seed text, from the gap centre
  seedOffsetX: 0, // horizontal nudge of the seed; the arrow/left edge stay put
  padRight: 0.31,
  seedPadY: 0.67, // clearance above/below a seed tall enough to drive the height
  height: 2.47,
  upperOffset: -0.015, // gap between the loop and the upper limit
  lowerOffset: 0.12, // gap between the loop and the lower limit
  // Space between the operator and the body that follows it. Sits on top of
  // the .2em padding on .mq-iterate, so the visible gap is a little larger.
  trailingGap: 0.15,
  // Height of the math axis above the text baseline — where the loop's centre
  // should sit, like the bar of a fraction or the middle of a \sum. The strut
  // pins the operator's baseline to the loop's BOTTOM, so reflow() applies a
  // vertical-align of (axisHeight - H/2). That must be recomputed from the
  // measured H, since the loop stretches for tall seeds; a static shift would
  // only be correct at the default height.
  axisHeight: 0.25,
};

interface IterateGeometry {
  W: number;
  H: number;
  outline: string;
  head: string;
  strokeWidth: number;
  seedLeft: number;
  seedTop: number;
}

/**
 * Pure geometry for the glyph.
 * @param em    font-size in px (1em)
 * @param seedW measured width of the whole seed block ("g=0")
 * @param varW  measured width of just the variable name ("g")
 * @param above how far the seed extends ABOVE the variable's centre
 * @param below how far the seed extends BELOW the variable's centre
 * @param clearHalf half-extent that must clear the loop's LEFT EDGE — the
 *   leading glyph alone when the seed starts with a variable, otherwise the
 *   whole seed
 *
 * `above`/`below` are measured from the VARIABLE, not from the seed's box, so
 * a lopsided seed (x^2^2^2^2 grows only upward) still hangs its variable on the
 * arrow's line.
 *
 * The gap only has to clear what actually crosses the left edge, which is why
 * `clearHalf` is separate: in `g=[matrix]` the matrix sits in the interior, so
 * the gap stays tight around `g` and the arrow points straight at it. The loop
 * still has to CONTAIN the matrix though, so the height takes its own
 * constraint from `above`/`below` rather than riding on the gap.
 */
function iterateGeometry(
  em: number,
  seedW: number,
  varW: number,
  above: number,
  below: number,
  clearHalf: number
): IterateGeometry {
  const st = ITERATE_EM.stroke * em;
  const aL = ITERATE_EM.arrowLen * em;
  const aW = ITERATE_EM.arrowHalfWidth * em;
  const gap = Math.max(
    ITERATE_EM.gap * em,
    2 * clearHalf + ITERATE_EM.gapPad * em
  );
  const padR = ITERATE_EM.padRight * em;
  let r = ITERATE_EM.radius * em;

  // --- horizontal: g straddles the loop's left edge ---
  const textLeft = st / 2; // nominal left edge of the seed text (start of g)
  const xL = textLeft + varW / 2; // loop's left edge = centre of g
  // seedOffsetX nudges the TEXT only — the left edge, and so the arrow, stay
  // put; the right edge follows the text so padRight is preserved
  const seedLeft = textLeft + ITERATE_EM.seedOffsetX * em;
  const x1 = Math.max(seedLeft + seedW + padR, xL + 2 * r); // right edge
  const W = x1 + st / 2;

  // --- vertical: from the loop alone; only geometric bounds ---
  // The loop must both (a) leave room for the arrow above the gap, and (b)
  // contain the whole seed — which for `g=[matrix]` is much taller than the gap.
  // The seed's variable sits at roughly H/2 + these two offsets, so requiring
  // its extents to stay inside the stroke (plus seedPadY of clearance, or a
  // tall matrix ends up touching the loop) gives the second bound directly.
  const off = (ITERATE_EM.gapCentreOffset + ITERATE_EM.textOffset) * em;
  const padY = ITERATE_EM.seedPadY * em;
  const minH = Math.max(
    st + 2 * r + aL + gap,
    st + 2 * padY + 2 * Math.max(above - off, below + off)
  );
  const H = Math.max(ITERATE_EM.height * em, minH);
  r = Math.min(r, H / 2, (x1 - xL) / 2);

  const y0 = st / 2;
  const y1 = H - st / 2;

  const meetMin = st / 2 + r + aL + gap / 2;
  const meetMax = H - st / 2 - r - gap / 2;
  const meetY = Math.max(
    meetMin,
    Math.min(meetMax, H / 2 + ITERATE_EM.gapCentreOffset * em)
  );

  // the gap opens symmetrically about meetY; gap 0 => tip touches line base
  const arrowTipY = meetY - gap / 2;
  const lowerTopY = meetY + gap / 2;
  const arrowBaseY = arrowTipY - aL;

  // One continuous open stroke: up the lower-left, clockwise around, then DOWN
  // the upper-left to the arrow's base. Quadratic corners (control point at the
  // true vertex) round cleanly regardless of winding.
  const outline = [
    'M',
    xL,
    lowerTopY,
    'L',
    xL,
    y1 - r,
    'Q',
    xL,
    y1,
    xL + r,
    y1,
    'L',
    x1 - r,
    y1,
    'Q',
    x1,
    y1,
    x1,
    y1 - r,
    'L',
    x1,
    y0 + r,
    'Q',
    x1,
    y0,
    x1 - r,
    y0,
    'L',
    xL + r,
    y0,
    'Q',
    xL,
    y0,
    xL,
    y0 + r,
    'L',
    xL,
    arrowBaseY,
  ].join(' ');

  // downward arrowhead: tip points at g, base joins the upper-left line
  const head = [
    'M',
    xL,
    arrowTipY,
    'L',
    xL - aW,
    arrowBaseY,
    'L',
    xL + aW,
    arrowBaseY,
    'Z',
  ].join(' ');

  return {
    W,
    H,
    outline,
    head,
    strokeWidth: st,
    seedLeft,
    // place the seed's box so its VARIABLE lands on the anchor
    seedTop: meetY + ITERATE_EM.textOffset * em - above,
  };
}

/**
 * Measure the seed's variable name — everything left of the first '='.
 * Width comes from the DOM so kerning is accounted for; `centreY` is the
 * vertical centre of the FIRST glyph, which is what the arrow points at.
 * Returns null when the seed is empty or not yet laid out.
 */
function iterateVarMetrics(
  seed: MQNode,
  seedLeft: number
): {
  width: number;
  centreY: number;
  halfHeight: number;
  isVariable: boolean;
} | null {
  const first = seed.getEnd(L);
  if (!first) return null;
  const firstEl = first.domFrag().firstElement();
  if (!firstEl) return null;
  const firstRect = firstEl.getBoundingClientRect();

  let width = 0;
  let node = seed.getEnd(L);
  while (node) {
    if (node.ctrlSeq === '=') {
      const el = node.domFrag().firstElement();
      if (el) width = el.getBoundingClientRect().left - seedLeft;
      break;
    }
    node = node[R] as MQNode;
  }

  return {
    width,
    centreY: firstRect.top + firstRect.height / 2,
    halfHeight: firstRect.height / 2,
    // Variable covers Latin letters and Greek; when the seed opens with one,
    // only that glyph crosses the loop's left edge — whatever follows the '='
    // sits in the interior and never touches the line.
    isVariable: first instanceof Variable,
  };
}

class IterateNotation extends MathCommand {
  constructor() {
    super();

    this.ariaLabel = 'iterate';
    const domView = new DOMView(3, (blocks) =>
      h('span', { class: 'mq-iterate mq-non-leaf' }, [
        h('span', { class: 'mq-to' }, [h.block('span', {}, blocks[2])]),
        h('span', { class: 'mq-iterate-loop' }, [
          h('svg', { class: 'mq-iterate-glyph' }, [
            h('path', { class: 'mq-iterate-outline' }),
            h('path', { class: 'mq-iterate-head' }),
          ]),
          // zero-width strut: gives the loop an in-flow line box so the
          // operator's baseline is pinned to the loop's bottom rather than
          // falling through to the upper limit (which top-aligns the whole
          // operator and moves as the limit's content changes)
          h('span', { class: 'mq-iterate-strut' }),
          h.block('span', { class: 'mq-iterate-seed' }, blocks[0]),
        ]),
        h('span', { class: 'mq-from' }, [h.block('span', {}, blocks[1])]),
      ])
    );

    MQSymbol.prototype.setCtrlSeqHtmlTextAndMathspeak.call(
      this,
      '\\iterate',
      domView
    );
  }

  // [seed, lower, upper] — blocks are always present once the command is built
  private parts(): [MathBlock, MathBlock, MathBlock] {
    const blocks = this.blocks as MathBlock[];
    return [
      blocks[0] as MathBlock,
      blocks[1] as MathBlock,
      blocks[2] as MathBlock,
    ];
  }

  // Re-measure the seed and redraw the loop. MathQuill runs this after every
  // edit (postOrder + bubble, see MathCommand.finalizeInsert).
  reflow() {
    const root = this.domFrag().oneElement();
    const svg = root.querySelector('.mq-iterate-glyph') as SVGSVGElement | null;
    const loopEl = root.querySelector('.mq-iterate-loop') as HTMLElement | null;
    const seedEl = root.querySelector('.mq-iterate-seed') as HTMLElement | null;
    if (!svg || !loopEl || !seedEl) return;

    const outlineEl = svg.querySelector('.mq-iterate-outline');
    const headEl = svg.querySelector('.mq-iterate-head');
    if (!outlineEl || !headEl) return;

    const em = parseFloat(window.getComputedStyle(loopEl).fontSize) || 16;
    const seedRect = seedEl.getBoundingClientRect();
    const seedW = seedRect.width;

    const v = iterateVarMetrics(this.getEnd(L), seedRect.left);
    // fall back to the seed's box centre when there is no variable to anchor on
    const centreY = v ? v.centreY : seedRect.top + seedRect.height / 2;
    const varW = v && v.width > 0 ? Math.min(v.width, seedW) : seedW;
    const above = centreY - seedRect.top;
    const below = seedRect.bottom - centreY;
    // A seed opening with a variable only puts that one glyph across the left
    // edge; anything else (a bare matrix, say) crosses it whole.
    const clearHalf = v && v.isVariable ? v.halfHeight : Math.max(above, below);

    const g = iterateGeometry(em, seedW, varW, above, below, clearHalf);

    svg.setAttribute('width', String(g.W));
    svg.setAttribute('height', String(g.H));
    svg.setAttribute('viewBox', '0 0 ' + g.W + ' ' + g.H);
    outlineEl.setAttribute('d', g.outline);
    outlineEl.setAttribute('stroke-width', String(g.strokeWidth));
    headEl.setAttribute('d', g.head);

    loopEl.style.width = g.W + 'px';
    loopEl.style.height = g.H + 'px';
    seedEl.style.left = g.seedLeft + 'px';
    seedEl.style.top = g.seedTop + 'px';

    // Limit offsets. These sit outside the loop, so they don't disturb the
    // baseline (which the strut pins to the loop's bottom edge).
    const toEl = root.querySelector('.mq-to') as HTMLElement | null;
    const fromEl = root.querySelector('.mq-from') as HTMLElement | null;
    if (toEl) toEl.style.marginBottom = ITERATE_EM.upperOffset * em + 'px';
    if (fromEl) fromEl.style.marginTop = ITERATE_EM.lowerOffset * em + 'px';

    // The strut pins the baseline to the loop's bottom edge, so raising it by
    // (axis - H/2) puts the loop's CENTRE on the math axis. Recomputed from the
    // measured H every reflow, so it stays correct when the loop stretches.
    (root as HTMLElement).style.verticalAlign =
      ITERATE_EM.axisHeight * em - g.H / 2 + 'px';

    // Keep the trailing body off the loop's right edge.
    (root as HTMLElement).style.marginRight =
      ITERATE_EM.trailingGap * em + 'px';
  }

  latex() {
    function wrap(latex: string) {
      return '{' + (latex || ' ') + '}';
    }
    const [seed, lower, upper] = this.parts();
    return (
      '\\iterate' +
      wrap(seed.latex()) +
      '_' +
      wrap(lower.latex()) +
      '^' +
      wrap(upper.latex())
    );
  }

  mathspeak() {
    const [seed, lower, upper] = this.parts();
    return (
      'Start iterate with ' +
      seed.mathspeak() +
      ' from ' +
      lower.mathspeak() +
      ' to ' +
      upper.mathspeak() +
      ', end iterate, '
    );
  }

  parser() {
    const string = Parser.string;
    const optWhitespace = Parser.optWhitespace;
    const succeed = Parser.succeed;
    const block = latexMathParser.block;

    const self = this;
    const blocks = (self.blocks = [
      new MathBlock(),
      new MathBlock(),
      new MathBlock(),
    ]);
    for (let i = 0; i < blocks.length; i += 1) {
      blocks[i].adopt(self, self.getEnd(R), 0);
    }

    // the seed group first, then the limits in either order
    return optWhitespace
      .then(block)
      .then(function (seed) {
        seed.children().adopt(blocks[0], blocks[0].getEnd(R), 0);
        return optWhitespace
          .then(string('_').or(string('^')))
          .then(function (supOrSub) {
            const child = blocks[supOrSub === '_' ? 1 : 2];
            return block.then(function (b) {
              b.children().adopt(child, child.getEnd(R), 0);
              return succeed(self);
            });
          })
          .many()
          .result(self);
      })
      .result(self);
  }

  finalizeTree() {
    const [seed, lower, upper] = this.parts();

    seed.ariaLabel = 'recursion variable';
    lower.ariaLabel = 'lower bound';
    upper.ariaLabel = 'upper bound';

    // vertical chain: upper <-> seed <-> lower
    this.upInto = upper;
    this.downInto = lower;
    upper.downOutOf = seed;
    seed.upOutOf = upper;
    seed.downOutOf = lower;
    lower.upOutOf = seed;
  }
}

LatexCmds.iterate = IterateNotation;
