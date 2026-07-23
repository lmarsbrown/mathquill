/*********************************************
 * Matrix support for MathQuill
 * Supports \begin{matrix}, \begin{pmatrix}, \begin{bmatrix}, etc.
 *
 * Controls:
 * - Left/Right arrows: move between columns
 * - Up/Down arrows: move between rows
 * - Comma (,): add a new column
 * - Enter: add a new row
 * - Backspace on empty cell in top row: delete column
 * - Backspace on empty cell in first column: delete row
 * - Backspace on empty cell otherwise: move to cell on left
 *********************************************/

// Build a stroked, non-scaling-stroke SVG delimiter for a matrix (round
// brackets). The path is a CENTRE-LINE, not a filled outline, so with
// `vector-effect: non-scaling-stroke` (see math.less .mq-matrix-delim-line)
// the stroke keeps a constant width however tall the delimiter box is
// stretched — a filled outline instead thickens its arms as it scales.
function matrixLineDelim(d: string): Element {
  return h(
    'svg',
    {
      preserveAspectRatio: 'none',
      viewBox: '0 0 11 24',
      class: 'mq-matrix-delim-line',
    },
    [h('path', { d })]
  );
}

type MatrixEnvironment =
  | 'matrix'
  | 'pmatrix'
  | 'bmatrix'
  | 'Bmatrix'
  | 'vmatrix'
  | 'Vmatrix';

const MATRIX_CONFIGS: Record<
  MatrixEnvironment,
  { leftDelim: string; rightDelim: string; ctrlSeq: string }
> = {
  matrix: { leftDelim: '', rightDelim: '', ctrlSeq: '\\begin{matrix}' },
  pmatrix: { leftDelim: '(', rightDelim: ')', ctrlSeq: '\\begin{pmatrix}' },
  bmatrix: { leftDelim: '[', rightDelim: ']', ctrlSeq: '\\begin{bmatrix}' },
  Bmatrix: { leftDelim: '{', rightDelim: '}', ctrlSeq: '\\begin{Bmatrix}' },
  vmatrix: { leftDelim: '|', rightDelim: '|', ctrlSeq: '\\begin{vmatrix}' },
  Vmatrix: { leftDelim: '\\|', rightDelim: '\\|', ctrlSeq: '\\begin{Vmatrix}' },
};

class MatrixCell extends MathBlock {
  row: number;
  col: number;

  constructor(row: number, col: number) {
    super();
    this.row = row;
    this.col = col;

    this.upOutOf = (cursor: Cursor): Cursor | undefined => {
      const matrix = this.parent as Matrix;
      if (this.row > 0) {
        cursor.insAtLeftEnd(matrix.cells[this.row - 1][this.col] as MQNode);
        return undefined;
      }
      return undefined;
    };

    this.downOutOf = (cursor: Cursor): Cursor | undefined => {
      const matrix = this.parent as Matrix;
      if (this.row < matrix.nRows - 1) {
        cursor.insAtLeftEnd(matrix.cells[this.row + 1][this.col] as MQNode);
        return undefined;
      }
      return undefined;
    };
  }

  updateCommaState() {
    if (this.isEmpty()) {
      this.domFrag().addClass('mq-matrix-cell-content-empty');
    } else {
      this.domFrag().removeClass('mq-matrix-cell-content-empty');
    }
  }

  focus() {
    super.focus();
    this.updateCommaState();
    return this;
  }

  blur(cursor: Cursor) {
    super.blur(cursor);
    this.updateCommaState();
    return this;
  }

