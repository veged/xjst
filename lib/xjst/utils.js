var utils = exports,
    crypto = require('crypto');

utils.sha1 = function sha1(value) {
  return crypto.createHash('sha1').update(value).digest('base64');
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
    var json = JSON.stringify(obj.exprs || obj.stmt);
    hash = obj.hash || utils.sha1(json);

    // XXX Strange Euristics
    size = json.length / 3200;
  }

  obj.size = size;

  if(this.cache.hasOwnProperty(hash)) {
    obj.id = this.cache[hash].id;
  } else {
    this.cache[obj.hash = hash]  = obj;
    this.cache[hash].id = this.idCounter++;
  }

  return this.cache[hash];
};

utils.errorHandler = function errorHandler(m, i) {
  var err = new Error('Match failed');
  err.errorPos = i;

  throw err;
};
