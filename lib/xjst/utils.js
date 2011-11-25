var utils = exports,
    crypto = require('crypto');

//
// ### function sha1 (value)
// #### @value {String|Buffer} Input data
// Returns hex digest of sha1 hash of input data
//
utils.sha1 = function sha1(value) {
  return crypto.createHash('sha1').update(value).digest('hex');
};

//
// ### function hashName (value)
// #### @value {String} Input data
// Returns valid name for javascript variable (based on input's md5 hash)
//
utils.hashName = function hashName(value) {
  var hash = crypto.createHash('md5').update(value).digest('base64');

  // Replace base64 specific chars
  hash = hash.replace(/\+/g, '$').replace(/\//g, '_');

  // Remove padding
  hash = hash.replace(/=+$/g, '');

  if (/^[0-9]/.test(hash)) {
    hash = '$' + hash;
  }

  return hash;
};

//
// ### function mergeWith (template)
// #### @template {Object} Another template
// Template function for compiled XJST
//
utils.mergeWith = function mergeWith(template) {
  var cache = {};
  _c.$e = function(parents) {
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

//
// ### function compareArrays (source, target)
// #### @source {Array} Source array
// #### @target {Array} Target array
// Check if target array has all elements from source
//
function compareArrays(source, target) {
  var reverse = false;
  if (source.length > target.length) {
    reverse = true;
    var t = source;
    source = target;
    target = t;
  }

  var result = source.every(function(elem) {
    return target.indexOf(elem) !== -1;
  });

  if (!result) return 0;

  return reverse ? -1 : 1;
}

//
// ### function compareSets (source, target)
// #### @source {Object} Source state
// #### @target {Object} Target state
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

    // If target[key] array is nested in source[key]
    if (compareArrays(target[key], source[key]) <= 0) {
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

//
// ### function getPredicateValues (templates)
// #### @templates {Array} Templates list
// Returns hashmap with predicates' ids as keys and
// hashmap (stringified representation of predicate value to
// value's AST representation) as value
//
utils.getPredicateValues = function getPredicateValues(templates) {
  var vals = {};

  templates.forEach(function(t) {
    t[0].forEach(function(subMatch) {
      var p = subMatch[0],
          c = utils.stringify(subMatch[2]);

      if (!vals[p]) vals[p] = {};
      vals[p][c] = subMatch[2];
    });
  });

  Object.keys(vals).forEach(function(p) {
    vals[p] = Object.keys(vals[p]).map(function(key) {
      return vals[p][key];
    });
  });

  return vals;
};

//
// ### function clone (object, stringify)
// #### @object {Object} Source object
// #### @stringify {bool} Stringify values flag
// Creates new Object instance and copies all properties from `object` to it
// (Stringifies all properties' values if flag was set to true)
//
utils.clone = function clone(object, stringify) {
  var result = {};

  Object.keys(object).forEach(function(i) {
    if (stringify && object[i] === null) return;
    result[i] = stringify ? utils.stringify(object[i]) : object[i];
  });

  return result;
};

//
// ### function cloneChanged (object, key, value)
// #### @object {Object} Source object
// #### @key {String} Name of property to set
// #### @value {String} Value of property
// Clones object and sets property to `value`
//
utils.cloneChanged = function cloneChanged(object, key, value) {
  var result = utils.clone(object);

  result[key] = value;

  return result;
};

//
// ### function reduceTree (tree, fn, acc)
// #### @tree {Array} AST
// #### @fn {Function} Iterator function
// #### @acc {any} Initial value
// Traverses AST and calls `fn` for each node, replacing initial value with fn's
// return value
//
utils.reduceTree = function reduceTree(tree, fn, acc) {
  if (tree['switch']) {
    acc = fn(acc, tree);

    acc = tree.cases.reduce(function(acc, c) {
      return reduceTree(c[1], fn, acc);
    }, acc);
    acc = reduceTree(tree['default'], fn, acc);
  } else {
    acc = fn(acc, tree);
  }

  return acc;
}

//
// ### function Identifier ()
// Object identifier, can be used for enumerating set of objects
//
function Identifier () {
  this.counter = 0;
  this.cache = {};
}
utils.Identifier = Identifier;

//
// ### function identify (obj)
// #### @obj {any}
// Returns numeric identificator of passed object
//
Identifier.prototype.identify = function identify(o) {
  var cache = this.cache,
      key = JSON.stringify(o);

  if(cache[key] === undefined) {
    cache[key] = ++this.counter;
  }

  return cache[key];
};

//
// ### function generate ()
// Bumps and returns unique counter
//
Identifier.prototype.generate = function() {
  return ++this.counter;
};

//
// ### function stringify (v)
// #### @v {any}
// Converts value to string (via JSON.stringify) if it's not already string
// (or undefined)
//
utils.stringify = function stringify(v) {
  if (v === undefined) return 'undefined';

  return typeof v !== 'string' ? JSON.stringify(v) : v;
};

//
// ### function errorHandler (source)
// #### @source {String} source code
// Internal function. Should be moved to ometajs
//
utils.errorHandler = function errorHandler(source) {
  return function(m, i) {
    var err = new Error('Match failed ' + source.slice(i - 15, i + 15));
    err.errorPos = i;

    throw err;
  };
};