  keystroke(key: string, e: KeyboardEvent | undefined, ctrlr: Controller) {
    const matrix = this.parent as Matrix;

    switch (key) {
      case 'Ctrl-,':
        e?.preventDefault();
        matrix.addColumn(this.col + 1, ctrlr.cursor);
        return;

      case 'Enter':
        e?.preventDefault();
        matrix.addRow(this.row + 1, ctrlr);
        return;

      case 'Tab':
        e?.preventDefault();
        if (this.col < matrix.nCols - 1) {
          ctrlr.cursor.insAtLeftEnd(
            matrix.cells[this.row][this.col + 1] as MQNode
          );
        } else {
          matrix.addColumn(this.col + 1, ctrlr.cursor);
        }
        return;

      case 'Backspace':
        if (this.isEmpty()) {
          e?.preventDefault();
          if (matrix.nRows === 1 && matrix.nCols === 1) {
            // Last cell: delete entire matrix
            const rightward = matrix[R];
            ctrlr.cursor.insLeftOf(matrix);
            matrix.remove();
            ctrlr.cursor[R] = rightward;
            ctrlr.cursor.parent.bubble(function (node: MQNode) {
              node.reflow();
              return undefined;
            });
          } else if (this.col === 0) {
            // First column: delete the row (even if it has content)
            if (matrix.nRows > 1) {
              matrix.deleteRow(this.row, ctrlr);
            }
          } else if (matrix.nCols > 1 && matrix.isColumnEmpty(this.col)) {
            // Non-first column, entire column empty: delete column
            matrix.deleteColumn(this.col, ctrlr);
          } else {
            // Otherwise just move to previous cell
            ctrlr.cursor.insAtRightEnd(
              matrix.cells[this.row][this.col - 1] as MQNode
            );
          }
          return;
        }
        // If cursor is at start of non-empty cell
        if (!ctrlr.cursor[L]) {
          e?.preventDefault();
          if (this.col === 0) {
            // First column: delete the row (even if it has content)
            if (matrix.nRows > 1) {
              matrix.deleteRow(this.row, ctrlr);
            }
          } else {
            // Otherwise move to previous cell
            ctrlr.cursor.insAtRightEnd(
              matrix.cells[this.row][this.col - 1] as MQNode
            );
          }
          return;
        }
        break;
    }

    const result = super.keystroke(key, e, ctrlr);
    this.updateCommaState();
    return result;
  }

  moveOutOf(dir: Direction, cursor: Cursor, updown?: 'up' | 'down') {
    const matrix = this.parent as Matrix;

    if (dir === L) {
      if (this.col > 0) {
        cursor.insAtRightEnd(matrix.cells[this.row][this.col - 1] as MQNode);
        return;
      }
      cursor.insLeftOf(matrix);
      return;
    } else if (dir === R) {
      if (this.col < matrix.nCols - 1) {
        cursor.insAtLeftEnd(matrix.cells[this.row][this.col + 1] as MQNode);
        return;
      }
      cursor.insRightOf(matrix);
      return;
    }

    // Fall back to default behavior
    super.moveOutOf(dir, cursor, updown);
  }

  write(cursor: Cursor, ch: string) {
    if (ch === ',') {
      const matrix = this.parent as Matrix;
      if (this.col < matrix.nCols - 1) {
        cursor.insAtLeftEnd(matrix.cells[this.row][this.col + 1] as MQNode);
      } else {
        matrix.addColumn(this.col + 1, cursor);
      }
      return;
    }
    super.write(cursor, ch);
    this.updateCommaState();
  }
}

class Matrix extends MathCommand {
  environment: MatrixEnvironment;
  cells: MatrixCell[][];
  nRows: number;
  nCols: number;
  showCommas: boolean = true;

  constructor(
    environment: MatrixEnvironment = 'pmatrix',
    rows: number = 2,
    cols: number = 2
  ) {
    super();
    this.environment = environment;
    this.nRows = rows;
    this.nCols = cols;
    this.cells = [];

    const config = MATRIX_CONFIGS[environment];
    this.ctrlSeq = config.ctrlSeq;
  }

  createLeftOf(cursor: Cursor) {
    this.showCommas = cursor.options.matrixCommaSeparators ?? true;
    super.createLeftOf(cursor);
  }

  static createDefault(environment: MatrixEnvironment) {
    return () => new Matrix(environment, 1, 1);
  }

  numBlocks() {
    return (this.nRows * this.nCols) as 1;
  }

  isColumnEmpty(col: number): boolean {
    for (let r = 0; r < this.nRows; r++) {
      if (!this.cells[r][col].isEmpty()) return false;
    }
    return true;
  }

