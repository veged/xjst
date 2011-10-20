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

Identifier.prototype.identify = function(o) {
  var cache = this.cache,
      key = JSON.stringify(o);

  if (cache.hasOwnProperty(key)) {
    return cache[key];
  } else {
    return cache[key] = ++this.counter;
  }
};

utils.cloneChanged = function cloneChanged(object, key, value) {
  var result = {};

  for(var i in object) {
    result[i] = object[i];
  }

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
      id = this.idCounter++;

  if (obj.switch) {
    hash = 'switch ' + JSON.stringify(obj.switch) + '{';
    obj.cases.forEach(function(c){
      c[1] = self.merge(c[1]);
      hash += c[1].hash + " ";
    });
    obj.default = self.merge(obj.default);

    hash += obj.default.hash + '}';
    hash = utils.sha1(hash);
  } else {
    hash = obj.hash ||
           utils.sha1(JSON.stringify(obj.exprs || obj.stmt));
  }

  if (!this.cache.hasOwnProperty(hash)) {
    this.cache[obj.hash = hash]  = obj;
  }
  this.cache[hash].id = id;

  return this.cache[hash];
};

utils.errorHandler = function errorHandler(m, i) {
  var err = new Error('Match failed');
  err.errorPos = i;

  throw err;
};
