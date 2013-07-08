var assert = require('assert'),
    benchmark = require('benchmark'),
    Q = require('q'),

    templates = require('./templates'),
    suite = new benchmark.Suite(),

    xjst = require('../lib/xjst');

exports.run = function(options) {
  function render(input, file) {
    return typeof input.apply === 'function' ?
        input.apply
        :
        xjst.compile(input, options).apply;
  };

  if (!options['hide-logo']) {
    console.log([
      '',
      '  XX      XX       JJ     SSSSSSS   TTTTTTTTTT',
      '   XX    XX        JJ     SS            TT    ',
      '    XX  XX         JJ     SS            TT    ',
      '     XXXX          JJ     SSSSSSS       TT    ',
      '    XX  XX         JJ          SS       TT    ',
      '   XX    XX    JJ  JJ          SS       TT    ',
      '  XX      XX   JJJJJJ     SSSSSSS       TT    ',
      '',
    ].join('\n'));
    console.log('              // benchmarks //');
  }

  return templates.load(options.file).then(function(templates) {
    var wait = Object.keys(templates).map(function (name) {
      var template = templates[name],
          fn = render(template.xjst, 'benchmarks/' + name);

      // Throw exception if compiler was wrong
      var res = fn.call(template.data);
      if (template.html !== null) {
        assert.equal(res + '\n', template.html);
      }

      suite.add(name, function() {
        return fn.call(template.data);
      }, {
        maxTime: options['max-time']
      });
    });

    suite.on('cycle', function(event) {
      console.log(String(event.target));
    });

    suite.run();
  });
};
