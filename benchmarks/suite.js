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
    Object.keys(templates).forEach(function (name) {
      var template = templates[name];
      var fns = {
        xjst: template.xjst,
        js: template.js
      };
      Object.keys(fns).forEach(function (type) {
        if (!fns[type])
          return;
        var fn = render(fns[type], 'benchmarks/' + name + '.' + type);

        // Throw exception if compiler was wrong
        var res = fn.call(template.data);
        if (template.html !== null) {
          // assert.equal(res + '\n', template.html);
        }

        var data = JSON.stringify(template.data);
        suite.add(name + '.' + type, function() {
          return fn.call(JSON.parse(data));
        }, {
          maxTime: options['max-time']
        });
      });
    });

    suite.on('cycle', function(event) {
      console.log(String(event.target));
    });

    suite.run();
  });
};