  isRowEmpty(row: number): boolean {
    for (let c = 0; c < this.nCols; c++) {
      if (!this.cells[row][c].isEmpty()) return false;
    }
    return true;
  }

  createBlocks() {
    this.cells = [];
    this.blocks = [];

    for (let r = 0; r < this.nRows; r++) {
      this.cells[r] = [];
      for (let c = 0; c < this.nCols; c++) {
        const cell = new MatrixCell(r, c);
        this.cells[r][c] = cell;
        this.blocks.push(cell as MathBlock);
        cell.adopt(this, this.getEnd(R), 0);
      }
    }
  }

  rebuildDOM(opts?: CursorOptions) {
    const oldDOM = this.domFrag();
    this.html();
    const newEl = this.domFrag().oneElement();

    if (oldDOM && !oldDOM.isEmpty()) {
      oldDOM.replaceWith(domFrag(newEl));
    }

    this.finalizeTree();

    // Update empty state for all cells and re-finalize content with options
    for (let r = 0; r < this.nRows; r++) {
      for (let c = 0; c < this.nCols; c++) {
        const cell = this.cells[r][c];
        if (cell.isEmpty()) {
          cell.domFrag().addClass('mq-empty');
          cell.domFrag().addClass('mq-matrix-cell-content-empty');
        } else {
          cell.domFrag().removeClass('mq-empty');
          cell.domFrag().removeClass('mq-matrix-cell-content-empty');
        }
        // Re-finalize cell content with options to preserve operator names
        if (opts) {
          cell.postOrder(function (node) {
            node.finalizeTree(opts);
            return undefined;
          });
        }
      }
    }
  }

  addColumn(afterCol: number, cursor: Cursor) {
    this.nCols++;

    for (let r = 0; r < this.nRows; r++) {
      const newCell = new MatrixCell(r, afterCol);
      this.cells[r].splice(afterCol, 0, newCell);

      for (let c = afterCol + 1; c < this.nCols; c++) {
        this.cells[r][c].col = c;
      }
    }

    this.blocks = [];
    for (let r = 0; r < this.nRows; r++) {
      for (let c = 0; c < this.nCols; c++) {
        const cell = this.cells[r][c];
        this.blocks.push(cell as MathBlock);
        if (!cell.parent) {
          cell.adopt(this, this.getEnd(R), 0);
        }
      }
    }

    this.rebuildDOM(cursor.options);

    const currentRow = (cursor.parent as unknown as MatrixCell).row;
    cursor.insAtLeftEnd(this.cells[currentRow][afterCol] as MQNode);
    cursor.controller.handle('edit');
  }

  addRow(afterRow: number, ctrlr: Controller) {
    this.nRows++;

    const newRow: MatrixCell[] = [];
    for (let c = 0; c < this.nCols; c++) {
      newRow.push(new MatrixCell(afterRow, c));
    }
    this.cells.splice(afterRow, 0, newRow);

    for (let r = afterRow + 1; r < this.nRows; r++) {
      for (let c = 0; c < this.nCols; c++) {
        this.cells[r][c].row = r;
      }
    }

    this.blocks = [];
    for (let r = 0; r < this.nRows; r++) {
      for (let c = 0; c < this.nCols; c++) {
        const cell = this.cells[r][c];
        this.blocks.push(cell as MathBlock);
        if (!cell.parent) {
          cell.adopt(this, this.getEnd(R), 0);
        }
      }
    }

    this.rebuildDOM(ctrlr.options);
    ctrlr.cursor.insAtLeftEnd(this.cells[afterRow][0] as MQNode);
    ctrlr.handle('edit');
  }

  deleteColumn(col: number, ctrlr: Controller) {
    if (this.nCols <= 1) return;

    const nextCol = col > 0 ? col - 1 : 0;
    const currentRow = (ctrlr.cursor.parent as unknown as MatrixCell).row;

    for (let r = 0; r < this.nRows; r++) {
      this.cells[r][col].remove();
      this.cells[r].splice(col, 1);

      for (let c = col; c < this.nCols - 1; c++) {
        this.cells[r][c].col = c;
      }
    }

    this.nCols--;

    this.blocks = [];
    for (let r = 0; r < this.nRows; r++) {
      for (let c = 0; c < this.nCols; c++) {
        this.blocks.push(this.cells[r][c] as MathBlock);
      }
    }

    this.rebuildDOM(ctrlr.options);
    ctrlr.cursor.insAtRightEnd(this.cells[currentRow][nextCol] as MQNode);
    ctrlr.handle('edit');
  }

