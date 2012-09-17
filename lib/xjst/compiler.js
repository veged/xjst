var xjst = require('../xjst'),
    fs = require('fs'),
    path = require('path'),
    vm = require('vm'),
    uglify = require('uglify-js'),
    utils = xjst.utils,

    XJSTParser = xjst.ometa.XJSTParser,
    XJSTTranslator = xjst.ometa.XJSTTranslator,
    XJSTCompiler = xjst.ometa.XJSTCompiler,
    XJSTLocalAndApplyCompiler = xjst.ometa.XJSTLocalAndApplyCompiler;

//
// ### function parse (code, filename, id)
// #### @code {String} XJST source
// #### @filename {String} (optional) Template's filename
// #### @id {Number} (internal) id
// #### @identifier {Identifier} internal
// Returns AST for input string
//
exports.parse = function parse(code, filename, id, identifier) {
  var tree = XJSTParser.matchAll(code, 'topLevel', undefined,
                                 utils.errorHandler(code));

  if (identifier === undefined) id = 0;
  tree = xjst.translate(tree, id, identifier);

  // Load parent templates
  if (filename) {
    var dir = path.dirname(filename),
        templates = tree[1],
        identifier = tree[3];

    // Store initial id
    tree[3] = [id];

    // Load each dependency
    tree[2].map(function(filename) {
      return path.resolve(
        dir,
        path.extname(filename) ? filename : filename + '.xjst'
      );
    }).forEach(function(filename) {
      var content = fs.readFileSync(filename).toString(),
          dependency = exports.parse(content, filename, ++id, identifier);

      // And add it's templates to current ones
      [0, 1, 3].forEach(function (i) {
        tree[i] = [].concat(tree[i], dependency[i]);
      });
    });

    // If we're in nested dependency or
    // this transformation has at least one dependency
    if (tree[3].length > 1 || id > 0) {
      templates.forEach(function(template) {
        tree[3].forEach(function(id) {
          // Add this.__d%id === undefined to each template statement
          // This will allow us to do super-calls
          var predicate = ['getp', ['string', '__d' + id], ['this']];
          template[0].unshift([
            XJSTTranslator._identify(identifier, predicate),
            predicate,
            ['get', 'undefined']
          ]);
        });
      });
    }
  }

  return tree;
};

//
// ### function translate (tree)
// #### @tree {Array} AST Tree
// Translates XJST AST into usable form
//
exports.translate = function translate(tree, id, identifier) {
  if (identifier === undefined) {
    return XJSTTranslator.matchAll(tree, 'topLevel', [id],
                                   utils.errorHandler(tree));
  } else {
    return XJSTTranslator.matchAll(tree, 'topLevelEx', [id, identifier],
                                   utils.errorHandler(tree));
  }
}

//
// ### function generate (ast, options)
// #### @ast {Array} XJST-specific AST
// #### @options {Object} compiler options
// Compile XJST template and return it's source code (in javascript)
//
exports.generate = function generate(ast, options) {
  var templates = ast[1],
      predicateMap = {},
      predicateValues = utils.getPredicateValues(templates),

      identifier = new utils.Identifier(),

      hashs = {},
      fns = {};

  // Set default options
  if (!options) options = {};

  // Wrap module to allow client-side usage
  if (options.wrap !== false) options.wrap = true;

  // Include long function names for merging templates on client-side
  if (options.merge !== true) options.merge = false;
  if (options['force-inline'] !== true && process.env.XJST_FORCE_INLINE) {
    options['force-inline'] = true;
    options['inline-limit'] = parseInt(process.env.XJST_INLINE_LIMIT, 10);
  }

  // Choose optimization engine
  var engine = xjst.engines[options.engine] ||
               xjst.engines[process.env.XJST_ENGINE] ||
               xjst.engines['sort-group'],
      engineOptions = {
        state: xjst.state.create({ values: predicateValues }),
        values: predicateValues,
        id: identifier
      };

  // Init serializer
  var serializer = xjst.helpers.serializer.create(options);

  // Engine wrapper
  function compile(templates, opts) {
    return engine.execute(templates, options, opts || engineOptions);
  };

  // Create predicate map : id => stringified AST
  templates.forEach(function(template) {
    template[0].forEach(function(predicate) {
      if (!predicateMap[predicate[0]]) {
        predicateMap[predicate[0]] = utils.stringify(predicate[1]);
      }
    });
  });

  var body;

  if (options['no-opt']) {
    // Just compile `template` to `if`, and `local`
    body = [
      XJSTCompiler.match(ast, 'topLevel')
    ];
  } else {
    // Optimize recursion and minimize comparisons tree
    var tree = compile(templates);

    // Inline recursive calls if possible
    tree = xjst.transforms.apply.process(tree, ast, {
      'force-inline': options['force-inline'],
      compile: compile,
      engine: engine,
      identifier: identifier,
      map: predicateMap,
      options: options,
      values: predicateValues,
      serializer: serializer,
    });

    // Lift variables from local expressions
    tree = xjst.transforms.vars.process(tree);

    // Finally render tree
    body = [
      XJSTCompiler.match(ast[0], 'other'),
      serializer.render(tree)
    ];
  }

  if (options['export-graph']) {
    xjst.exporter.write(tree, options['export-graph']);
  }

  // Wrap output for client-side usage
  var result;
  if (options.wrap) {
    result = ['(function(exports) {'].concat(
      body.join('\n'),
      'return exports})(typeof exports === "undefined"? {} : exports)'
    ).join('\n');
  } else {
    result = body.join('\n');
  }

  // Compress or beautify the output
  if (options.uglify) {
    return uglify(result);
  } else {
    return uglify.uglify.gen_code(uglify.parser.parse(result),
                                  { beautify: true });
  }
};

//
// ### function compile(code, filename, options)
// #### @code {String} Input XJST source
// #### @filename {String} Optional filename for better stack traces
// #### @options {Object} Compilation options
// Parses and compiles XJST template to javascript function
//
exports.compile = function compile(code, filename, options) {
  // XXX this is temporary fix to make API compatible
  if (Array.isArray(code)) return exports.generate(code, options || filename);

  // filename is optional argument
  if (options === undefined && typeof filename === 'object') {
    options = filename;
    filename = null;
  }

  // Compile and evaluate source
  var parsed = exports.parse(code, filename),
      compiled = exports.generate(parsed, options),
      evaluated = vm.runInThisContext(compiled, filename);

  // Provide nice API by returning the function instead of object
  function render(locals) {
    return evaluated.apply.call(locals);
  }

  render.apply = evaluated.apply;
  render.mergeWith = evaluated.mergeWith;
  render.config = evaluated.config;

  return render;
};
