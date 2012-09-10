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
  var known = true;

  if (this.options.values && !Array.isArray(value) &&
      typeof value === 'string') {
    known = this.options.values[key].some(function(val) {
      return value === utils.stringify(val);
    });
  }

  if (Array.isArray(this.states.high[key])) {
    var arrval = Array.isArray(value) ? value : [known ? value : null];
    var possible = arrval.every(function(value) {
      return this.states.high[key].some(function(our) {
        return our === value;
      });
    }, this);

    if (!possible) this.mutual = true;
  }

  if (Array.isArray(value)) {
    this.states.high[key] = value;
    delete this.states.low[key];
  } else {
    this.states.high[key] = [known ? value : null];
    this.states.low[key] = known ? value : null;
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
// ### function isGhostable ()
// Returns true if node's state is small and node is on the top of tree
//
State.prototype.isGhostable = function isGhostable() {
  // TODO Determine optimal length
  return Object.keys(this.states.low).length < 2;
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
    return;
  }

  // Selectively join states
  var extended = 0, added = 0;

  Object.keys(source.states.high).forEach(function(key) {
    if (states.high[key]) {
      var wasExtended = false;
      source.states.high[key].forEach(function(value) {
        if (states.high[key].indexOf(value) === -1) {
          states.high[key].push(value);
          wasExtended = true;
        }
      });
      if (wasExtended) extended++;
    } else {
      states.high[key] = source.states.high[key].slice();
      added++;
    }
  });

  // Handle mutual states
  // Merging high-states like:
  // { a: [1], b: [2] } and { a: [3], b: [4] }
  // will result in { a: [1,3], b: [2,4] } which is inconsistent,
  // because context equal to { a: 1, b: 4 } will not reach node with this state
  if (extended > 1 || added > 1) this.mutual = true;
  if (this.mutual) {
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
// #### @merge {boolean} Merge high and low states
// Checks if state is reachable from current one
// Returns positive difference between states, or zero
//
State.prototype.isReachable = function isReachable(state, merge) {
  // Skip mutual states
  if (!state) return this.mutual ? -1 : 0;
  if (state.mutual || this.mutual) return -1;

  // If current node knows more info - next is unreachable
  // (low state check)
  if (Object.keys(state.states.low).length >
      Object.keys(this.states.low).length) {
    return -1;
  }

  var current = merge ? this._mergedState() : this.states.high,
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
// ### function _mergedState ()
// Returns low state merged with high state
// Internal, needed for one-way redirection
//
State.prototype._mergedState = function _mergedState() {
  if (!this.mutual) return this.states.high;

  var result = utils.clone(this.states.high),
      low = this.states.low;

  // Low state has more priority than high
  Object.keys(low).forEach(function(key) {
    result[key] = [low[key]];
  });

  return result;
};

//
// ### function hash ()
// Returns state's hash
//
State.prototype.hash = function hash() {
  return utils.hashName(utils.stringify(this.states));
};