  deleteRow(row: number, ctrlr: Controller) {
    if (this.nRows <= 1) return;

    const nextRow = row > 0 ? row - 1 : 0;

    for (let c = 0; c < this.nCols; c++) {
      this.cells[row][c].remove();
    }
    this.cells.splice(row, 1);

    for (let r = row; r < this.nRows - 1; r++) {
      for (let c = 0; c < this.nCols; c++) {
        this.cells[r][c].row = r;
      }
    }

    this.nRows--;

    this.blocks = [];
    for (let r = 0; r < this.nRows; r++) {
      for (let c = 0; c < this.nCols; c++) {
        this.blocks.push(this.cells[r][c] as MathBlock);
      }
    }

    this.rebuildDOM(ctrlr.options);
    ctrlr.cursor.insAtRightEnd(this.cells[nextRow][this.nCols - 1] as MQNode);
    ctrlr.handle('edit');
  }

  html() {
    const config = MATRIX_CONFIGS[this.environment];

    this.domView = new DOMView(this.nRows * this.nCols, (blocks) => {
      const rows: Element[] = [];
      let blockIdx = 0;

      for (let r = 0; r < this.nRows; r++) {
        const cellElements: Element[] = [];
        for (let c = 0; c < this.nCols; c++) {
          const isFirstCol = c === 0;
          const isLastCol = c === this.nCols - 1;
          let cellClass = 'mq-matrix-cell';
          if (isFirstCol) cellClass += ' mq-matrix-cell-first';
          if (isLastCol) cellClass += ' mq-matrix-cell-last';
          if (!isLastCol) cellClass += ' mq-matrix-cell-comma';
          cellElements.push(
            h.block('span', { class: cellClass }, blocks[blockIdx++])
          );
        }
        rows.push(h('span', { class: 'mq-matrix-row' }, cellElements));
      }

      const tableContent = [h('span', { class: 'mq-matrix-table' }, rows)];

      if (config.leftDelim) {
        const leftSym = this.getDelimiterSymbol(config.leftDelim, 'left');
        tableContent.unshift(
          h(
            'span',
            { class: 'mq-matrix-delim mq-matrix-delim-left mq-scaled' },
            [leftSym]
          )
        );
      }

      if (config.rightDelim) {
        const rightSym = this.getDelimiterSymbol(config.rightDelim, 'right');
        tableContent.push(
          h(
            'span',
            { class: 'mq-matrix-delim mq-matrix-delim-right mq-scaled' },
            [rightSym]
          )
        );
      }

      return h('span', { class: 'mq-matrix mq-non-leaf' }, tableContent);
    });

    return super.html();
  }

  getDelimiterSymbol(delim: string, _side: 'left' | 'right'): Element {
    // Square brackets are drawn with CSS borders (see math.less
    // .mq-matrix-bracket) so the top/bottom arms stay a uniform thickness at
    // any matrix height; a stretched filled SVG thickens them as it scales.
    if (delim === '[')
      return h('span', {
        class: 'mq-matrix-bracket mq-matrix-bracket-lsquare',
      });
    if (delim === ']')
      return h('span', {
        class: 'mq-matrix-bracket mq-matrix-bracket-rsquare',
      });
    // Round brackets use a stroked centre-line (constant stroke width when
    // stretched, unlike the filled SVG_SYMBOLS outlines).
    if (delim === '(') return matrixLineDelim('M8 1 C3.5 7.5 3.5 16.5 8 23');
    if (delim === ')') return matrixLineDelim('M3 1 C7.5 7.5 7.5 16.5 3 23');

    // Remaining delimiters ({ } | ‖) keep the shared filled SVG glyphs.
    const svgMap: Record<string, () => Element> = {
      '{': () => SVG_SYMBOLS['{'].html(),
      '}': () => SVG_SYMBOLS['}'].html(),
      '|': () => SVG_SYMBOLS['|'].html(),
      '\\|': () => SVG_SYMBOLS['&#8741;'].html(),
    };

    if (svgMap[delim]) {
      return svgMap[delim]();
    }
    return h('span', {}, [h.text(delim)]);
  }

