suite('matrix', function () {
  const $ = window.test_only_jquery;
  var mq, controller;

  setup(function () {
    mq = MQ.MathField($('<span></span>').appendTo('#mock')[0]);
    controller = mq.__controller;
  });

  /**
   * Find the Matrix node inside the field, so tests can drive it directly
   * rather than guessing at keystroke sequences.
   */
  function findMatrix() {
    var found = null;
    controller.root.postOrder(function (node) {
      if (node instanceof Matrix) found = node;
    });
    return found;
  }

  /**
   * Put the cursor inside a matrix cell. addColumn/deleteColumn read
   * cursor.parent.row to decide where to land afterwards, so they are only ever
   * valid with the cursor in the matrix.
   */
  function focusCell(matrix, row, col) {
    controller.cursor.insAtLeftEnd(matrix.cells[row][col]);
  }

  /**
   * Count reflow() calls on every ancestor of the matrix by wrapping them.
   * Structural matrix edits must bubble a reflow, because ancestors that size
   * themselves by MEASURING the matrix (stretchy brackets, the \iterate loop)
   * are otherwise left drawn from dimensions it no longer has.
   */
  function countAncestorReflows(matrix) {
    var count = 0;
    var node = matrix.parent;
    while (node) {
      (function (n) {
        var original = n.reflow;
        n.reflow = function () {
          count += 1;
          return original.apply(this, arguments);
        };
      })(node);
      node = node.parent;
    }
    return function () {
      return count;
    };
  }

  suite('structural edits bubble a reflow', function () {
    // Regression: rebuildDOM() is the single funnel every add/delete row or
    // column goes through, and it rebuilt the DOM without bubbling a reflow.
    // Ordinary edits bubble one via MathCommand.finalizeInsert, so only the
    // matrix mutations went stale — adding rows then deleting them left
    // measuring ancestors badly offset.
    test('addRow bubbles a reflow to ancestors', function () {
      controller.renderLatexMath('\\begin{pmatrix}1&2\\\\3&4\\end{pmatrix}');
      var matrix = findMatrix();
      assert.ok(matrix, 'matrix rendered');
      focusCell(matrix, 0, 0);

      var reflows = countAncestorReflows(matrix);
      matrix.addRow(0, controller);
      assert.ok(reflows() > 0, 'addRow bubbled a reflow');
    });

    test('deleteRow bubbles a reflow to ancestors', function () {
      controller.renderLatexMath(
        '\\begin{pmatrix}1&2\\\\3&4\\\\5&6\\end{pmatrix}'
      );
      var matrix = findMatrix();
      assert.ok(matrix, 'matrix rendered');
      focusCell(matrix, 0, 0);

      var reflows = countAncestorReflows(matrix);
      matrix.deleteRow(0, controller);
      assert.ok(reflows() > 0, 'deleteRow bubbled a reflow');
    });

    test('addColumn bubbles a reflow to ancestors', function () {
      controller.renderLatexMath('\\begin{pmatrix}1&2\\\\3&4\\end{pmatrix}');
      var matrix = findMatrix();
      assert.ok(matrix, 'matrix rendered');
      focusCell(matrix, 0, 0);

      var reflows = countAncestorReflows(matrix);
      matrix.addColumn(1, controller.cursor);
      assert.ok(reflows() > 0, 'addColumn bubbled a reflow');
    });

    test('deleteColumn bubbles a reflow to ancestors', function () {
      controller.renderLatexMath(
        '\\begin{pmatrix}1&2&3\\\\4&5&6\\end{pmatrix}'
      );
      var matrix = findMatrix();
      assert.ok(matrix, 'matrix rendered');
      focusCell(matrix, 0, 0);

      var reflows = countAncestorReflows(matrix);
      matrix.deleteColumn(1, controller);
      assert.ok(reflows() > 0, 'deleteColumn bubbled a reflow');
    });
  });
});
