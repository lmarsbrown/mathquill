/*********************************************************
 * The publicly exposed MathQuill API.
 ********************************************************/

type KIND_OF_MQ = 'StaticMath' | 'MathField' | 'InnerMathField' | 'TextField';

/** MathQuill instance fields/methods that are internal, not exposed in the public type defs. */
interface InternalMathQuillInstance {
  __controller: Controller;
  __options: CursorOptions;
  id: number;
  data: { [key: string]: any };
  mathquillify(classNames: string): void;
  __mathquillify(
    opts: ConfigOptions,
    _interfaceVersion: number
  ): IBaseMathQuill;
  config(opts: ConfigOptions): IBaseMathQuill;
}

interface IBaseMathQuill extends BaseMathQuill, InternalMathQuillInstance {}

interface IBaseMathQuillClass {
  new (ctrlr: Controller): IBaseMathQuill;
  RootBlock: typeof MathBlock;
}

interface IEditableField extends EditableMathQuill, InternalMathQuillInstance {}

interface IEditableFieldClass {
  new (ctrlr: Controller): IEditableField;
  RootBlock: typeof MathBlock;
}

interface APIClasses {
  StaticMath?: IBaseMathQuillClass;
  MathField?: IEditableFieldClass;
  InnerMathField?: IEditableFieldClass;
  TextField?: IEditableFieldClass;
  AbstractMathQuill: IBaseMathQuillClass;
  EditableField: IEditableFieldClass;
}

type APIClassBuilders = {
  StaticMath?: (APIClasses: APIClasses) => IBaseMathQuillClass;
  MathField?: (APIClasses: APIClasses) => IEditableFieldClass;
  InnerMathField?: (APIClasses: APIClasses) => IEditableFieldClass;
  TextField?: (APIClasses: APIClasses) => IEditableFieldClass;
};

var API: APIClassBuilders = {};

var EMBEDS: Record<string, (data: EmbedOptionsData) => EmbedOptions> = {};

const processedOptions = {
  handlers: true,
  autoCommands: true,
  quietEmptyDelimiters: true,
  autoParenthesizedFunctions: true,
  autoOperatorNames: true,
  leftRightIntoCmdGoes: true,
  maxDepth: true,
};
type ProcessedOption = keyof typeof processedOptions;

/** Map of functions transforming client-provided config options to the internal representation (i.e. property of the Options class) */
type OptionProcessors = Partial<{
  [K in ProcessedOption]: (optionValue: ConfigOptions[K]) => CursorOptions[K];
}>;

const baseOptionProcessors: OptionProcessors = {};

type AutoDict = {
  _maxLength?: number;
  [id: string]: any;
};

type SubstituteKeyboardEvents = (
  el: $,
  controller: Controller
) => {
  select: (text: string) => void;
};

class Options {
  constructor(public version: 1 | 2 | 3) {}

  ignoreNextMousedown: (_el: MouseEvent) => boolean;
  substituteTextarea: () => HTMLElement;
  /** Only used in interface versions 1 and 2. */
  substituteKeyboardEvents: SubstituteKeyboardEvents;

  restrictMismatchedBrackets?: boolean;
  typingSlashCreatesNewFraction?: boolean;
  charsThatBreakOutOfSupSub: string;
  sumStartsWithNEquals?: boolean;
  autoSubscriptNumerals?: boolean;
  supSubsRequireOperand?: boolean;
  spaceBehavesLikeTab?: boolean;
  typingAsteriskWritesTimesSymbol?: boolean;
  typingSlashWritesDivisionSymbol: boolean;
  typingPercentWritesPercentOf?: boolean;
  resetCursorOnBlur?: boolean | undefined;
  leftRightIntoCmdGoes?: 'up' | 'down';
  enableDigitGrouping?: boolean;
  mouseEvents?: boolean;
  maxDepth?: number;
  disableCopyPaste?: boolean;
  statelessClipboard?: boolean;
  onPaste?: () => void;
  onCut?: () => void;
  overrideTypedText?: (text: string) => void;
  overrideKeystroke: (key: string, event: KeyboardEvent) => void;
  autoOperatorNames: AutoDict;
  autoCommands: AutoDict;
  autoParenthesizedFunctions: AutoDict;
  quietEmptyDelimiters: { [id: string]: any };
  disableAutoSubstitutionInSubscripts?: boolean;
  matrixCommaSeparators?: boolean;
  handlers?: {
    fns: HandlerOptions;
    APIClasses: APIClasses;
  };
  scrollAnimationDuration?: number;

  jQuery: $ | undefined;
  assertJquery() {
    pray('Interface versions > 2 do not depend on JQuery', this.version <= 2);
    pray('JQuery is set for interface v < 3', this.jQuery);
    return this.jQuery;
  }
}

class Progenote {}

/**
 * Interface Versioning (#459, #495) to allow us to virtually guarantee
 * backcompat. v0.10.x introduces it, so for now, don't completely break the
 * API for people who don't know about it, just complain with console.warn().
 *
 * The methods are shimmed in outro.js so that MQ.MathField.prototype etc can
 * be accessed.
 */
