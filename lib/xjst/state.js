var xjst = require('../xjst'),
    utils = xjst.utils,
    state = exports;

//
// ### function State (parent, options)
// #### @parent {State} (optional) Setup inheritance
// #### @options {Object} (optional) State configuration
// Node's state manager constructor
//
function State(parent, options) {
  // We'll hold mutliple possible states
  if (parent) {
    this.states = utils.clone(parent.states);
    this.mutual = parent.mutual;
    this.options = parent.options;
  } else {
    this.states = { high: {}, low: {} };
    this.mutual = false;
    this.options = options || {};
  }
}

//
// ### function create (parent, key, value, options)
// #### @parent {State} (optional) parent state
// #### @key {String|Number} (optional, needs @parent) Property name to change
// #### @value {any} (optional, needs @parent) Value to set
// #### @options {Object} (optional) State configuration
// State's constructor's wrapper
//
// Also possible to call with only `options` argument passed:
// state.create({ ... options ... }) )
//
exports.create = function create(parent, key, value, options) {
  // First argument can be options object
  if (typeof parent === 'object' && !(parent instanceof State)) {
    options = parent;
    parent = undefined;
  }

  var state = new State(parent, options);

  if (key) state.set(key, value);

  return state;
};

//
// ### function set (key, value)
// #### @key {String|Number} Property name to change
// #### @value {any} Value to set
// Changes state
//
State.prototype.set = function set(key, value) {
  if (Array.isArray(value)) {
    this.states.high[key] = value;
    delete this.states.low[key];
  } else {
    this.states.high[key] = [value];
    this.states.low[key] = value;
  }
};

//
// ### function has (key, value)
// #### @key {String|Number} Property name to change
// #### @value {any} (optional) Check equality to this value
// Checks low state
//
State.prototype.has = function has(key, value) {
  var current = this.states.low[key];

  if (current === undefined) return false;
  if (value === undefined) return true;

  return current === value;
};

//
// ### function unset (key)
// #### @key {String|Number} Property name to change
// Removes state info
//
State.prototype.unset = function set(key, value) {
  delete this.states.high[key];
  delete this.states.low[key];
};

//
// ### function clone ()
// Returns state's clone
//
State.prototype.clone = function clone() {
  return new State(this);
};

//
// ### function equalTo (state)
// #### @state {State} target state
// Returns true if states are equal
//
State.prototype.equalTo = function equalTo(state) {
  var source = this.states,
      target = state.states;

  return utils.stringify(source.high) === utils.stringify(target.high) &&
         utils.stringify(source.low) === utils.stringify(target.low);
};

//
// ### function isInlineable ()
// Returns true if apply with this state can be inlined by creating sub-tree
//
State.prototype.isInlineable = function isInlineable() {
  // TODO Determine optimal length
  return Object.keys(this.states.low).length > 5;
};

//
// ### function merge (source)
// #### @source {State} State to merge with
// Updates state with information in @source
//
State.prototype.merge = function merge(source) {
  var self = this,
      states = this.states;

  // Intersect sets
  Object.keys(states.low).forEach(function(key) {
    if (!source.states.low[key] &&
        source.states.low[key] !== states.low[key]) {
      delete states.low[key];
    }
  });

  // If current state or `source` is mutual skip high-state merging
  if (!this.mutual) this.mutual = source.mutual;
  if (this.mutual) {
    states.high = {};
    return;
  }

  // Selectively join states
  var extended = 0;

  Object.keys(source.states.high).forEach(function(key) {
    if (states.high[key]) {
      extended++;
      source.states.high[key].forEach(function(value) {
        if (states.high[key].indexOf(value) === -1) {
          states.high[key].push(value);
        }
      });
    } else {
      states.high[key] = source.states.high[key].slice();
    }
  });

  // Handle mutual states
  // Merging high-states like:
  // { a: [1], b: [2] } and { a: [3], b: [4] }
  // will result in { a: [1,3], b: [2,4] } which is inconsistent,
  // because context equal to { a: 1, b: 4 } will not reach node with this state
  if (extended > 1) this.mutual = true;
  if (this.mutual) {
    states.high = {};
    return;
  }

  if (this.options.values) {
    var values = this.options.values;

    // Omit predicate values' information if it lists all possible values
    // i.e [v1, v2, v3, ..., null]
    var high = {};
    Object.keys(states.high).forEach(function(key) {
      var full = [null].concat(values[key]).every(function(value) {
        if (value !== null) value = utils.stringify(value);
        return states.high[key].indexOf(value) !== -1;
      });

      if (!full) high[key] = states.high[key];
    });
    states.high = high;
  }
};

//
// ### function isReachable (state)
// #### @state {State} Target state
// Checks if state is reachable from current one
// Returns positive difference between states, or zero
//
State.prototype.isReachable = function isReachable(state) {
  // Skip mutual states
  if (state.mutual) return;

  var current = this.states.high,
      next = state.states.high,
      currentKeys = Object.keys(current),
      nextKeys = Object.keys(next);

  // If current node knows more info - next is unreachable
  if (nextKeys.length > currentKeys.length) return -1;

  var reachable = currentKeys.every(function(key) {
    if (!next[key]) return true;

    return next[key].every(function(value) {
      return current[key].indexOf(value) !== -1;
    });
  }) && nextKeys.every(function(key) {
    return currentKeys.indexOf(key) !== -1;
  });

  return reachable ? currentKeys.length - nextKeys.length : -1;
};

//
// ### function hash ()
// Returns state's hash
//
State.prototype.hash = function hash() {
  utils.hashName(utils.stringify(this.states));
};
