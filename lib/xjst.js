var xjst = exports;

// Export utils
xjst.utils = require('./xjst/utils');

// Export ometa's parser/compiler
try {
  xjst.ometa = require('../build/ometa/xjst');
} catch(e) {
  require('ometajs'); // for patching require.extensions
  xjst.ometa = require('./xjst/ometa/xjst');
}

// Export compiler stuff
xjst.compile = require('./xjst/compiler').compile;

// Export CLI stuff
xjst.run = require('./xjst/cli').run;
xjst.process = require('./xjst/cli').process;
