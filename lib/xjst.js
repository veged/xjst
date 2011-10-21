var xjst = exports,
    ometajs = require('ometajs');

// Export utils
xjst.utils = require('./xjst/utils');

// Export ometa's parser/compiler
xjst.ometa = require('./xjst/ometa/xjst');

// Export compiler stuff
xjst.parse = require('./xjst/compiler').parse;
xjst.generate = require('./xjst/compiler').generate;
xjst.compile = require('./xjst/compiler').compile;

// Export CLI stuff
xjst.run = require('./xjst/cli').run;
