var assert = require('assert');

var compiler = require('../');
var Map = compiler.Map;
var Pair = compiler.Pair;

function MapFlattener(compiler) {
  this.compiler = compiler;

  this.separator = '::';
}
exports.MapFlattener = MapFlattener;

MapFlattener.create = function create(compiler) {
  return new MapFlattener(compiler);
};

MapFlattener.prototype.walk = function walk(node, parent) {
  // Flatten all children first
  node.mapChildren(function(child) {
    return this.walk(child, node);
  }, this);

  if (!(node instanceof Map))
    return node;

  // Check that children are maps too
  var hasNested = node.getChildren().some(function(child) {
    if (child instanceof Map)
      return true;
    else
      return false;
  });

  // Flatten only parent node for now
  if (parent || !hasNested)
    return node;

  // Clone all pairs
  var pairs = Object.keys(node.pairs).map(function(key) {
    return {
      value: node.pairs[key].value,
      bodies: node.pairs[key].bodies
    };
  });

  // Filter map children and find most popular subpredicate
  var subpredicates = {};
  var subpredicateExprs = {};
  pairs = pairs.filter(function(pair) {
    pair.bodies = pair.bodies.filter(function(body) {
      if (!(body instanceof Map) || !body.predicate)
        return false;

      if (!subpredicates[body.predicateId])
        subpredicates[body.predicateId] = 1;
      else
        subpredicates[body.predicateId]++;
      subpredicateExprs[body.predicateId] = body.predicate;

      return true;
    });
    return pair.bodies.length !== 0;
  });

  var subpredicateId = Object.keys(subpredicates).map(function(key) {
    return { id: key, count: subpredicates[key] };
  }).sort(function(a, b){
    return b.count - a.count;
  })[0].id | 0;
  var subpredicate = subpredicateExprs[subpredicateId];

  // Filter subbodies with different predicate
  pairs = pairs.filter(function(pair) {
    pair.bodies = pair.bodies.filter(function(body) {
      return body.predicateId === subpredicateId;
    });
    return pair.bodies.length !== 0;
  });

  // Flatten
  var flatMap = new Map(this.compiler);
  var predicate = {
    type: 'BinaryExpression',
    operator: '+',
    left: node.predicate,
    right: {
      type: 'BinaryExpression',
      operator: '+',
      left: { type: 'Literal', value: this.separator },
      right: subpredicate
    }
  };
  pairs.forEach(function(pair) {
    assert.equal(pair.value.type, 'Literal');

    var left = pair.value.value;
    pair.bodies.forEach(function(body) {
      Object.keys(body.pairs).forEach(function(subkey) {
        var subpair = body.pairs[subkey];
        assert.equal(subpair.value.type, 'Literal');

        var key = left + this.separator + subpair.value.value;
        subpair.bodies.forEach(function(subbody) {
          flatMap.add(predicate, { type: 'Literal', value: key }, subbody);
        });
      }, this);
    }, this);
  }, this);

  return new Pair(this.compiler, flatMap, node);
};

MapFlattener.prototype.flatten = function flatten(program) {
  return program.map(function(node) {
    return this.walk(node);
  }, this);
};
