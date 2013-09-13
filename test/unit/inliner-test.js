var xjst = require('../..');
var assert = require('assert');
var esprima = require('esprima');
var uglify = require('uglify-js');

describe('Compiler.inliner', function() {
  function unit(name, src, dst) {
    it(name, function() {
      var ast = xjst.compiler.Inliner.inline(esprima.parse(src));
      var out = uglify.AST_Node.from_mozilla_ast(ast).print_to_string();

      assert.equal(out, dst);
    });
  }

  unit('empty function', '(function() { }).call(this)', '');
  unit('function with single return',
       'p = (function() { return 1 }).call(this)',
       'p=1;');
  unit('function without return',
       'p = (function() { }).call(this)',
       'p=undefined;');
  unit('function with stmts and return',
       'p = (function() { a(); return b() }).call(this)',
       'a();p=b();');
  unit('function inside if',
       'if (r) { var p = (function() { a(); return 2 }).call(this) }',
       'if(r){a();var p=2}');

  // Non-inlineable
  unit('non-inlineable',
       'var p = (function() { if (p) return 1; }).call(this)',
       'var p=function(){if(p)return 1}.call(this);');
});