var insistOnInterVer = function () {
  if (window.console)
    console.warn(
      'You are using the MathQuill API without specifying an interface version, ' +
        'which will fail in v1.0.0. Easiest fix is to do the following before ' +
        'doing anything else:\n' +
        '\n' +
        '    MathQuill = MathQuill.getInterface(1);\n' +
        '    // now MathQuill.MathField() works like it used to\n' +
        '\n' +
        'See also the "`dev` branch (2014–2015) → v0.10.0 Migration Guide" at\n' +
        '  https://github.com/mathquill/mathquill/wiki/%60dev%60-branch-(2014%E2%80%932015)-%E2%86%92-v0.10.0-Migration-Guide'
    );
};
// globally exported API object

let MQ1: any;
function MathQuill(el: HTMLElement) {
  insistOnInterVer();
  if (!MQ1) {
    MQ1 = getInterface(1);
  }
  return MQ1(el);
}

MathQuill.prototype = Progenote.prototype;
MathQuill.VERSION = '{VERSION}';
MathQuill.interfaceVersion = function (v: number) {
  // shim for #459-era interface versioning (ended with #495)
  if (v !== 1) throw 'Only interface version 1 supported. You specified: ' + v;
  insistOnInterVer = function () {
    if (window.console)
      console.warn(
        'You called MathQuill.interfaceVersion(1); to specify the interface ' +
          'version, which will fail in v1.0.0. You can fix this easily by doing ' +
          'this before doing anything else:\n' +
          '\n' +
          '    MathQuill = MathQuill.getInterface(1);\n' +
          '    // now MathQuill.MathField() works like it used to\n' +
          '\n' +
          'See also the "`dev` branch (2014–2015) → v0.10.0 Migration Guide" at\n' +
          '  https://github.com/mathquill/mathquill/wiki/%60dev%60-branch-(2014%E2%80%932015)-%E2%86%92-v0.10.0-Migration-Guide'
      );
  };
  insistOnInterVer();
  return MathQuill;
};
MathQuill.getInterface = getInterface;

var MIN = (getInterface.MIN = 1),
  MAX = (getInterface.MAX = 3);

