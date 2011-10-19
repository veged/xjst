var benchmark = require('benchmark'),
    cliff = require('cliff'),
    step = require('step'),
    argv = require('optimist')
              .default('max-time', 1)
              .argv;

var templates = require('./fixtures/templates'),
    suite = new benchmark.Suite();

var xjst = require('../lib/xjst');

function render(input) {
  var parsed,
      compiled;

  parsed = xjst.ometa.XJSTParser.matchAll(input, 'topLevel', undefined, function(m, i) {
    throw { errorPos: i, toString: function(){ return "match failed" } }
  });
  compiled = eval(xjst.compile(parsed));

  return compiled.apply;
}

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

step(function() {
  templates.load(this.parallel());
}, function(err, templates) {
  if (err) throw err;

  var group = this.group();

  process.stdout.write('\n');

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
  progress.total = Object.keys(templates).length;

  progress();

  Object.keys(templates).forEach(function (name) {
    var template = templates[name],
        callback = group(),
        fn = render(template.xjst);

    template.data.apply = fn;

    suite.add(name, function() {
      return fn(template.data);
    }, {
      maxTime: argv['max-time'],
      onComplete: function() {
        progress();
        callback(null, {
          name: name,
          'mean time': (this.stats.mean * 1e3).toFixed(9) + 'ms',
          'ops/sec': (1 / this.stats.mean).toFixed(0),
          mean: this.stats.mean,
          'elapsed time': (this.times.elapsed).toFixed(3) + 's'
        });
      }
    });
  });

  suite.run({ async: true });
}, function(err, results) {
  process.stdout.write('\n\n');

  if (err) throw err;

  if (argv.details) {
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
