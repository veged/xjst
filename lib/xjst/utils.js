var utils = exports,
    crypto = require('crypto');

utils.sha1 = function sha1(value) {
  return crypto.createHash('sha1').update(value).digest('hex');
};

utils.mergeWith = function mergeWith(template) {
  var cache = {};
  _c.$unexpected = function(parents) {
    var match = cache[parents[0]],
        fn;

    if (!match) {
      for (var i = parents.length -1; i >= 0; i--) {
        if (template.config[parents[i]]) break;
      }

      if (i >= 0) {
        cache[parents[0]] = parents[i];
        fn = template.config[parents[i]];
      } else {
        fn = template.apply;
      }
    } else {
      fn = template.config[match] || template.apply;
    }

    return fn.call(this);
  };
};

utils.findLastDefault = function findLastDefault(tree) {
  if (tree.default.switch) return findLastDefault(tree.default);
  return tree.default;
};

function Identifier () {
  this.counter = 0;
  this.cache = {};
}
utils.Identifier = Identifier;

Identifier.prototype.identify = function identify(o) {
  var cache = this.cache,
      key = JSON.stringify(o);

  if(cache[key] !== undefined) {
    return cache[key];
  } else {
    return cache[key] = ++this.counter;
  }
};

Identifier.prototype.generate = function() {
  return ++this.counter;
};

utils.stringify = function stringify(v) {
  if (v === undefined) return 'undefined';

  return typeof v !== 'string' ? JSON.stringify(v) : v;
};

//
// Returns zero if sets are equal, null if sets are completely different,
// positive value if source has all props/values of target,
// and otherwise negative
//
utils.compareSets = function(source, target) {
  var result = 0,
      keys = {
        source: Object.keys(source),
        target: Object.keys(target)
      },
      reverse = false;

  if (keys.target.length < keys.source.length) {
    reverse = true;

    var t = source;
    source = target;
    target = t;

    t = keys.source;
    keys.source = keys.target;
    keys.target = t;
  }

  var nested = keys.source.every(function(key) {
    if (!target[key]) return false;

    return target[key] === source[key];
  });
  if (!nested) return null;

  return reverse ?
      keys.target.length - keys.source.length
      :
      keys.source.length - keys.target.length;
};

utils.clone = function clone(object, stringify) {
  var result = {};

  Object.keys(object).forEach(function(i) {
    if (stringify && object[i] === null) return;
    result[i] = stringify ? utils.stringify(object[i]) : object[i];
  });

  return result;
};

utils.errorHandler = function errorHandler(source) {
  return function(m, i) {
    var err = new Error('Match failed ' + source.slice(i - 15, i + 15));
    err.errorPos = i;

    throw err;
  };
};
