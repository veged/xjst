var assert = require('assert');
var util = require('util');
var entities = require('./');

var GenericBody = entities.GenericBody;

function Map(compiler, pairs) {
  GenericBody.call(this, compiler);

  this.shareable = false;
  this.pairs = {};
  if (pairs && pairs.length >= 1) {
    this.predicate = pairs[0].predicate.getExpr();
    this.predicateId = pairs[0].predicate.id;

    pairs.forEach(function(pair) {
      pair.bodies.forEach(function(body) {
        assert(pair.predicate.value !== null);
        this.add(this.predicate, pair.predicate.value, body);
      }, this);
    }, this);
  } else {
    this.predicate = null;
    this.predicateId = null;
  }

  this.compiler.registerMap(this);
};
util.inherits(Map, GenericBody);
exports.Map = Map;

Map.prototype.getChildren = function getChildren() {
  return Object.keys(this.pairs).map(function(key) {
    var pair = this.pairs[key];
    return pair.bodies;
  }, this).reduce(function(left, right) {
    return left.concat(right);
  }, []);
};

Map.prototype.mapChildren = function mapChildren(fn, ctx) {
  Object.keys(this.pairs).forEach(function(key) {
    var pair = this.pairs[key];
    pair.bodies = pair.bodies.map(fn, ctx);
  }, this);
};

Map.prototype.add = function add(predicate, value, body) {
  assert(value.type === 'Literal');
  if (this.predicate === null) {
    this.predicate = predicate;
    this.predicateId = this.compiler.getId(predicate);
  }

  var valueId = this.compiler.getId(value);
  body.shareable = false;
  if (!this.pairs[valueId]) {
    this.pairs[valueId] = {
      value: value,
      bodies: [body]
    };
  } else {
    this.pairs[valueId].bodies.push(body);
  }
};

Map.prototype.getMap = function getMap() {
  return {
    type: 'VariableDeclaration',
    kind: 'var',
    declarations: [{
      type: 'VariableDeclarator',
      id: this.compiler.getMapName(this),
      init: {
        type: 'ObjectExpression',
        properties: Object.keys(this.pairs).map(function(id) {
          var pair = this.pairs[id];
          var out = [];
          if (pair.bodies.length === 1) {
            out = out.concat(pair.bodies[0].render(true).apply);
          } else {
            pair.bodies.forEach(function(body) {
              out = out.concat(body.render().apply);
            });
          }
          out = out.concat({
            type: 'ReturnStatement',
            argument: this.compiler.ref
          });
          return {
            type: 'Property',
            key: pair.value,
            value: {
              type: 'FunctionExpression',
              id: null,
              params: [ this.compiler.ctx, this.compiler.ref ],
              defaults: [],
              rest: null,
              generator: false,
              expression: false,
              body: {
                type: 'BlockStatement',
                body: out
              }
            },
            kind: 'init'
          }
        }, this)
      }
    }]
  };
};

Map.prototype.render = function render() {
  assert(this.predicate !== null);
  var res = { type: 'Identifier', name: '__$mr' },
      check = this.compiler.checkRef(res);

  return this.wrapResult({
    apply: [{
      type: 'VariableDeclaration',
      kind: 'var',
      declarations: [{
        type: 'VariableDeclarator',
        id: res,
        init: {
          type: 'MemberExpression',
          computed: true,
          object: this.compiler.getMapName(this),
          property: this.predicate
        }
      }]
    }, {
      type: 'IfStatement',
      test: res,
      consequent: {
        type: 'BlockStatement',
        body: [{
          type: 'ExpressionStatement',
          expression: {
            type: 'AssignmentExpression',
            operator: '=',
            left: res,
            right: {
              type: 'CallExpression',
              callee: res,
              arguments: [this.compiler.ctx, this.compiler.ref]
            }
          }
        }].concat(check.apply)
      },
      alternate: null
    }]
  });
};
