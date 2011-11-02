## 2011.11.3, Version 0.1.5

### API Changes:

* Split ometa into Parser, Translator, Compiler. Parser+Compiler isn't
  translating locals.
* Given string as first argument xjst.compile() will return compiled and
  evaluated version of template
* Given array (ast-tree) as first argument xjst.compile() will return source
  code (compatibility mode)
* New arguments: xjst.compile(source, filename, options).

  `filename` is used for evaluation (visible in stack traces).
  `options`: `wrap` (default: true) - wrap code into
  `(function(exports){...})()` statement.
  `merge` (default: false) - adding hash information required for merging
  templates.
