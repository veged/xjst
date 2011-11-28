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
  this.states.high[key] = value;
  this.states.low[key] = value;
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

  // Intersect sets
  Object.keys(source.low).forEach(function(key) {
    if (utils.stringify(states.low[key]) !==
        utils.stringify(source.states.low[key])) {
      delete states.low[key];
    }
  });

  // If current state or `source` is mutual skip high-state merging
  this.mutual || (this.mutual = source.mutual);
  if (this.mutual) return;

};

//
// ### function isReachable (state)
// #### @state {State} Target state
// Checks if state is reachable from current one
//
State.prototype.isReachable = function isReachable(state) {
  var currentStates = this.states,
      ref = {},
      results;

  results = state.states.map(function(next) {
    var scores = currentStates.map(function(current) {

      var keys = {
        current: Object.keys(current),
        next: Object.keys(next)
      };

      // If next state has more information than current one
      if (keys.current.length < keys.next.length) return 0;

      // If every key in next state present in current one
      // This sequence of states (current -> next) is possible
      return keys.next.every(function(key) {
        return utils.stringify(next[key]) === utils.stringify(current[key]);
      }) ? keys.current.length : 0;
    });

    if (scores.length <= 0) return 0;

    return scores.reduce(function(prev, curr) {
      return Math.max(prev, curr);
    });
  });

  // No results - no score
  if (results.length <= 0) return 0;

  // Return minimum score
  return results.reduce(function(prev, curr) {
    return Math.min(prev, curr);
  });
};

//
// ### function hash ()
// Returns state's hash
//
State.prototype.hash = function hash() {
  utils.hashName(utils.stringify(this.states));
};