  latex() {
    const envName = this.environment;

    let result = `\\begin{${envName}}`;

    for (let r = 0; r < this.nRows; r++) {
      for (let c = 0; c < this.nCols; c++) {
        if (c > 0) result += ' & ';
        result += this.cells[r][c].latex() || ' ';
      }
      if (r < this.nRows - 1) result += ' \\\\ ';
    }

    result += `\\end{${envName}}`;
    return result;
  }

  text() {
    let result = '[';
    for (let r = 0; r < this.nRows; r++) {
      if (r > 0) result += '; ';
      result += '[';
      for (let c = 0; c < this.nCols; c++) {
        if (c > 0) result += ', ';
        result += this.cells[r][c].text() || '0';
      }
      result += ']';
    }
    result += ']';
    return result;
  }

  mathspeak() {
    let speech = `Start ${this.nRows} by ${this.nCols} matrix, `;
    for (let r = 0; r < this.nRows; r++) {
      speech += `Row ${r + 1}: `;
      for (let c = 0; c < this.nCols; c++) {
        if (c > 0) speech += ', ';
        speech += this.cells[r][c].mathspeak() || 'empty';
      }
      if (r < this.nRows - 1) speech += '; ';
    }
    speech += ', End matrix';
    return speech;
  }

  finalizeTree() {
    for (let r = 0; r < this.nRows; r++) {
      for (let c = 0; c < this.nCols; c++) {
        const cell = this.cells[r][c];
        cell.ariaLabel = `row ${r + 1}, column ${c + 1}`;
      }
    }

    this.upInto = this.cells[0][0] as MQNode;
    this.downInto = this.cells[this.nRows - 1][0] as MQNode;

    // Try to get showCommas from controller options (for parsed matrices)
    let node: MQNode | undefined = this.parent;
    while (node) {
      const controller = (node as MathBlock).controller;
      if (controller) {
        this.showCommas = controller.options.matrixCommaSeparators ?? true;
        break;
      }
      node = node.parent;
    }

    // Update DOM class based on showCommas setting
    if (!this.showCommas) {
      this.domFrag().addClass('mq-matrix-no-commas');
    } else {
      this.domFrag().removeClass('mq-matrix-no-commas');
    }
  }

  parser(): Parser<MQNode | Fragment> {
    const self = this;
    const endMarker = '\\end{' + self.environment + '}';

    return new Parser(function (stream, onSuccess, onFailure) {
      // Find the \end{...} that matches this \begin{...}, accounting for
      // nested matrix environments. A naive indexOf would stop at the first
      // \end of an inner matrix and truncate this matrix's content.
      const match = self.findMatchingEnd(stream);
      if (!match) {
        return onFailure(stream, 'expected ' + endMarker);
      }
      const content = stream.slice(0, match.start).trim();
      const remaining = stream.slice(match.end);
      return onSuccess(remaining, self.parseMatrixContent(content));
    });
  }

  // Returns true if `token` occurs in `str` starting exactly at index `i`.
  // Avoids String.prototype.startsWith for ES5-target compatibility.
  private static matchAt(str: string, i: number, token: string): boolean {
    return str.substr(i, token.length) === token;
  }

  // Scan `stream` (the text immediately after this matrix's \begin{...}) and
  // return the bounds of the \end{...} that closes it, tracking nesting depth
  // of any \begin/\end pairs so nested matrices are skipped over.
  private findMatchingEnd(
    stream: string
  ): { start: number; end: number } | null {
    let depth = 1;
    let i = 0;
    while (i < stream.length) {
      if (Matrix.matchAt(stream, i, '\\begin{')) {
        depth++;
        i += '\\begin{'.length;
      } else if (Matrix.matchAt(stream, i, '\\end{')) {
        depth--;
        if (depth === 0) {
          const braceEnd = stream.indexOf('}', i);
          if (braceEnd === -1) return null;
          return { start: i, end: braceEnd + 1 };
        }
        i += '\\end{'.length;
      } else {
        i++;
      }
    }
    return null;
  }

