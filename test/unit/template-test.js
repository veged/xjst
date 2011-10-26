var common = require('../fixtures/common'),
    assert = require('assert');

function templateTest(name, type, expected) {
  return function(test) {
    var result = common.render(name).apply.call({ type: type });

    assert.equal(result, expected || 'ok');

    test.done();
  };
};

exports['atomic template'] = templateTest('atomic-template', 'simple');
exports['simple non-recursive template'] =
    templateTest('non-rec-template', 'simple');
exports['complex non-recursive template'] =
    templateTest('non-rec-template', 'complex');
exports['simple recursive template'] =
    templateTest('recursive-template', 'simple',
                 '<ul><li>1</li><li>2</li><li>3</li><li>4</li></ul>');
