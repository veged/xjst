var benchmark = require('benchmark'),
    cliff = require('cliff'),
    Q = require('q'),

    templates = require('./templates'),
    suite = new benchmark.Suite(),

    xjst = require('../lib/xjst');

function render(input, file) {
  return typeof input.apply === 'function' ? input.apply : xjst.compile(input, file).apply;
}

exports.run = function(options) {
  console.log([
    '',
    '  XX      XX       JJ     SSSSSSS   TTTTTTTTTT',
    '   XX    XX        JJ     SS            TT    ',
    '    XX  XX         JJ     SS            TT    ',
    '     XXXX          JJ     SSSSSSS       TT    ',
    '    XX XX          JJ          SS       TT    ',
    '   XX   XX     JJ  JJ          SS       TT    ',
    '  XX     XX    JJJJJJ     SSSSSSS       TT    ',
    '',
  ].join('\n').rainbow);
  console.log('              // benchmarks //');

  function progress() {
    process.stdout.clearLine(0);
    process.stdout.cursorTo(0);
    process.stdout.write([
        'completed: '.blue,
        (progress.count++ * 100 / progress.total).toFixed(1),
        '%'
    ].join(''));
  };
  progress.count = 0;

  var templatesLoaded,
      processing;

  templatesLoaded = templates.load(options.file);

  Q.when(templatesLoaded, function(templates) {
    process.stdout.write('\n');

    progress.total = Object.keys(templates).length;
    progress();
  });

  processing = Q.when(templatesLoaded, function(templates) {
    var wait = Object.keys(templates).map(function (name) {
      var template = templates[name],
          fn = render(template.xjst, 'benchmarks/' + name),
          defer = Q.defer();

      // Throw exception if compiler was wrong
      fn.call(template.data);

      suite.add(name, function() {
        return fn.call(template.data);
      }, {
        maxTime: options['max-time'],
        onComplete: function() {
          progress();

          defer.resolve({
            name: name,
            'mean time': (this.stats.mean * 1e3).toFixed(9) + 'ms',
            'ops/sec': (1 / this.stats.mean).toFixed(0),
            mean: this.stats.mean,
            'elapsed time': (this.times.elapsed).toFixed(3) + 's'
          });
        }
      });

      return defer.promise;
    });

    suite.run({ async: true });

    return wait;
  });

  return Q.when(processing, function(jobs) {
    Q.when(Q.all(jobs), function(results) {
      process.stdout.write('\n\n');

      if (options.details) {
        console.log(cliff.stringifyObjectRows(
            results,
            ['name', 'mean time', 'ops/sec', 'elapsed time'],
            ['red', 'green', 'blue', 'yellow']
        ));
      }

      var total = results.reduce(function (acc, curr) {
        return acc > 1 / curr.mean ? 1 / curr.mean : acc;
      }, Infinity);

      console.log(''); // newline

      console.log('Worst ops/sec: '.red, (total.toFixed(0) + ' ops/sec').blue);
    });
  });
};
