var xjst = require('../../xjst'),
    utils = xjst.utils;

//
// ### function liftState (source, target)
// #### @source {Object} Source state
// #### @target {Object} Target state
// Lifts predicate information from source to target
//
function liftState(source, target) {
  target.state.merge(source.state);

  if (target['switch']) {
    target.cases.forEach(function(branch) {
      liftState(source, branch[1]);
    });

    liftState(source, target['default']);
  }
}

//
// ### function findLastDefault (tree)
// #### @tree {Array} AST
// Returns last default case in switches tree
//
function findLastDefault(tree) {
  if (tree['default']['switch']) return findLastDefault(tree['default']);
  return tree['default'];
}

//
// ### function engine (templates, ptions)
// #### @templates {Array} AST
// #### @options {Object} Compiler options
// #### @values {Object} Hash map of values of each each predicate
// Returns optimized tree (via sort&group algorithm)
//
module.exports = function engine(templates, options, values) {
  // Sort matches by popularity and lexicographically
  function sort(templates) {
    var chart = {};

    templates.forEach(function(template) {
      template[0].forEach(function(match) {
        var key = match[0];

        if (!chart[key]) chart[key] = 0;
        chart[key]++;
      });
    });

    return templates.map(function(template) {
      return [
        template[0].slice().sort(function(a, b) {
          var rateA = chart[a[0]],
              rateB = chart[b[0]],
              strA = utils.stringify(a[1]),
              strB = utils.stringify(b[1]);

          return rateA > rateB ?
              -1
              :
              rateA === rateB ?
                  strA > strB ? 1 : strA === strB ? 0 : -1 : 1;
        }),
        template[1]
      ];
    });
  }

  var errStmt = ['throw', ['new', 'Error']],
      errNode = {
        id: 'e',
        tag: 'unexpected',
        stmt: errStmt,
        fn: true,
        state: xjst.state.create()
      },
      id = 0;

  // Group matches into switches *recursively*
  function group(templates, state) {
    if (!state) state = xjst.state.create();

    // If we can't create groups - return error statement
    if (templates.length === 0) {
      return {
        id: ++id,
        stmt: errStmt,
        state: state.clone()
      };
    }

    var groups = {},
        tags = [];

    // Sort templates (while preserving dependent predicates in right order)
    // and create groups with the equal first predicate
    unzip(sort(zip(templates))).reduce(function(prev, template) {
      var matches = template[0],
          first = matches[0];

      if (!groups[first[0]]) {
        groups[first[0]] = [];
      }

      if (prev === null || prev[0][0][0] !== first[0]) {
        tags.push([first[0], first[1]]);
        groups[first[0]].push({});
      }

      var subGroup = groups[first[0]],
          value = utils.stringify(first[2]);

      // Get latest subgroup
      subGroup = subGroup[subGroup.length - 1];

      if (!subGroup[value]) {
        subGroup[value] = {
          value: first[2],
          items: []
        };
      }

      subGroup[value].items.push([ matches.slice(1), template[1] ]);

      return template;
    }, null);

    // Each first predicate is a `switch(...) {}` tag
    // Go through all tags, creating the nested switches
    // `switch (tag) { case val: switch (tag2) { ... } }`
    var result = { id: ++id, state: state.clone() };
    tags.reduce(function(result, tag) {
      var state = result.state,
          subgroup = groups[tag[0]].shift(),
          tagStr = utils.stringify(tag[1]);

      result['switch'] = tag[1];
      result.switchId = tag[0];

      // `subgroup` is a hashmap of possible predicate values
      result.cases = Object.keys(subgroup).map(function(key) {
        var item = subgroup[key];

        // Create sub-switch
        var def = null,
            items = [];

        // Filter items to remove unreachable clauses
        // (and find body for default clause)
        item.items.every(function(item) {
          if (item[0].length > 0) {
            items.push(item);
            return true;
          } else {
            def = item;
            return false;
          }
        });

        // Clone and change original state by adding new information about
        // current predicate (switch's tag value)
        var subState = xjst.state.create(state, tagStr,
                                         utils.stringify(item.value)),
            subSwitch = group(items, subState);

        // If the `subSwitch` is a switch
        if (subSwitch['switch']) {
          // Find last default statement
          // (probably it's equal to the error statement)
          var lastDef = findLastDefault(subSwitch);

          // Increase it's id
          lastDef.id = ++id;

          // And insert `def` here
          lastDef.stmt = def ? def[1] : errStmt;
        } else {
          subSwitch.id = ++id;
          subSwitch.stmt = def ? def[1] : errStmt;
        }

        return [item.value, subSwitch];
      });

      // Continue branching with unknown value of switch's tag
      result['default'] = {
        id: ++id,
        state: xjst.state.create(state, tagStr, -result.id),
        stmt: errStmt
      };

      return result['default'];
    }, result);

    return result;
  }

  // Zip nested matches together (like `this.a && this.a.b`)
  function zip(templates) {
    return templates.map(function(template) {
      var matches = template[0].slice().map(function(match) {
        var pred = match[1];
        while (pred[0] === 'unop' && pred[1] === '!') pred = pred[2];

        return [utils.stringify(pred), match];
      });

      var grouped = [],
          last = matches.reduce(function(prev, curr, i) {
            if (curr[0].indexOf(prev[0]) === -1) {
              grouped.push(prev);
            } else {
              curr = [prev[0], curr[1].concat([prev[1]])];
            }

            return curr;
          });

      if (grouped.indexOf(last) === -1) grouped.push(last);

      return [
        grouped.map(function(match) {
          return match[1];
        }),
        template[1]
      ];
    });
  }

  // Unzip nested templates
  function unzip(templates) {
    return templates.map(function(template) {
      var grouped = [],
          matches = template[0];

      matches.forEach(function unzip(match) {
        if (match[3]) unzip(match[3]);
        grouped.push([match[0], match[1], match[2]]);
      });

      return [
        grouped,
        template[1]
      ];
    });
  }

  // Propagate errors from the high priority parts of tree to
  // low priority nodes
  function propagateErrors(tree, handlers) {
    if (!handlers) handlers = [];

    function sliceHandlers(handlers, node) {
      var index = handlers.indexOf(node);
      if (index === -1) return handlers;

      return handlers.slice(0, index);
    }

    if (!tree['switch']) return tree;

    var patch;

    handlers = sliceHandlers(handlers, tree);

    if (tree['default']['switch'] || tree['default'].stmt !== errStmt) {
      handlers.push(tree['default']);
    } else {
      if (handlers.length > 0) {
        // Update node's default and lift state
        var handler = handlers[handlers.length - 1];
        liftState(tree, tree['default'] = handler);
        tree.propagated = true;
      }
    }

    tree.cases.forEach(function(branch) {
      propagateErrors(branch[1], handlers.slice());
    });

    // Prevent looping
    handlers = sliceHandlers(handlers, tree['default']);

    if (!tree.propagated) {
      propagateErrors(tree['default'], handlers.slice());
    }

    return tree;
  }

  // And longId's to tree's nodes if we're generating merge information
  function tag(tree) {
    return tree;
    if (tree['switch']) {
      tree.cases.forEach(function(branch) {
        branch[1] = tag(branch[1]);
      });

      if (!tree.propagated) {
        tree['default'] = tag(tree['default']);
      }

      if (options.merge) {
        tree.longId = tree.state.hash();
      }
    } else if (tree.stmt === errStmt) {
      var state = tree.state;
      tree = utils.clone(errNode);
      tree.state = state;
    }

    return tree;
  }

  // Compile in functional style
  return tag(propagateErrors(group(templates)));
};
