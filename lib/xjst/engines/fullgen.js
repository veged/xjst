var xjst = require('../../xjst'),
    utils = xjst.utils;

//
// ### function Merger ()
// Merge common tree parts and identify them
//
function Merger(identifier) {
  this.cache = {};
  this.identifier = identifier || new utils.Identifier();
}

//
// ### function merge (obj)
// #### @obj {Object} part of AST
// Searches cache for obj and for all it's successors
// If found - returns cached object instead of original
// If not - pushes object to cache and returns it
//
Merger.prototype.merge = function merge(obj) {
  var self = this,
      hash,
      size;

  if (obj.tag) {
    hash = ['switch ', JSON.stringify(obj.tag), '{'];
    size = 0;

    obj.cases.forEach(function (c){
      c[1] = self.merge(c[1]);
      size += c[1].size;
      hash.push(c[1].hash, ' ');
    });
    obj['default'] = self.merge(obj['default']);
    size += obj['default'].size;

    hash.push(obj['default'].hash, '}');
    hash = utils.sha1(hash.join(''));
  } else {
    var json = JSON.stringify(obj.stmt);
    hash = obj.hash || utils.sha1(json);

    // XXX Strange Euristics
    size = json.length / 3200;
  }

  obj.size = size;

  if(this.cache[hash] !== undefined) {
    obj.id = this.cache[hash].id;
  } else {
    this.cache[obj.hash = hash]  = obj;
    obj.id = this.identifier.generate();
  }

  return this.cache[hash];
};

//
// ### function engine (templates, options, values)
// #### @templates {Array} AST
// #### @options {Object} Compiler options
// #### @config {Object} Engine configuration
// Returns optimized tree (via fullgen algorithm)
//
exports.execute = function engine(templates, options, config) {
  var initialState = config.state,
      values = config.values,

      // Use initial id from config
      merger = new Merger(config.id),
      merge = merger.merge.bind(merger),
      unique = new utils.Identifier();

  function addNode(node, state) {
    if (node.state) {
      node.state.merge(state);
    } else {
      node.state = state.clone();
    }

    if (options.merge && node.tag) node.longId = node.state.hash();

    return node;
  }

  function traverse(i, j, state) {
    var template = templates[i];

    // If we stepped out of templates - we're in unexpected place
    // throw exception
    if (!template) {
      return addNode(
        merge({
          unexpected: true,
          fn: true,
          stmt: ['throw', ['new', 'Error', ['this']]]
        }),
        state
      );
    }

    // If we stepped out of predicates - add template's body to tree
    var subMatch = template[0][j];
    if (!subMatch) {
      return addNode(merge({ stmt: template[1], template: i }), state);
    }

    // Skip unreachable templates
    // template (p1 === c1 && p2 === c2)
    var known = template[0].slice(j + 1).some(function(s) {
      var predicate = utils.stringify(s[1]),
          predicateConst = s[2];

      return state.has(predicate) &&
             !state.has(predicate, utils.stringify(predicateConst));
    });
    if (known) return traverse(i + 1, 0, state);

    var predicate = utils.stringify(subMatch[1]),
        predicateConst = subMatch[2];

    // If we already know value of this predicate
    if (state.has(predicate)) {
      // And if current template's predicate value equals to known
      if (state.has(predicate, utils.stringify(predicateConst))) {
        // Skip this predicate and go further
        return traverse(i, j + 1, state);
      } else {
        // Skip whole template as it's unreachable
        return traverse(i + 1, 0, state);
      }
    } else {
      // Create switch for current predicate and all known values of it
      var result = {};

      result.tag = subMatch[1];
      result.tagId = subMatch[0];
      result.tagStr = predicate;
      result.cases = values[predicate].map(function(v) {
        return [v, traverse(i, j,
                            xjst.state.create(state, predicate,
                                              utils.stringify(v)))];
      });
      result['default'] = traverse(i, j, xjst.state.create(state,
                                                           predicate,
                                                           -unique.generate()));
      return addNode(merge(result), state);
    }
  }

  return traverse(0, 0, initialState.clone());
};

// Export engine's name
exports.name = 'fullgen';
