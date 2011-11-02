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

function Identifier () {
  this.counter = 0;
  this.cache = {};
}
utils.Identifier = Identifier;

Identifier.prototype.identify = function identify(o) {
  var cache = this.cache,
      key = JSON.stringify(o);

  if(cache.hasOwnProperty(key)) {
    return cache[key];
  } else {
    return cache[key] = ++this.counter;
  }
};

utils.stringify = function stringify(v) {
  if (v === undefined) return 'undefined';
  return typeof v !== 'string' ? JSON.stringify(v) : v;
};

utils.intersect = function(a, b) {
  var result = {};

  Object.keys(a).forEach(function(key) {
    var v = utils.stringify(a[key]);

    if (utils.stringify(b[key]) === v) {
      result[key] = v;
    }
  });

  return result;
};

utils.join = function(result, a, values) {

  Object.keys(a).forEach(function(key) {
    var matched = values[key];

    if (result[matched]) {
      var orig = a[key] || "undefined",
          exists = result[matched].some(function(v) {
            return v === orig;
          });

      if (!exists) {
        result[matched].push(orig);
        result[matched].sort();
      }
    } else {
      result[matched] = [a[key] || "undefined"];
    }
  });

  return result;
};

utils.isMutual = function(o, values) {
  return Object.keys(o).some(function(key) {
    var val = values[key];
    if (!val) return false;

    return !/^\["getp?"/.test(val);
  });
};

//
// Returns zero if sets are equal, null if sets are completely different,
// positive value if source has all props/values of target,
// and otherwise negative
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
    if (target[key] !== source[key]) {
      return false;
    }
    return true;
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
    result[i] = stringify ? utils.stringify(object[i]) : object[i];
  });

  return result;
};

utils.cloneChanged = function cloneChanged(object, key, value) {
  var result = utils.clone(object);

  result[key] = value;

  return result;
}

function Merger() {
  this.cache = {};
  this.idCounter = 1;
};
utils.Merger = Merger;

Merger.prototype.merge = function merge(obj) {
  var self = this,
      hash,
      size;

  if(obj.switch) {
    hash = ['switch ', JSON.stringify(obj.switch), '{'];
    size = 0;

    obj.cases.forEach(function (c){
      c[1] = self.merge(c[1]);
      size += c[1].size;
      hash.push(c[1].hash, ' ');
    });
    obj.default = self.merge(obj.default);
    size += obj.default.size;

    hash.push(obj.default.hash, '}');
    hash = utils.sha1(hash.join(''));
  } else {
    var json = JSON.stringify(obj.stmt);
    hash = obj.hash || utils.sha1(json);

    // XXX Strange Euristics
    size = json.length / 3200;
  }

  obj.size = size;

  if(this.cache.hasOwnProperty(hash)) {
    obj.id = this.cache[hash].id;
  } else {
    this.cache[obj.hash = hash]  = obj;
    obj.id = this.idCounter++;
  }

  if (obj.tag) obj.id = obj.tag;

  return this.cache[hash];
};

utils.errorHandler = function errorHandler(source) {
  return function(m, i) {
    var err = new Error('Match failed ' + source.slice(i - 15, i + 15));
    err.errorPos = i;

    throw err;
  };
};
