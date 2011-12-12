var xjst = require('../../xjst'),
    utils = xjst.utils,
    XJSTLocalAndApplyCompiler = xjst.ometa.XJSTLocalAndApplyCompiler;

//
// ### function optimizeRecursion (tree, source, api, recompiled)
// #### @tree {AST}
// #### @source {Array} Original source (XJST AST)
// #### @api {Object} API object ( .serialize(), .addFn(), .compile() )
// #### @recompiled {Boolean} Internal flag
// Optimizes `apply()` statements by redirecting recursive calls into the
// middle of the tree
// May change original tree and apply engine again (for ghost cloning)
//
exports.process = function optimizeRecursion(tree, source, api, recompiled) {
  var forceRecompile = false,
      other = source[0],
      templates = source[1],
      childMap = {};

  // Traverse tree
  var applies = utils.reduceTree(tree, function(acc, node) {
    if (!node.stmt) return acc;

    // Get locals and applies sequence:
    // local () { ... apply() ... } => ['localStart', 'apply', 'localEnd']
    var seq = XJSTLocalAndApplyCompiler.match(node.stmt, 'topLevel');
    if (seq.length === 0) return acc;

    // Create a state for each individual apply (based on the node's state)
    var locals = [];
    seq.forEach(function(op) {
      if (op[0] === 'apply') {
        var state = utils.clone(node.state);

        locals.forEach(function(local) {
          local.forEach(function(as) {
            // If local was setting not a constant value to the predicate
            // Remove all available information about it (predicate)
            if (as[2] === 'reset') {
              state.unset(api.map[as[0]]);
            } else {
              // Update cloned state
              state.set(api.map[as[0]], utils.stringify(as[2]));
            }

            if (!childMap[as[0]]) {
              var pred = api.map[as[0]];
              childMap[as[0]] = api.ids.filter(function(id) {
                if (id === as[0]) return false;
                return api.map[id].indexOf(pred) > 0;
              });
            }

            // Remove all nested predicates from state
            // Like if `as` is `this.x` - remove `this.x.y`
            // see #2 for details
            childMap[as[0]].forEach(function(id) {
              state.unset(api.map[id]);
            });
          });
        });

        acc.push({
          node: node,
          op: op[1],
          state: state
        });
      } else if (op[0] === 'localStart') {
        locals.push(op[1]);
      } else {
        locals.pop();
      }
    });

    return acc;
  }, []);

  var ghosts = {};

  // Go through all collected applies
  applies.forEach(function(apply) {
    // If nothing was changed before .apply call
    if (apply.node.state.equalTo(apply.state)) {
      // Skip this apply as it can't be optimized
      return;
    }

    // Find a node with state nested into `apply`'s state
    var result = utils.reduceTree(tree, function(acc, node) {
      // Apply should not redirect to itself
      if (node.id === apply.node.id) return acc;

      // Compare states
      var score = apply.state.isReachable(
        node.state,
        api.engine.name === 'sort-group'
      );

      // Find the best match
      if (score !== null && score >= 0 && score < acc.score) {
        acc.score = score;
        acc.node = node;
      }

      return acc;
    }, { score: Infinity, node: tree });

    // If apply can be inlined - create subtree
    if (apply.state.isInlineable() && api.engine.name === 'sort-group') {
      var fnId = api.identifier.generate(),
          subtree = api.compile(templates, {
            state: apply.state.clone(),
            values: api.values,
            id: api.identifier
          });

      api.addFn({}, subtree);
      result.node = {
        id: fnId,
        subtree: subtree
      };
    // If state is small and node isn't a leaf
    // create ghosts and render everything again
    } else if (!recompiled  && !api.options['no-ghosts'] &&
               result.node.tag && result.node.state.isGhostable()) {

      var templateId = apply.node.template,
          tagId = result.node.tagId,
          template = templates[templateId],
          ghost = ghosts[templateId] || {
            id: templateId,
            template: template,
            applies: [],
            tags: {}
          },
          tag = ghost.tags[tagId] || (ghost.tags[tagId] = {
            id: tagId,
            tag: result.node.tag,
            values: {}
          }),
          body = template[1],
          unique = false;

      unique = template[0].every(function(pair) {
        return pair[0] !== result.node.tagId;
      });

      // Only create ghosts if predicate isn't already present
      if (unique) {
        result.node.cases.forEach(function(branch) {
          tag.values[utils.stringify(branch[0])] = branch[0];
        });

        apply.op.source = apply.node.id;

        // Store apply's body for ghost cloning
        ghost.applies.push(apply.op);

        ghosts[templateId] = ghost;
        forceRecompile = true;
        return;
      }
    }

    // If the node is matching our condition - we should wrap it into a
    // function
    result.node.fn = true;

    // Mark apply as optimized
    apply.op.code = api.fnName(result.node) + '.call(this)';
    apply.op.node = result.node.id;
    apply.op.host = apply.node.id;

    if (!apply.node.successors) apply.node.successors = [];
    apply.node.successors.push({
      id: result.node.id,
      subtree: result.node.subtree
    });
  });

  // If recompilation was forced
  if (forceRecompile) {
    // Translate hash map into ordered array
    var ghosts = Object.keys(ghosts).map(function(id) {
      return ghosts[id];
    }).sort(function(a, b) {
      return a.id > b.id ? 1 : a.id === b.id ? 0 : -1;
    });

    // Go through ghosts, split and join original templates array
    var newTemplates = [],
        offset = ghosts.reduce(function(offset, ghost) {
          var head = templates.slice(offset, ghost.id),
              template = templates[ghost.id],
              applies = ghost.applies;

          // Add cloning method to each apply to store references
          applies.forEach(function(apply) {
            apply.clone = function() {
              var op = { source: apply.source };

              ghost.applies.push(op);

              return op;
            };
          });

          // Push every template before template
          newTemplates = newTemplates.concat(head);

          // For each tag and value pair
          // create ghost with selected predicate
          Object.keys(ghost.tags).forEach(function(tag) {
            var tag = ghost.tags[tag];

            Object.keys(tag.values).forEach(function(key) {
              var value = tag.values[key];

              newTemplates.push([
                template[0].concat([[tag.id, tag.tag, value]]),
                utils.clone(template[1])
              ]);
            });
          });

          // Push template itself
          newTemplates.push(template);

          // Remove cloning method from each apply
          applies.forEach(function(apply) {
            delete apply.clone;
          });

          return ghost.id + 1;
        }, 0);

    // Store tail
    newTemplates = newTemplates.concat(templates.slice(offset));

    // Invoke engine on changed tree
    api.identifier.reset();
    tree = api.compile(newTemplates);

    // Inline recursive calls if possible
    tree = optimizeRecursion(tree, [other, newTemplates], api, true);

    // Go through all ghosts again and replace bodies with ghost calls
    ghosts.forEach(function(ghost) {
      var map = {};

      // Create apply-host -> applies map
      ghost.applies.forEach(function(apply) {
        if (!map[apply.host]) map[apply.host] = [];
        map[apply.host].push(apply);
      });

      utils.reduceTree(tree, function(acc, node) {
        if (!node.stmt) return acc;

        var applies = map[node.id];
        if (!applies) return acc;

        var source = 'g_' + applies[0].source;

        // Reset heuristics - no need to wrap this node into function
        node.fn = false;
        node.size = 0;

        // If we hadn't created ghost function yet - create a new one
        if (!api.hasFn(source)) {
          api.addFn({
            id: source,
            args: applies.map(function(apply, i) {
              var name = '__g_' + i;
              apply.code = name + '.call(this)';

              return name;
            })
          }, api.serialize(node, {}))
        }

        node.stmt = [
          'return',
          [
            'send', 'call',
            ['get', api.fnName({ id: source })],
            ['this']
          ].concat(applies.map(function(apply) {
            return ['get', api.fnName({ id: apply.node })];
          }))
        ];
      });
    });
  }

  return tree;
}
