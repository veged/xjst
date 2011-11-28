var xjst = require('../xjst'),
    utils = xjst.utils,
    state = exports;

//
// ### function State ()
// #### @parent {State} Setup inheritance
// Node's state manager constructor
//
function State(parent) {
  // We'll hold mutliple possible states
  if (parent) {
    this.states = utils.clone(parent.states);
    this.mutual = parent.mutual;
  } else {
    this.states = { high: {}, low: {} };
    this.mutual = false;
  }
};

//
// ### function create (parent, key, value)
// #### @parent {State} (optional) parent state
// #### @key {String|Number} (optional, needs @parent) Property name to change
// #### @value {any} (optional, needs @parent) Value to set
// State's constructor's wrapper
//
exports.create = function create(parent, key, value) {
  var state = new State(parent);

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
  this.states.high[key] = [value];
  this.states.low[key] = [value];
};

//
// ### function clone ()
// Returns state's clone
//
State.prototype.clone = function clone() {
  return new State(this);
};

//
// ### function merge (source)
// #### @source {State} State to merge with
// Updates state with information in @source
//
State.prototype.merge = function merge(source) {
  var self = this,
      states = this.states;

  // Intersects two predicate's values' sets
  function intersect(a, b) {
    return a.filter(function(val) {
      return b.indexOf(val) !== -1;
    })
  };

  // Intersect sets
  Object.keys(states.low).forEach(function(key) {
    if (source.states.low[key]) {
      states.low[key] = intersect(source.states.low[key], states.low[key]);
      if (states.low[key].length > 0) return;
    }
    delete states.low[key];
  });

  // If current state or `source` is mutual skip high-state merging
  this.mutual || (this.mutual = source.mutual);
  if (this.mutual) return;

  // Selectively join states
  var added = 0,
      extended = 0;

  Object.keys(source.states.high).forEach(function(key) {
    if (states.high[key]) {
      extended++;
      source.states.high[key].forEach(function(value) {
        if (states.high[key].indexOf(value) === -1) {
          source.states.high[key].push(value);
        }
      });
    } else {
      added++;
      states.high[key] = source.states.high[key];
    }
  });

  if (added > 1 || extended > 1) this.mutual = true;
};

//
// ### function isReachable (state)
// #### @state {State} Target state
// Checks if state is reachable from current one
//
State.prototype.isReachable = function isReachable(state) {
  return 0;
};

//
// ### function hash ()
// Returns state's hash
//
State.prototype.hash = function hash() {
  utils.hashName(utils.stringify(this.states));
};
