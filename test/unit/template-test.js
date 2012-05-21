var common = require('../fixtures/common'),
    assert = require('assert');

function templateTest(name, type, expected) {
  return function () {
    var result = common.render(name).apply.call({ type: type });

    assert.equal(result, expected || 'ok');
  };
};

suite('Templates execution', function () {
  test('atomic', templateTest('atomic-template', 'simple'));
  test('simple non-recursive', templateTest('non-rec-template', 'simple'));
  test('complex non-recursive', templateTest('non-rec-template', 'complex'));
  test(
    'simple recursive',
    templateTest(
      'recursive-template',
      'simple',
      '<ul><li>1</li><li>2</li><li>3</li><li>4</li></ul>'
    )
  );

  test('throws on unexpected data', function () {
    assert.throws(function() {
      common.render('non-rec-template').apply.call({ type: 'unexpected' });
    });
  });
});
