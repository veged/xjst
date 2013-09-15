var assert = require('assert');
var estraverse = require('estraverse');

function Jailer() {
  this.jailIndex = 0;
};
exports.Jailer = Jailer;

Jailer.create = function create() {
  return new Jailer();
};

Jailer.prototype.jail = function jail(node) {
  var self = this,
      current = {},
      stack = [current];

  function register(name, parent) {
    var scope = parent ? stack[stack.length - 2] : current;
    assert.ok(scope);

    if (!scope.hasOwnProperty(name))
      scope[name] = name + '__$' + self.jailIndex++;

    return { type: 'Identifier', name: scope[name] };
  }

  (Array.isArray(node) ? node : [node]).forEach(function(node) {
    estraverse.replace(node, {
      enter: function(node, parent, notify) {
        if (node.type === 'VariableDeclarator') {
          // Change variable's name
          return {
            type: 'VariableDeclarator',
            id: register(node.id.name),
            init: node.init
          };
        } else if (node.type === 'Identifier') {
          if ((parent.type === 'FunctionExpression' ||
               parent.type === 'FunctionDeclaration')) {
            if (node === parent.id) {
              return register(node.name, true);
            } else if (parent.params.indexOf(node) !== -1) {
              current[node.name] = node.name;
            }
          } else if (!(parent.type === 'Property' && parent.key === node) &&
                     !(parent.type === 'MemberExpression' &&
                       parent.computed === false &&
                       parent.property === node)) {
            var name;
            for (var i = stack.length - 1; i >= 0; i--) {
              if (stack[i].hasOwnProperty(node.name)) {
                name = stack[i][node.name];
                break;
              }
            }
            return {
              type: 'Identifier',
              name: name || node.name
            };
          }
        } else if (node.type === 'FunctionExpression' ||
                   node.type === 'FunctionDeclaration') {
          // Enter new scope
          current = {};
          stack.push(current);
        }
      },
      leave: function(node) {
        if (node.type === 'FunctionExpression' ||
            node.type === 'FunctionDeclaration') {
          stack.pop();
          current = stack[stack.length - 1];
          assert(stack.length > 0);
        }
      }
    });
  });

  return node;
};
