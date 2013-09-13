var xjst = require('../..');
var assert = require('assert');
var esprima = require('esprima');
var uglify = require('uglify-js');

describe('Compiler.jailVars', function() {
  function unit(name, src, dst) {
    it(name, function() {
      var ast = xjst.compiler.create().jailVars(esprima.parse(src)),
          out = uglify.AST_Node.from_mozilla_ast(ast).print_to_string();

      assert.equal(out, dst);
    });
  }

  unit('global var', 'a', 'a;');
  unit('local var', 'var a', 'var a__$0;');
  unit('local var and use', 'var a;a', 'var a__$0;a__$0;');
  unit('local var and define', 'var a;a=1', 'var a__$0;a__$0=1;');
  unit('local var and computed property', 'var x = 1;o[x]',
       'var x__$0=1;o[x__$0];');
  unit('local var and not-computed property', 'var x = 1;o.x',
       'var x__$0=1;o.x;');
  unit('function with local use', 'function a() {var x = 1; return x}',
       'function a__$0(){var x__$1=1;return x__$1}');
  unit('function with outer use', 'var x = 1;function a() {return x}',
       'var x__$0=1;function a__$1(){return x__$0}');
});