function getInterface(v: 1): MathQuill.v1.API;
function getInterface(v: 2): MathQuill.v1.API;
function getInterface(v: 3): MathQuill.v3.API;
function getInterface(v: number): MathQuill.v3.API | MathQuill.v1.API {
  if (v !== 1 && v !== 2 && v !== 3)
    throw (
      'Only interface versions between ' +
      MIN +
      ' and ' +
      MAX +
      ' supported. You specified: ' +
      v
    );

  const version = v;

  if (version < 3) {
    const jQuery = (window as any).jQuery;
    if (!jQuery)
      throw `MathQuill interface version ${version} requires jQuery 1.5.2+ to be loaded first`;
    Options.prototype.jQuery = jQuery;
  }

  const optionProcessors: OptionProcessors = {
    ...baseOptionProcessors,
    handlers: (handlers) => ({
      // casting to the v3 version of this type
      fns: (handlers as HandlerOptions) || {},
      APIClasses,
    }),
  };

  function config(currentOptions: CursorOptions, newOptions: ConfigOptions) {
    for (const name in newOptions) {
      if (newOptions.hasOwnProperty(name)) {
        if (name === 'substituteKeyboardEvents' && version >= 3) {
          throw new Error(
            [
              "As of interface version 3, the 'substituteKeyboardEvents'",
              "option is no longer supported. Use 'overrideTypedText' and",
              "'overrideKeystroke' instead.",
            ].join(' ')
          );
        }
        var value = (newOptions as any)[name]; // TODO - think about typing this better
        var processor = (optionProcessors as any)[name]; // TODO - validate option processors better
        (currentOptions as any)[name] = processor ? processor(value) : value; // TODO - think about typing better
      }
    }
  }

  const BaseOptions =
    version < 3 ? Options : class BaseOptions extends Options {};

  abstract class AbstractMathQuill extends Progenote implements IBaseMathQuill {
    __controller: Controller;
    __options: CursorOptions;
    id: number;
    data: ControllerData;
    abstract revert(): HTMLElement;

    constructor(ctrlr: Controller) {
      super();
      this.__controller = ctrlr;
      this.__options = ctrlr.options;
      this.id = ctrlr.id;
      this.data = ctrlr.data;
    }

    abstract __mathquillify(
      opts: ConfigOptions,
      _interfaceVersion: number
    ): IBaseMathQuill;

    mathquillify(classNames: string) {
      var ctrlr = this.__controller,
        root = ctrlr.root,
        el = ctrlr.container;
      ctrlr.createTextarea();

      var contents = domFrag(el).addClass(classNames).children().detach();

      root.setDOM(
        domFrag(h('span', { class: 'mq-root-block', 'aria-hidden': true }))
          .appendTo(el)
          .oneElement()
      );
      NodeBase.linkElementByBlockNode(root.domFrag().oneElement(), root);
      this.latex(contents.text());

      this.revert = function () {
        ctrlr.removeMouseEventListener();
        domFrag(el)
          .removeClass('mq-editable-field mq-math-mode mq-text-mode')
          .empty()
          .append(contents);
        return version < 3 ? (this.__options.assertJquery()(el) as any) : el;
      };
    }

    setAriaLabel(ariaLabel: string) {
      this.__controller.setAriaLabel(ariaLabel);
      return this;
    }
    getAriaLabel() {
      return this.__controller.getAriaLabel();
    }
    config(opts: ConfigOptions) {
      config(this.__options, opts);
      return this;
    }
    el() {
      return this.__controller.container;
    }
    text() {
      return this.__controller.exportText();
    }
    mathspeak() {
      return this.__controller.exportMathSpeak();
    }
    latex(latex: unknown): typeof this;
    latex(): string;
    latex(latex?: unknown) {
      if (arguments.length > 0) {
        this.__controller.renderLatexMath(latex);
        const cursor = this.__controller.cursor;
        if (this.__controller.blurred) cursor.hide().parent.blur(cursor);
        return this;
      }
      return this.__controller.exportLatex();
    }

    html() {
      return this.__controller.root
        .domFrag()
        .oneElement()
        .innerHTML.replace(/ jQuery\d+="(?:\d+|null)"/g, '') // TODO remove when jQuery is completely gone
        .replace(/ mathquill-(?:command|block)-id="?\d+"?/g, '')
        .replace(/<span class="?mq-cursor( mq-blink)?"?>.?<\/span>/i, '')
        .replace(/ mq-hasCursor|mq-hasCursor ?/, '')
        .replace(/ class=(""|(?= |>))/g, '');
    }
    reflow() {
      this.__controller.root.postOrder(function (node) {
        node.reflow();
      });
      return this;
    }
  }

  /**
   * Find the index just past the '}' that closes a group opened at
   * `latex[openIdx ... openIdx+prefixLen-1]` (the prefix being e.g.
   * "\mathbf{"). Respects nested braces.
   * @param latex the LaTeX string
   * @param contentStart index of the first char inside the group (just
   *   after the opening brace)
   * @returns index just past the matching '}', or -1 if braces are unbalanced
   */
  function indexPastGroup(latex: string, contentStart: number): number {
    let depth = 1;
    for (let i = contentStart; i < latex.length; i++) {
      const ch = latex[i];
      if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) return i + 1;
      }
    }
    return -1; // unbalanced
  }

  /**
   * Remove every `<openTok>...}` wrapper from a LaTeX string, returning the
   * plain (unwrapped) inner content. Repeats until none remain so nested
   * wrappers are fully flattened.
   * @param latex source LaTeX
   * @param openTok the wrapper's control sequence + opening brace, e.g. "\\mathbf{"
   * @returns LaTeX with all `<openTok>...}` wrappers unwrapped
   */
  function stripWrapper(latex: string, openTok: string): string {
    let idx = latex.indexOf(openTok);
    while (idx !== -1) {
      const contentStart = idx + openTok.length;
      const end = indexPastGroup(latex, contentStart);
      if (end === -1) {
        console.warn(
          'MathQuill toggleWrap: unbalanced ' + openTok + ' braces in',
          latex
        );
        break;
      }
      // Replace `<openTok>INNER}` with `INNER` (end-1 is the closing brace).
      const inner = latex.slice(contentStart, end - 1);
      latex = latex.slice(0, idx) + inner + latex.slice(end);
      idx = latex.indexOf(openTok);
    }
    return latex;
  }

  /**
   * Test whether a LaTeX string is composed entirely of one or more
   * consecutive `<openTok>...}` groups with no other (non-whitespace)
   * content. Used to decide whether a selection is fully wrapped.
   * @param latex source LaTeX (typically a selection's joined latex)
   * @param openTok the wrapper's control sequence + opening brace, e.g. "\\mathbf{"
   * @returns true if every part of the selection is wrapped
   */
  function isFullyWrapped(latex: string, openTok: string): boolean {
    let i = 0;
    let matched = 0;
    while (i < latex.length) {
      if (latex[i] === ' ') {
        i++;
        continue;
      }
      if (latex.slice(i, i + openTok.length) !== openTok) return false;
      const end = indexPastGroup(latex, i + openTok.length);
      if (end === -1) return false; // unbalanced → treat as not-fully-bold
      i = end;
      matched++;
    }
    return matched > 0;
  }

  /**
   * Walk up from `innerBlock`'s parent looking for an enclosing `\mathbf` (or
   * other wrapper with `ctrlSeq`), allowing only `Bracket` nodes on the path
   * between. Used by `toggleWrap` to detect the "selection inside `\left…
   * \right` inside `\mathbf`" case that the flat scenario-A path can't handle.
   *
   * Returns `{ M, brackets }` with `brackets` ordered outer→inner (the bracket
   * immediately inside `M` first, the bracket immediately containing
   * `innerBlock` last). Returns `null` if no qualifying `\mathbf` ancestor
   * exists or if the path crosses an unsupported node (e.g. a fraction).
   *
   * @param innerBlock the block directly containing the selection
   * @param ctrlSeq    the wrapper's control sequence (`'\\mathbf'`)
   */
  function gatherDelimPath(
    innerBlock: MQNode,
    ctrlSeq: string
  ): { M: MQNode; brackets: MQNode[] } | null {
    const brackets: MQNode[] = [];
    let cmd: MQNode | 0 | undefined = innerBlock.parent;
    while (cmd) {
      if (cmd.ctrlSeq === ctrlSeq) {
        // Continue climbing past this mathbf to find any *outer* mathbf; if
        // present, the brackets between this one and the outer one would also
        // need pushing. For v1 we only normalise the innermost-enclosing
        // mathbf; an outer mathbf with no further brackets on the path is
        // harmless (it still wraps everything), and an outer mathbf *with*
        // brackets on the path is a rare nested case left for a follow-up.
        return { M: cmd, brackets };
      }
      if (!(cmd instanceof Bracket)) return null;
      brackets.unshift(cmd);
      const parentBlock: MQNode | 0 | undefined = cmd.parent;
      if (!parentBlock) return null;
      cmd = parentBlock.parent;
    }
    return null;
  }

  /**
   * Build the normalised LaTeX that replaces an outermost `\mathbf` ancestor
   * `M` so the rewrite invariant holds: `\mathbf` never wraps a `\left…\right`
   * pair; instead it sits around runs of content *inside* each delimiter. The
   * selection (which is being unbolded) is emitted unwrapped between two
   * marker tokens so the caller can re-establish it after `writeLatex`.
   *
   * Output shape, unrolling from outermost to innermost:
   *   [`\mathbf{leftSibs_M}`]  `\left(` [`\mathbf{leftSibs_B1}`] `\left(` …
   *      [`\mathbf{leftSibs_inner}`]  `\mqSelL` <sel> `\mqSelR`
   *      [`\mathbf{rightSibs_inner}`] … `\right)` [`\mathbf{rightSibs_B1}`]
   *      `\right)` [`\mathbf{rightSibs_M}`]
   * Bracketed `[…]` parts are omitted when the corresponding sibling run is
   * empty so we don't produce empty `\mathbf{}` wrappers.
   *
   * @param M         the outermost `\mathbf` ancestor (a Style node)
   * @param brackets  bracket path outer→inner from `gatherDelimPath`
   * @param selLeft   leftmost selected sibling within the innermost block
   * @param selRight  rightmost selected sibling within the innermost block
   * @param openTok   `ctrlSeq + '{'` (e.g. `'\\mathbf{'`)
   */
  function buildNormalizedMathbfLatex(
    M: MQNode,
    brackets: MQNode[],
    selLeft: MQNode,
    selRight: MQNode,
    openTok: string
  ): string {
    // Wraps a sibling-run's latex in the wrapper, or returns '' if the run is
    // empty (avoids \mathbf{} which would be a no-op but uglier in saved latex).
    const wrap = (s: string) => (s ? openTok + s + '}' : '');

    // Emit the latex for a single level of the recursion. `block` is the
    // MathBlock we're currently inside; `depth` is the index into `brackets`
    // of the next bracket to descend through (or === brackets.length when at
    // innerBlock).
    const emit = (block: MQNode, depth: number): string => {
      if (depth === brackets.length) {
        // Leaf: emit left-of-sel as bold, marker + unwrapped sel + marker,
        // right-of-sel as bold.
        let leftLat = '';
        for (let n = block.getEnd(L); n && n !== selLeft; n = n[R]!)
          leftLat += n.latex();
        let rightLat = '';
        for (let n = selRight[R]; n; n = n[R]!) rightLat += n.latex();
        let selLat = '';
        for (let n: MQNode | 0 = selLeft; n; n = n[R]!) {
          selLat += n.latex();
          if (n === selRight) break;
        }
        // Strip any inner \mathbf from the selection content — the user is
        // unbolding, and stale inner wrappers would defeat that.
        const selUnwrapped = stripWrapper(selLat, openTok);
        // Trailing space after each marker terminates the LaTeX parser's
        // greedy [a-z]+ command-name match — without it `\mqSelLe` would be
        // read as one unknown command name instead of marker + `e`.
        return (
          wrap(leftLat) +
          '\\mqSelL ' +
          selUnwrapped +
          '\\mqSelR ' +
          wrap(rightLat)
        );
      }
      const br = brackets[depth] as any; // Bracket — has `.sides[L|R].ctrlSeq`
      let leftLat = '';
      for (let n = block.getEnd(L); n && n !== br; n = n[R]!)
        leftLat += n.latex();
      let rightLat = '';
      for (let n = br[R]; n; n = n[R]!) rightLat += n.latex();
      const open = '\\left' + br.sides[L].ctrlSeq;
      const close = '\\right' + br.sides[R].ctrlSeq;
      // Bracket always has an inner block (its single child block), so
      // getEnd(L) is non-zero; assert away the NodeRef-vs-MQNode union.
      const inner = emit(br.getEnd(L) as MQNode, depth + 1);
      return wrap(leftLat) + open + inner + close + wrap(rightLat);
    };

    // M is a Style (\mathbf) node with one block, so getEnd(L) is non-zero.
    return emit(M.getEnd(L) as MQNode, 0);
  }

  /**
   * Depth-first search for a descendant of `root` with the given `ctrlSeq`.
   * Used to locate marker nodes inserted during `\mathbf` normalisation.
   * @returns the first matching node, or `null` if none found
   */
  function findDescendantByCtrlSeq(
    root: MQNode,
    ctrlSeq: string
  ): MQNode | null {
    let found: MQNode | null = null;
    const walk = (node: MQNode): boolean => {
      if (node.ctrlSeq === ctrlSeq) {
        found = node;
        return false;
      }
      const leftEnd = node.getEnd(L);
      const rightEnd = node.getEnd(R);
      if (leftEnd) {
        let child: MQNode | 0 = leftEnd;
        while (child) {
          if (!walk(child)) return false;
          if (child === rightEnd) break;
          child = child[R]!;
        }
      }
      return found === null;
    };
    walk(root);
    return found;
  }

  abstract class EditableField
    extends AbstractMathQuill
    implements IEditableField
  {
    mathquillify(classNames: string) {
      super.mathquillify(classNames);
      this.__controller.editable = true;
      this.__controller.addMouseEventListener();
      this.__controller.editablesTextareaEvents();
      return this;
    }
    focus() {
      this.__controller.getTextareaOrThrow().focus();
      this.__controller.scrollHoriz();
      return this;
    }
    blur() {
      this.__controller.getTextareaOrThrow().blur();
      return this;
    }
    write(latex: string) {
      this.__controller.writeLatex(latex);
      this.__controller.scrollHoriz();
      const cursor = this.__controller.cursor;
      if (this.__controller.blurred) cursor.hide().parent.blur(cursor);
      return this;
    }
    empty() {
      var root = this.__controller.root,
        cursor = this.__controller.cursor;

      root.setEnds({ [L]: 0, [R]: 0 });
      root.domFrag().empty();
      delete cursor.selection;
      cursor.insAtRightEnd(root);
      return this;
    }
    cmd(cmd: string) {
      var ctrlr = this.__controller.notify(undefined),
        cursor = ctrlr.cursor;
      if (/^\\[a-z]+$/i.test(cmd) && !cursor.isTooDeep()) {
        cmd = cmd.slice(1);
        var klass = (LatexCmds as LatexCmdsAny)[cmd];
        var node;
        if (klass) {
          if (klass.constructor) {
            node = new klass(cmd);
          } else {
            node = klass(cmd);
          }
          if (cursor.selection) node.replaces(cursor.replaceSelection());
          node.createLeftOf(cursor.show());
        } /* TODO: API needs better error reporting */ else;
      } else cursor.parent.write(cursor, cmd);

      ctrlr.scrollHoriz();
      if (ctrlr.blurred) cursor.hide().parent.blur(cursor);
      return this;
    }
    select() {
      this.__controller.selectAll();
      return this;
    }
    clearSelection() {
      this.__controller.cursor.clearSelection();
      return this;
    }

    /**
     * Toggle a single-block wrapper command (e.g. `\mathbf` or `\hat`) on the
     * current selection. Generic over the wrapper so bold, hat, etc. share one
     * implementation; `toggleBold` / `toggleHat` delegate here.
     * - No selection: toggle the wrapper "mode" at the caret (enter/exit an
     *   empty wrapper block so the next typing is wrapped/unwrapped).
     * - Selection not wrapped, or only partly: wrap the whole selection in a
     *   single `<ctrlSeq>{...}` (any nested same-wrapper is flattened first).
     * - Selection fully wrapped: remove the wrapper. This covers a selection
     *   that *is* one or more wrapper nodes, and a selection made from inside a
     *   wrapper block (which is split so only the selected part unwraps).
     * The affected content is re-selected so repeated toggles flip it back.
     * @param ctrlSeq the wrapper's control sequence, e.g. `\\mathbf` or `\\hat`
     * @param makeNode factory returning a fresh wrapper node (used in caret mode)
     * @returns this (for chaining)
     */
    toggleWrap(ctrlSeq: string, makeNode: () => MQNode) {
      const ctrlr = this.__controller;
      const cursor = ctrlr.cursor;
      const sel = cursor.selection;
      const openTok = ctrlSeq + '{'; // wrapper open token, e.g. "\\mathbf{"
      if (!sel) {
        // No selection — toggle bold "mode" at the caret.
        cursor.show();
        const caretBlock = cursor.parent;
        const caretBold = caretBlock.parent;
        if (caretBold && caretBold.ctrlSeq === ctrlSeq) {
          // Caret sits inside a \mathbf block.
          if (caretBlock.isEmpty()) {
            // Empty \mathbf{} (e.g. just inserted) — remove it, leaving the
            // caret where the node was. selectChildren + deleteSelection keeps
            // the cursor pointers consistent; bubbling reflow fires 'edit'.
            cursor.insLeftOf(caretBold);
            const parentBlock = cursor.parent;
            cursor.selection = parentBlock.selectChildren(caretBold, caretBold);
            cursor.deleteSelection();
            parentBlock.bubble(function (node) {
              node.reflow();
              return undefined;
            });
          } else {
            // Non-empty bold — exit it so further typing is unbolded.
            cursor.insRightOf(caretBold);
          }
        } else {
          // Not in a \mathbf — insert an empty one with the caret inside so the
          // user can start typing bold. createLeftOf's placeCursor lands the
          // caret in the empty block; its finalizeInsert bubbles reflow → 'edit'.
          const wrapNode = makeNode();
          wrapNode.createLeftOf(cursor);
        }
        ctrlr.scrollHoriz();
        if (ctrlr.blurred) cursor.hide().parent.blur(cursor);
        return this;
      }

      const selLeft = sel.getEnd(L);
      const selRight = sel.getEnd(R);
      const innerBlock = selLeft.parent; // common parent block of the selection
      const boldNode = innerBlock.parent; // node wrapping that block, if any

      // Scenario A: the selection lives *inside* a \mathbf block. Always an
      // unbold; if only part of the block is selected the node is split so the
      // surrounding text stays bold.
      const insideBold = !!boldNode && boldNode.ctrlSeq === ctrlSeq;

      // Scenario A': selection is inside one or more \left…\right brackets
      // that are themselves inside a \mathbf. The flat scenario-A split can't
      // express the result without producing illegal mid-delimiter latex
      // (\left and \right must be paired in the same group). \mathbf doesn't
      // visibly affect delimiters anyway, so we normalise by pushing the
      // \mathbf *inside* the brackets — that yields a tree where the
      // selection's innerBlock.parent IS a \mathbf and scenario A's logic
      // applies recursively at each delimiter level. Only applies to
      // \mathbf (\hat etc. visibly bracket their argument so the same
      // push-inside rewrite would change the user's expression).
      if (ctrlSeq === '\\mathbf' && !insideBold) {
        const path = gatherDelimPath(innerBlock, ctrlSeq);
        if (path) {
          // Build the normalised latex with marker tokens straddling the
          // (unwrapped) selection at the deepest level.
          const normalizedLatex = buildNormalizedMathbfLatex(
            path.M,
            path.brackets,
            selLeft,
            selRight,
            openTok
          );

          // Replace the outermost \mathbf ancestor M with the normalised
          // latex via the same delete-then-writeLatex pattern scenario A
          // uses (keeps DOM in sync without manual reflow plumbing).
          cursor.show();
          cursor.clearSelection();
          cursor.insLeftOf(path.M);
          const writeBlock = cursor.parent;
          cursor.selection = writeBlock.selectChildren(path.M, path.M);
          cursor.deleteSelection();
          writeBlock.writeLatex(cursor, normalizedLatex);

          // Locate the marker nodes and re-establish the selection between
          // them, then disown the markers so they never persist.
          const root = ctrlr.root;
          const markerL = findDescendantByCtrlSeq(root, '\\mqSelL');
          const markerR = findDescendantByCtrlSeq(root, '\\mqSelR');
          if (markerL && markerR && markerL.parent === markerR.parent) {
            const newInnerBlock = markerL.parent;
            // selL/selR are the new selection endpoints — the siblings just
            // *inside* of each marker. If the selection is empty (markers
            // adjacent) they'll coincide with the opposite marker; we
            // handle that below.
            const newSelL = markerL[R];
            const newSelR = markerR[L];
            const emptySel = newSelL === markerR || newSelR === markerL;
            // Remove markers from the tree + DOM. Doing this before
            // selecting means the L/R pointers we captured above are now
            // stale (markerL[R] could be the disowned node), so we cache
            // them first.
            markerL.remove();
            markerR.remove();
            if (!emptySel && newSelL && newSelR) {
              cursor.hide().selection = newInnerBlock.selectChildren(
                newSelL,
                newSelR
              );
              cursor.insRightOf(newSelR);
              cursor.selectionChanged();
            } else {
              // Empty selection — place caret where the markers were. Both
              // markers were adjacent, so cursor goes between their former
              // siblings (now adjacent in the tree).
              if (newSelL) cursor.insLeftOf(newSelL);
              else if (newSelR) cursor.insRightOf(newSelR);
              else cursor.insAtRightEnd(newInnerBlock);
            }
          } else {
            // Shouldn't happen — writeLatex inserts our markers verbatim and
            // findDescendantByCtrlSeq walks the whole tree. Warn loudly so a
            // future regression surfaces instead of silently losing the
            // selection.
            console.warn(
              'MathQuill toggleWrap: selection markers missing after \\mathbf normalisation'
            );
          }

          ctrlr.scrollHoriz();
          if (ctrlr.blurred) cursor.hide().parent.blur(cursor);
          return this;
        }
      }

      // LaTeX pieces to write back, left→right. `mid` is the (un)bolded
      // selection; left/right are bold remnants used only in the split case.
      let leftLatex = '';
      let rightLatex = '';
      let mid: string;
      let delLeft: MQNode; // left end of the node run we delete
      let delRight: MQNode; // right end of the node run we delete

      if (insideBold) {
        const boldM = boldNode as MQNode;
        if (boldM.parent && boldM.parent.ctrlSeq === ctrlSeq) {
          // Degenerate nested-bold; splitting only the inner node leaves the
          // outer bold in place. A second toggle resolves it.
          console.warn(
            'MathQuill toggleWrap: nested ' + ctrlSeq + ' encountered'
          );
        }
        delLeft = boldM;
        delRight = boldM;
        // Bold remnants to the left / right of the selection within the block.
        for (let n = innerBlock.getEnd(L); n && n !== selLeft; n = n[R])
          leftLatex += n.latex();
        for (let n = selRight[R]; n; n = n[R]) rightLatex += n.latex();
        mid = stripWrapper(sel.join('latex'), openTok);
      } else {
        delLeft = selLeft;
        delRight = selRight;
        const selLatex = sel.join('latex');
        // Fully wrapped → unwrap; otherwise wrap the whole selection as one group.
        mid = isFullyWrapped(selLatex, openTok)
          ? stripWrapper(selLatex, openTok)
          : openTok + stripWrapper(selLatex, openTok) + '}';
      }

      // Delete the run [delLeft, delRight] via a temporary selection, then
      // re-insert left→right. insLeftOf reparents the cursor to the block that
      // owns the run (the grandparent block in the split case).
      //
      // show() first: while a selection is active the cursor is hidden, which
      // detaches its DOM frag (replaced with an empty one). Without re-showing
      // it, the writeLatex insertions below — which land relative to
      // cursor.domFrag() — would be orphaned: the tree updates (so .latex() is
      // correct) but nothing renders until the field is rebuilt.
      cursor.show();
      cursor.clearSelection();
      cursor.insLeftOf(delLeft);
      const block = cursor.parent;
      cursor.selection = block.selectChildren(delLeft, delRight);
      cursor.deleteSelection(); // removes the run; cursor sits in the gap

      // Each writeLatex inserts before the cursor element, which stays at the
      // right edge — so pieces land in order. We capture the node boundaries
      // around `mid` to re-select exactly the (un)bolded part afterwards.
      if (leftLatex) block.writeLatex(cursor, openTok + leftLatex + '}');
      const beforeMid = cursor[L]; // node just left of mid (or 0 at block start)
      block.writeLatex(cursor, mid);
      const midEnd = cursor[L]; // right end of mid
      if (rightLatex) block.writeLatex(cursor, openTok + rightLatex + '}');

      const midStart = beforeMid ? beforeMid[R] : block.getEnd(L);

      // Re-select [midStart, midEnd] (mirrors the tail of Cursor::select).
      if (midStart && midEnd) {
        cursor.hide().selection = block.selectChildren(midStart, midEnd);
        cursor.insRightOf(midEnd);
        cursor.selectionChanged();
      }

      ctrlr.scrollHoriz();
      if (ctrlr.blurred) cursor.hide().parent.blur(cursor);
      return this;
    }

    /**
     * Toggle `\mathbf` bold on the current selection. See toggleWrap.
     * @returns this (for chaining)
     */
    toggleBold() {
      return this.toggleWrap(
        '\\mathbf',
        () => new Style('\\mathbf', 'b', { class: 'mq-font' }, 'Bold Font')
      );
    }

    /**
     * Toggle `\hat` accent on the current selection. See toggleWrap.
     * @returns this (for chaining)
     */
    toggleHat() {
      return this.toggleWrap(
        '\\hat',
        () => new (LatexCmds as LatexCmdsAny).hat()
      );
    }

    moveToDirEnd(dir: Direction) {
      this.__controller
        .notify('move')
        .cursor.insAtDirEnd(dir, this.__controller.root);
      return this;
    }
    moveToLeftEnd() {
      return this.moveToDirEnd(L);
    }
    moveToRightEnd() {
      return this.moveToDirEnd(R);
    }

    keystroke(keysString: string, evt?: KeyboardEvent) {
      var keys = keysString.replace(/^\s+|\s+$/g, '').split(/\s+/);
      for (var i = 0; i < keys.length; i += 1) {
        this.__controller.keystroke(keys[i], evt);
      }
      return this;
    }
    typedText(text: string) {
      for (var i = 0; i < text.length; i += 1)
        this.__controller.typedText(text.charAt(i));
      return this;
    }
    dropEmbedded(pageX: number, pageY: number, options: EmbedOptions) {
      var clientX = pageX - getScrollX();
      var clientY = pageY - getScrollY();

      var el = document.elementFromPoint(clientX, clientY);
      this.__controller.seek(el, clientX, clientY);
      var cmd = new EmbedNode().setOptions(options);
      cmd.createLeftOf(this.__controller.cursor);
    }
    setAriaPostLabel(ariaPostLabel: string, timeout?: number) {
      this.__controller.setAriaPostLabel(ariaPostLabel, timeout);
      return this;
    }
    getAriaPostLabel() {
      return this.__controller.getAriaPostLabel();
    }
    clickAt(clientX: number, clientY: number, target: HTMLElement) {
      target = target || document.elementFromPoint(clientX, clientY);
      var ctrlr = this.__controller,
        root = ctrlr.root;
      const rootElement = root.domFrag().oneElement();
      if (!rootElement.contains(target)) target = rootElement;
      ctrlr.seek(target, clientX, clientY);
      if (ctrlr.blurred) this.focus();
      return this;
    }
    ignoreNextMousedown(fn: CursorOptions['ignoreNextMousedown']) {
      this.__controller.cursor.options.ignoreNextMousedown = fn;
      return this;
    }
  }

  var APIClasses: APIClasses = {
    AbstractMathQuill,
    EditableField,
  } as unknown as APIClasses;

  pray('API.StaticMath defined', API.StaticMath);
  APIClasses.StaticMath = API.StaticMath(APIClasses);
  pray('API.MathField defined', API.MathField);
  APIClasses.MathField = API.MathField(APIClasses);
  pray('API.InnerMathField defined', API.InnerMathField);
  APIClasses.InnerMathField = API.InnerMathField(APIClasses);
  if (API.TextField) {
    APIClasses.TextField = API.TextField(APIClasses);
  }

  /**
   * Function that takes an HTML element and, if it's the root HTML element of a
   * static math or math or text field, returns an API object for it (else, null).
   *
   *   var mathfield = MQ.MathField(mathFieldSpan);
   *   assert(MQ(mathFieldSpan).id === mathfield.id);
   *   assert(MQ(mathFieldSpan).id === MQ(mathFieldSpan).id);
   *
   */
  const MQ = function (el: HTMLElement) {
    if (!el || !el.nodeType) return null; // check that `el` is a HTML element, using the
    // same technique as jQuery: https://github.com/jquery/jquery/blob/679536ee4b7a92ae64a5f58d90e9cc38c001e807/src/core/init.js#L92
    let blockElement;
    const childArray = domFrag(el).children().toElementArray();
    for (const child of childArray) {
      if (child.classList.contains('mq-root-block')) {
        blockElement = child;
        break;
      }
    }
    var blockNode = NodeBase.getNodeOfElement(blockElement) as MathBlock; // TODO - assumng it's a MathBlock
    var ctrlr = blockNode && blockNode.controller;
    const APIClass = ctrlr && APIClasses[ctrlr.KIND_OF_MQ];
    return ctrlr && APIClass ? new APIClass(ctrlr) : null;
  };

  MQ.L = L;
  MQ.R = R;

  MQ.config = function (opts: ConfigOptions) {
    config(BaseOptions.prototype, opts);
    return this;
  };

  MQ.registerEmbed = function (
    name: string,
    options: (data: EmbedOptionsData) => EmbedOptions
  ) {
    if (!/^[a-z][a-z0-9]*$/i.test(name)) {
      throw 'Embed name must start with letter and be only letters and digits';
    }
    EMBEDS[name] = options;
  };

  /*
   * Export the API functions that MathQuill-ify an HTML element into API objects
   * of each class. If the element had already been MathQuill-ified but into a
   * different kind (or it's not an HTML element), return null.
   */
  MQ.StaticMath = createEntrypoint('StaticMath', APIClasses.StaticMath);
  MQ.MathField = createEntrypoint('MathField', APIClasses.MathField!);
  MQ.InnerMathField = createEntrypoint(
    'InnerMathField',
    APIClasses.InnerMathField
  );
  if (APIClasses.TextField) {
    MQ.TextField = createEntrypoint('TextField', APIClasses.TextField);
  }

  MQ.prototype = AbstractMathQuill.prototype;
  (MQ as any).EditableField = function () {
    throw "wtf don't call me, I'm 'abstract'";
  };
  (MQ as any).EditableField.prototype = EditableField.prototype;

  if (version < 3) {
    (MQ as any).saneKeyboardEvents = defaultSubstituteKeyboardEvents;
  }

  function createEntrypoint<
    K extends keyof typeof API,
    MQClass extends IBaseMathQuillClass | IEditableFieldClass
  >(kind: K, APIClass: MQClass) {
    pray(kind + ' is defined', APIClass);

    function mqEntrypoint(el: null | undefined): null;
    function mqEntrypoint(
      el: HTMLElement,
      config?: ConfigOptions
    ): InstanceType<MQClass>;
    function mqEntrypoint(el?: HTMLElement | null, opts?: ConfigOptions) {
      if (!el || !el.nodeType) return null;
      var mq = MQ(el);
      if (mq instanceof APIClass) return mq;
      var ctrlr = new Controller(
        new APIClass.RootBlock() as ControllerRoot,
        el,
        new BaseOptions(version)
      );
      ctrlr.KIND_OF_MQ = kind;
      return new APIClass(ctrlr).__mathquillify(opts || {}, version);
    }
    mqEntrypoint.prototype = APIClass.prototype;
    return mqEntrypoint;
  }
  return MQ;
}

MathQuill.noConflict = function () {
  window.MathQuill = origMathQuill;
  return MathQuill;
};
var origMathQuill = window.MathQuill;
window.MathQuill = MathQuill;

function RootBlockMixin(_: RootBlockMixinInput) {
  _.moveOutOf = function (dir: Direction) {
    pray('controller is defined', this.controller);
    this.controller.handle('moveOutOf', dir);
  };
  _.deleteOutOf = function (dir: Direction) {
    pray('controller is defined', this.controller);
    this.controller.handle('deleteOutOf', dir);
  };
  _.selectOutOf = function (dir: Direction) {
    pray('controller is defined', this.controller);
    this.controller.handle('selectOutOf', dir);
  };
  _.upOutOf = function () {
    pray('controller is defined', this.controller);
    this.controller.handle('upOutOf');
    return undefined;
  };
  _.downOutOf = function () {
    pray('controller is defined', this.controller);
    this.controller.handle('downOutOf');
    return undefined;
  };

  _.reflow = function () {
    pray('controller is defined', this.controller);
    this.controller.handle('reflow');
    this.controller.handle('edited');
    this.controller.handle('edit');
  };
}
