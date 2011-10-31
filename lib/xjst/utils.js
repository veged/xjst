var utils = exports,
    crypto = require('crypto');

utils.sha1 = function sha1(value) {
  return crypto.createHash('sha1').update(value).digest('hex');
};

utils.mergeWith = function mergeWith(template) {
  __config.$unexpected = function(parent) {
    if (template.__config[parent]) {
      return template.__config[parent].call(this);
    } else {
      return template.apply.call(this);
    }
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

utils.intersect = function(a, b) {
  var result = {};

  Object.keys(a).forEach(function(key) {
    if (JSON.stringify(b[key]) === JSON.stringify(a[key])) result[key] = a[key];
  });

  return result;
};

utils.join = function(result, a) {

  Object.keys(a).forEach(function(key) {
    if (result[key]) {
      var orig = a[key] || "undefined",
          exists = result[key].some(function(v) {
            return v === orig;
          });

      if (!exists) {
        result[key].push(orig);
        result[key].sort();
      }
    } else {
      result[key] = [a[key] || "undefined"];
    }
  });

  return result;
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
    if (JSON.stringify(target[key]) !== JSON.stringify(source[key])) {
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

utils.clone = function clone(object) {
  var result = {};

  Object.keys(object).forEach(function(i) {
    result[i] = object[i];
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
