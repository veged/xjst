var xjst = require('../../xjst'),
    utils = xjst.utils;

//
// ### function substractStates (state, tagStr, values, map)
// #### @state {State} Source state
// #### @tagStr {String} Stringified switch's tag value
// #### @values {Object} Hash map of possible values (tagStr as keys)
// #### @map {Object} Hash map of used values
// Create state with missing attributes (default branch's state)
//
function substractStates(state, tagStr, values, map) {
  return xjst.state.create(
    state,
    tagStr,
    [null].concat(values[tagStr].map(function(value) {
      return utils.stringify(value);
    }).filter(function(value) {
      return !map[value];
    }))
  )
}

//
// ### function liftState (source, target)
// #### @source {State} Source state
// #### @target {Object} Target node
// #### @values {Object} Hash map of possible values (tagStr as keys)
// Lifts predicate information from source to target
//
function liftState(source, target, values) {
  target.state.merge(source);

  if (!target.tag) return;

  target.cases.forEach(function(branch) {
    var state = xjst.state.create(
      target.state,
      target.tagStr,
      utils.stringify(branch[0])
    );
    liftState(state, branch[1], values);
  });

  if (target.propagated) return;

  var state = target.state,
      map = {};

  target.cases.forEach(function(branch) {
    map[utils.stringify(branch[0])] = true;
  });

  state = substractStates(state, target.tagStr, values, map);

  liftState(target.state, target['default'], values);
}

//
// ### function findLastDefault (tree)
// #### @tree {Array} AST
// Returns last default case in switches tree
//
function findLastDefault(tree) {
  if (tree['default'].tag) return findLastDefault(tree['default']);
  return tree['default'];
}

//
// ### function engine (templates, ptions)
// #### @templates {Array} AST
// #### @options {Object} Compiler options
// #### @config {Object} Engine configuration
// Returns optimized tree (via sort&group algorithm)
//
exports.execute = function engine(templates, options, config) {
  var initialState = config.state,
      values = config.values;

  // Sort matches by popularity and lexicographically
  function sort(templates) {
    var chart = {};
    function insert(match) {
      var key = match[0],
          ast_key = match[1],
          ast_value = match[2];

      if (!utils.isSimple(ast_key)) {
        chart[key] = { count: -Infinity, variance: 1, values: {} };
        return;
      }

      if (!chart[key]) chart[key] = { count: 0, variance: 0, values: {} };

      var value = utils.stringify(ast_value);
      var item = chart[key];

      item.count++;
      if (!item.values[value]) {
        item.values[value] = 0;
        item.variance++;
      }
      item.values[value]++;
    }

    templates.forEach(function(template) {
      var seen = {};
      template[0].forEach(function(match) {
        var key = match[0];
        if (seen[key]) return;
        seen[key] = true;

        insert(match);
      });
    });

    return templates.map(function(template) {
      return [
        template[0].slice().sort(function(a, b) {
          var rateA = chart[a[0]].count /
                  Math.log(Math.E * (1 + chart[a[0]].variance)),
              rateB = chart[b[0]].count /
                  Math.log(Math.E * (1 + chart[b[0]].variance)),
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

  var errStmt = ['throw', ['new', 'Error', ['this']]],
      errNode = {
        id: 'e',
        unexpected: true,
        stmt: errStmt,
        fn: true,
        state: initialState.clone()
      },
      // Pick initial id from configuration
      id = config.id || new utils.Identifier();

  // Group matches into switches *recursively*
  function group(templates, state) {
    if (!state) state = initialState.clone();

    // If we can't create groups - return error statement
    if (templates.length === 0) {
      return {
        id: id.generate(),
        stmt: errStmt,
        state: state.clone()
      };
    }

    var groups = {},
        tags = [];

    // Sort templates (while preserving dependent predicates in right order)
    // and create groups with the equal first predicate
    unzip(sort(zip(templates))).reduce(function(prev, template, i) {
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

      subGroup[value].items.push([ matches.slice(1), template[1], i ]);

      return template;
    }, null);

    // Each first predicate is a `switch(...) {}` tag
    // Go through all tags, creating the nested switches
    // `switch (tag) { case val: switch (tag2) { ... } }`
    var result = { id: id.generate(), state: state.clone() };
    tags.reduce(function(result, tag) {
      var state = result.state,
          subgroup = groups[tag[0]].shift(),
          tagStr = utils.stringify(tag[1]),

          // Check if we already know tag's value
          inevitable = false;

      // Create new switch
      result.tag = tag[1];
      result.tagId = tag[0];
      result.tagStr = tagStr;

      // `subgroup` is a hashmap of possible predicate values
      result.cases = Object.keys(subgroup).map(function(key) {
        // Do not generate case if inevitable already known
        if (inevitable) return;

        // Do not generate case if know tag's value and it's different from
        // current one
        if (state.has(tagStr) && !state.has(tagStr, key)) return;

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
            subSwitch = group(items, subState),
            lastDefault = subSwitch;

        // If the `subSwitch` is a switch
        if (subSwitch.tag) {
          // Find last default statement
          // (probably it's equal to the error statement)
          lastDefault = findLastDefault(subSwitch);
        }

        // Increase default's id
        lastDefault.id = id.generate();

        // And insert `def` here
        if (def) {
          lastDefault.stmt = def[1];
          lastDefault.template = def[2];
          lastDefault.size = utils.stringify(def[1]).length / 1300;
        }
        if (!lastDefault.stmt) lastDefault.stmt = errStmt;

        // If state has tag-value pair set inevitable flag
        if (state.has(tagStr, key)) inevitable = true;

        return [item.value, subSwitch];
      });

      // Continue branching with unknown value of switch's tag
      result['default'] = {
        id: id.generate(),
        state: substractStates(state, tagStr, values, subgroup),
        stmt: errStmt
      };

      // If we know value and it hasn't matched
      if (!inevitable && state.has(tagStr)) {
        // Default clause is inevitable
        inevitable = true;
      }

      result.cases = result.cases.filter(function(branch) {
        return !!branch;
      });

      result.inevitable = inevitable;

      return result['default'];
    }, result);

    return result;
  }

  // Zip nested matches together (like `this.a && this.a.b`)
  function zip(templates) {
    return templates.map(function(template) {
      var matches = template[0].slice().map(function(match) {
        var pred = match[1],
            changed;

        do {
          changed = false;
          if (pred[0] === 'unop' && pred[1] === '!') {
            changed = true;
            pred = pred[2];
          }
          if (pred[0] === 'parens') {
            changed = true;
            pred = pred[1];
          }
        } while (changed);

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

    if (!tree.tag) return tree;

    var patch;

    handlers = sliceHandlers(handlers, tree);

    if (tree['default'].tag || tree['default'].stmt !== errStmt) {
      handlers.push(tree['default']);
    } else {
      if (handlers.length > 0) {
        // Update node's default and lift state
        var handler = handlers[handlers.length - 1];
        liftState(tree.state, tree['default'] = handler, values);
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

  function replaceInevitables(tree) {
    if (!tree.tag) return tree;

    tree.cases = tree.cases.map(function(branch) {
      return replaceInevitables(branch);
    });
    tree['default'] = replaceInevitables(tree['default']);

    if (tree.inevitable) {
      return tree.cases.length > 0 ? tree.cases[0][1] : tree['default'];
    }

    return tree;
  }

  // And longId's to tree's nodes if we're generating merge information
  function tag(tree) {
    if (tree.tag) {
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
  return tag(replaceInevitables(propagateErrors(group(templates))));
};

// Export engine's name
exports.name = 'sort-group';
