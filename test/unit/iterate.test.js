suite('iterate', function () {
  const $ = window.test_only_jquery;
  var mq, controller;

  setup(function () {
    mq = MQ.MathField($('<span></span>').appendTo('#mock')[0]);
    controller = mq.__controller;
  });

  /** The IterateNotation node inside the field, or null. */
  function findIterate() {
    var found = null;
    controller.root.postOrder(function (node) {
      if (node.ctrlSeq === '\\iterate') found = node;
    });
    return found;
  }

  /** The rendered loop element's inline width, as written by reflow(). */
  function loopWidth(node) {
    var el = node.domFrag().oneElement().querySelector('.mq-iterate-loop');
    return el ? el.style.width : null;
  }

  suite('reflow refuses degenerate measurements', function () {
    // Regression: reflow() measured the seed unconditionally and wrote the
    // result. Rendered before layout (restored content on RELOAD, a hidden or
    // detached box), every rect reads 0x0, so the loop was sized to its
    // geometry MINIMUM — and that stuck, because MathQuill only reflows on
    // edit. The seed then measured 67px against a 14px loop until touched.
    test('a seed with content that measures 0x0 leaves the geometry alone', function () {
      mq.latex('\\iterate{g=1}_{n=1}^{5}g');
      var node = findIterate();
      assert.ok(node, 'iterate rendered');

      var laidOut = loopWidth(node);
      assert.ok(laidOut, 'reflow wrote a width while laid out');

      // Hide the field: every rect inside now measures 0x0, exactly as on a
      // render that happens before the box is laid out.
      var root = controller.root.domFrag().oneElement();
      var host = root.parentElement;
      host.style.display = 'none';
      node.reflow();
      host.style.display = '';

      assert.equal(
        loopWidth(node),
        laidOut,
        'the unmeasurable reflow must not overwrite the good geometry'
      );
    });

    test('an EMPTY seed still sizes normally when it measures zero', function () {
      // A seed with no content legitimately has zero width, and its minimal
      // loop is the correct rendering — the guard must not swallow it.
      mq.latex('\\iterate{}_{n=1}^{5}n');
      var node = findIterate();
      assert.ok(node, 'iterate rendered');
      assert.ok(loopWidth(node), 'an empty seed still gets a loop width');
    });
  });
});
