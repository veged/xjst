var xjst = exports,
    ometajs = require('ometajs');

// Export utils
xjst.utils = require('./xjst/utils');

// Export ometa's parser/compiler
xjst.ometa = require('./xjst/ometa/xjst');

// XXX this is temporary fix to make API compatible
xjst.XJSTParser = xjst.ometa.XJSTParser;
xjst.XJSTCompiler = xjst.ometa.XJSTCompiler;

// Export compiler stuff
xjst.parse = require('./xjst/compiler').parse;
xjst.generate = require('./xjst/compiler').generate;
xjst.compile = require('./xjst/compiler').compile;

// Export CLI stuff
xjst.run = require('./xjst/cli').run;
