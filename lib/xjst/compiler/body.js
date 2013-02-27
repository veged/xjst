var assert = require('assert'),
    estraverse = require('estraverse');

var Predicate = require('./predicate').Predicate;

function Body(compiler, body) {
  this.compiler = compiler;
  this.body = body;
  this.applyNext = null;
  this.applyFlag = null;
};
exports.Body = Body;

Body.prototype.rollOut = function rollOut() {
  this.body.forEach(function(stmt) {
    var self = this;

    estraverse.replace(stmt, {
      leave: function(node) {
        if (node.type !== 'CallExpression') return;

        var callee = node.callee;
        if (callee.type !== 'CallExpression') return;

        // apply(ctx)(locals)
        if (callee.callee.type === 'Identifier') {
          var name = callee.callee.name;
          if (name !== 'apply' && name !== 'applyNext') return;

          return self.rollOutApply(name,
                                   node.callee.arguments[0],
                                   node.arguments);
        // local(ctx)(locals)(body)
        } else if (callee.callee.type === 'CallExpression' &&
                   callee.callee.callee.type === 'Identifier') {
          var name = callee.callee.callee.name;
          if (name !== 'local') return;

          return self.rollOutLocal(node.callee.callee.arguments[0],
                                   node.callee.arguments,
                                   node.arguments[0]);
        } else {
          return;
        }
      }
    });
  }, this);
};

// Roll-out apply expression
Body.prototype.rollOutApply = function rollOutApply(type, ctx, changes) {
  // Process changes in local
  if (changes.length > 0) {
    return this.rollOutLocal(ctx, changes, this.rollOutApply(type, ctx, []));
  }

  if (type === 'apply') {
    return {
      type: 'CallExpression',
      callee: {
        type: 'MemberExpression',
        computed: false,
        object: { type: 'Identifier', name: 'apply' },
        property: { type: 'Identifier', name: 'call' }
      },
      arguments: [ ctx || { type: 'ThisExpression' } ]
    };
  }

  // applyNext, heh
  if (!this.applyNext) {
    this.applyFlag = this.compiler.getApplyFlag();
    this.applyNext = new Predicate(this.compiler, {
      type: 'UnaryExpression',
      operator: '!',
      argument: {
        type: 'MemberExpression',
        computed: true,
        object: { type: 'ThisExpression' },
        property: this.applyFlag
      }
    }, {
      type: 'Literal',
      value: true
    });
  }

  return this.rollOutApply('apply', ctx, changes.concat({
    type: 'ObjectExpression',
    properties: [{
      type: 'Property',
      key: this.applyFlag,
      value: { type: 'Literal', value: true },
      kind: 'init'
    }]
  }));
};

// Roll-out local expression
Body.prototype.rollOutLocal = function rollOutLocal(ctx, changes, body) {
  var pairs = [],
      pairIndex = 0;

  function getVar() {
    return { type: 'Identifier', name: '__$l' + pairIndex++ };
  }

  function addPair(prop, value) {
    pairs.push({
      prop: prop,
      value: value,
      variable: getVar()
    });
  }

  // Generate list of prop/value pairs
  changes.forEach(function(change) {
    assert.equal(change.type, 'ObjectExpression');
    change.properties.forEach(function(property) {
      var keys = (property.key.name || property.key.value).split('.'),
          prop = keys.reduce(function(left, right, i, l) {
            var sub = {
              type: 'MemberExpression',
              computed: true,
              object: left,
              property: { type: 'Literal', value: right }
            };

            return sub;
          }, ctx || { type: 'ThisExpression' });

      addPair(prop, property.value);
    }, this);
  }, this);

  var result = { type: 'Identifier', name: '__$r' };
  var before = [];
  var after = [];

  // Declare __$r var
  before.push({
    type: 'VariableDeclaration',
    kind: 'var',
    declarations: [{
      type: 'VariableDeclarator',
      id: result,
      init: null
    }]
  });

  pairs.forEach(function(pair) {
    before.push({
      type: 'VariableDeclaration',
      kind: 'var',
      declarations: [{
        type: 'VariableDeclarator',
        id: pair.variable,
        init: pair.prop
      }]
    }, {
      type: 'ExpressionStatement',
      expression: {
        type: 'AssignmentExpression',
        operator: '=',
        left: pair.prop,
        right: pair.value
      }
    });

    var left = pair.prop;

    // Store object
    if (left.object !== ctx) {
      var tmp = getVar();
      before.push({
        type: 'VariableDeclaration',
        kind: 'var',
        declarations: [{
          type: 'VariableDeclarator',
          id: tmp,
          init: left.object
        }]
      });

      left = {
        type: 'MemberExpression',
        computed: true,
        object: tmp,
        property: left.property
      };
    }

    after.push({
      type: 'ExpressionStatement',
      expression: {
        type: 'AssignmentExpression',
        operator: '=',
        left: left,
        right: pair.variable
      }
    });
  });

  return {
    type: 'CallExpression',
    callee: {
      type: 'FunctionExpression',
      id: null,
      params: [],
      defaults: [],
      rest: null,
      generator: false,
      expression: false,
      body: {
        type: 'BlockStatement',
        body: [].concat(before, {
          type: 'ExpressionStatement',
          expression: {
            type: 'AssignmentExpression',
            operator: '=',
            left: result,
            right: body.type === 'FunctionExpression' ? {
              type: 'CallExpression',
              callee: body,
              arguments: []
            } : body
          }
        }, after, {
          type: 'ReturnStatement',
          argument: result
        })
      }
    },
    arguments: []
  };
};

// Render body
Body.prototype.render = function render() {
  return {
    apply: this.body,
    other: null
  };
};
