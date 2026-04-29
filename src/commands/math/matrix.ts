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
  }

  keystroke(key: string, e: KeyboardEvent | undefined, ctrlr: Controller) {
    const matrix = this.parent as Matrix;

    switch (key) {
      case 'Left':
        e?.preventDefault();
        if (this.col > 0) {
          ctrlr.cursor.insAtRightEnd(matrix.cells[this.row][this.col - 1]);
        } else {
          ctrlr.cursor.insLeftOf(matrix);
        }
        return;

      case 'Right':
        e?.preventDefault();
        if (this.col < matrix.nCols - 1) {
          ctrlr.cursor.insAtLeftEnd(matrix.cells[this.row][this.col + 1]);
        } else {
          ctrlr.cursor.insRightOf(matrix);
        }
        return;

      case 'Up':
        e?.preventDefault();
        if (this.row > 0) {
          ctrlr.cursor.insAtLeftEnd(matrix.cells[this.row - 1][this.col]);
        }
        return;

      case 'Down':
        e?.preventDefault();
        if (this.row < matrix.nRows - 1) {
          ctrlr.cursor.insAtLeftEnd(matrix.cells[this.row + 1][this.col]);
        }
        return;

      case 'Enter':
        e?.preventDefault();
        matrix.addRow(this.row + 1, ctrlr);
        return;

      case 'Backspace':
        if (this.isEmpty()) {
          e?.preventDefault();
          if (this.row === 0 && matrix.nCols > 1) {
            matrix.deleteColumn(this.col, ctrlr);
          } else if (this.col === 0 && matrix.nRows > 1) {
            matrix.deleteRow(this.row, ctrlr);
          } else if (this.col > 0) {
            ctrlr.cursor.insAtRightEnd(matrix.cells[this.row][this.col - 1]);
          } else if (matrix.nRows === 1 && matrix.nCols === 1) {
            ctrlr.cursor.insLeftOf(matrix);
            matrix.remove();
          }
          return;
        }
        break;
    }

    return super.keystroke(key, e, ctrlr);
  }

  write(cursor: Cursor, ch: string) {
    if (ch === ',') {
      const matrix = this.parent as Matrix;
      matrix.addColumn(this.col + 1, cursor);
      return;
    }
    super.write(cursor, ch);
  }
}

class Matrix extends MathCommand {
  environment: MatrixEnvironment;
  cells: MatrixCell[][];
  nRows: number;
  nCols: number;

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

  static createDefault(environment: MatrixEnvironment) {
    return () => new Matrix(environment, 2, 2);
  }

  numBlocks() {
    return (this.nRows * this.nCols) as 1;
  }

  createBlocks() {
    this.cells = [];
    this.blocks = [];

    for (let r = 0; r < this.nRows; r++) {
      this.cells[r] = [];
      for (let c = 0; c < this.nCols; c++) {
        const cell = new MatrixCell(r, c);
        this.cells[r][c] = cell;
        this.blocks.push(cell);
        cell.adopt(this, this.getEnd(R), 0);
      }
    }
  }

  rebuildDOM() {
    const oldDOM = this.domFrag();
    this.html();
    const newEl = this.domFrag().oneElement();

    if (oldDOM && !oldDOM.isEmpty()) {
      oldDOM.replaceWith(domFrag(newEl));
    }

    this.finalizeTree();
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
        this.blocks.push(cell);
        if (!cell.parent) {
          cell.adopt(this, this.getEnd(R), 0);
        }
      }
    }

    this.rebuildDOM();

    const currentRow = (cursor.parent as MatrixCell).row;
    cursor.insAtLeftEnd(this.cells[currentRow][afterCol]);
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
        this.blocks.push(cell);
        if (!cell.parent) {
          cell.adopt(this, this.getEnd(R), 0);
        }
      }
    }

    this.rebuildDOM();
    ctrlr.cursor.insAtLeftEnd(this.cells[afterRow][0]);
  }

  deleteColumn(col: number, ctrlr: Controller) {
    if (this.nCols <= 1) return;

    const nextCol = col > 0 ? col - 1 : 0;
    const currentRow = (ctrlr.cursor.parent as MatrixCell).row;

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
        this.blocks.push(this.cells[r][c]);
      }
    }

    this.rebuildDOM();
    ctrlr.cursor.insAtLeftEnd(this.cells[currentRow][nextCol]);
  }

  deleteRow(row: number, ctrlr: Controller) {
    if (this.nRows <= 1) return;

    const nextRow = row > 0 ? row - 1 : 0;
    const currentCol = (ctrlr.cursor.parent as MatrixCell).col;

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
        this.blocks.push(this.cells[r][c]);
      }
    }

    this.rebuildDOM();
    ctrlr.cursor.insAtLeftEnd(this.cells[nextRow][currentCol]);
  }

  html() {
    const config = MATRIX_CONFIGS[this.environment];

    this.domView = new DOMView(this.nRows * this.nCols, (blocks) => {
      const rows: Element[] = [];
      let blockIdx = 0;

      for (let r = 0; r < this.nRows; r++) {
        const cellElements: Element[] = [];
        for (let c = 0; c < this.nCols; c++) {
          cellElements.push(
            h.block('span', { class: 'mq-matrix-cell' }, blocks[blockIdx++])
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
    const svgMap: Record<string, () => Element> = {
      '(': () => SVG_SYMBOLS['('].html(),
      ')': () => SVG_SYMBOLS[')'].html(),
      '[': () => SVG_SYMBOLS['['].html(),
      ']': () => SVG_SYMBOLS[']'].html(),
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

    this.upInto = this.cells[0][0];
    this.downInto = this.cells[this.nRows - 1][0];
  }

  parser(): Parser<MQNode | Fragment> {
    const self = this;
    const string = Parser.string;
    const optWhitespace = Parser.optWhitespace;

    return optWhitespace.then(
      latexMathParser
        .map(function (block: MathBlock) {
          const content = block.latex();
          return self.parseMatrixContent(content);
        })
        .skip(optWhitespace.then(string('\\end{' + self.environment + '}')))
    );
  }

  parseMatrixContent(content: string): Matrix {
    const rowStrings = content.split(/\s*\\\\\s*/);
    const rows: string[][] = [];

    let maxCols = 0;
    for (const rowStr of rowStrings) {
      if (rowStr.trim() === '') continue;
      const cols = rowStr.split(/\s*&\s*/);
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
          parsed.children().adopt(this.cells[r][c], 0, 0);
        }
      }
    }

    return this;
  }
}

LatexCmds.matrix = Matrix.createDefault('matrix');
LatexCmds.pmatrix = Matrix.createDefault('pmatrix');
LatexCmds.bmatrix = Matrix.createDefault('bmatrix');
LatexCmds.Bmatrix = Matrix.createDefault('Bmatrix');
LatexCmds.vmatrix = Matrix.createDefault('vmatrix');
LatexCmds.Vmatrix = Matrix.createDefault('Vmatrix');

LatexCmds.begin = class extends MathCommand {
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
};