  // Split matrix content on a top-level separator (row '\\' or column '&'),
  // ignoring separators that appear inside nested \begin{...}\end{...} blocks.
  private splitTopLevel(content: string, mode: 'row' | 'col'): string[] {
    const parts: string[] = [];
    let buf = '';
    let depth = 0;
    let i = 0;
    while (i < content.length) {
      if (Matrix.matchAt(content, i, '\\begin{')) {
        depth++;
        buf += '\\begin{';
        i += '\\begin{'.length;
      } else if (Matrix.matchAt(content, i, '\\end{')) {
        if (depth > 0) depth--;
        buf += '\\end{';
        i += '\\end{'.length;
      } else if (
        depth === 0 &&
        mode === 'row' &&
        Matrix.matchAt(content, i, '\\\\')
      ) {
        parts.push(buf);
        buf = '';
        i += 2;
      } else if (depth === 0 && mode === 'col' && content.charAt(i) === '&') {
        parts.push(buf);
        buf = '';
        i += 1;
      } else {
        buf += content.charAt(i);
        i++;
      }
    }
    parts.push(buf);
    return parts;
  }

  parseMatrixContent(content: string): Matrix {
    const rowStrings = this.splitTopLevel(content, 'row');
    const rows: string[][] = [];

    let maxCols = 0;
    for (const rowStr of rowStrings) {
      if (rowStr.trim() === '') continue;
      const cols = this.splitTopLevel(rowStr, 'col');
      rows.push(cols);
      maxCols = Math.max(maxCols, cols.length);
    }

    this.nRows = rows.length || 1;
    this.nCols = maxCols || 1;
    this.createBlocks();

    for (let r = 0; r < this.nRows; r++) {
      for (let c = 0; c < this.nCols; c++) {
        const cellContent = rows[r] && rows[r][c] ? rows[r][c].trim() : '';
        if (cellContent) {
          const parsed = latexMathParser.parse(cellContent);
          parsed.children().adopt(this.cells[r][c] as MQNode, 0, 0);
        }
      }
    }

    return this;
  }
}

// Full LaTeX commands
LatexCmds.matrix = Matrix.createDefault('matrix');
LatexCmds.pmatrix = Matrix.createDefault('pmatrix');
LatexCmds.bmatrix = Matrix.createDefault('bmatrix');
LatexCmds.Bmatrix = Matrix.createDefault('Bmatrix');
LatexCmds.vmatrix = Matrix.createDefault('vmatrix');
LatexCmds.Vmatrix = Matrix.createDefault('Vmatrix');

// Short commands for easier typing
LatexCmds.mat = Matrix.createDefault('pmatrix');
LatexCmds.pmat = Matrix.createDefault('pmatrix');
LatexCmds.bmat = Matrix.createDefault('bmatrix');
LatexCmds.Bmat = Matrix.createDefault('Bmatrix');
LatexCmds.vmat = Matrix.createDefault('vmatrix');
LatexCmds.Vmat = Matrix.createDefault('Vmatrix');

// \begin{...} is only for parsing LaTeX, not for typing
class BeginCommand extends MathCommand {
  parser() {
    const string = Parser.string;
    const regex = Parser.regex;
    const optWhitespace = Parser.optWhitespace;

    return optWhitespace
      .then(string('{'))
      .then(regex(/^[a-zA-Z]+/))
      .skip(string('}'))
      .then((envName: string) => {
        if (envName in MATRIX_CONFIGS) {
          const matrix = new Matrix(envName as MatrixEnvironment, 1, 1);
          return matrix.parser();
        }
        return Parser.fail('Unknown environment: ' + envName);
      });
  }

  // Prevent \begin from being typed - it's only for parsing
  createLeftOf(_cursor: Cursor) {
    // Do nothing - \begin should only work when parsing LaTeX
  }
}
LatexCmds.begin = BeginCommand;
