var xjst = require('../../xjst'),
    utils = xjst.utils;

//
// ### function engine (templates, ptions)
// #### @templates {Array} AST
// #### @options {Object} Compiler options
// #### @config {Object} Engine configuration
// Returns optimized tree (via sort&group algorithm)
//
exports.execute = function execute(templates, options, config) {
  var id = config.id || new utils.Identifier();

  // 1. Sort
  //
  // 1.1 Get list of predicates in order of popularity
  var chart = {};
  templates.forEach(function(template) {
    template[0].forEach(function(predicate) {
      var id = predicate[0];
      if (!chart[id]) {
        chart[id] = 1;
      } else {
        chart[id]++;
      }
    });
  });

  // 1.2 Sort predicates in each template
  templates.forEach(function(template) {
    template[0].sort(function(a, b) {
      var aid = a[0],
          bid = b[0],
          chartA = chart[aid],
          chartB = chart[bid];

      // Fall back to lexicographical sort
      if (chartA === chartB) {
        var strA = utils.stringify(a[1]),
            strB = utils.stringify(b[1]);

        return strA === strB ? 0 : strA > strB ? 1 : -1;
      }

      return chartB - chartA;
    });
  });

  // 2. Group templates by first predicate
  var groups = [];
  groups.push(templates.reduce(function(group, template) {
    if (group.length === 0) return [ template ];

    var predicates = template[0],
        groupPredicates = group[0][0];

    if (groupPredicates.length === 0 ||
        predicates.length === 0 ||
        predicates[0][0] !== groupPredicates[0][0]) {
      groups.push(group);
      return [ template ];
    }

    group.push(template);
    return group;
  }, []));

  // 3. Group into subgroups by const value,
  //    generate AST
  return groups.filter(function(group) {
    return group.length !== 0;
  }).map(function(group) {
    // Unconditional body
    if (group[0][0].length === 0) {
      return {
        id: id.generate(),
        stmt: group[0][1]
      };
    }

    var tag = group[0][0][0],
        subgroups = {};

    group.forEach(function(template) {
      var cval = template[0][0][2],
          strcval = utils.stringify(cval);

      if (!subgroups.hasOwnProperty(strcval)) {
        subgroups[strcval] = [ template ];
      } else {
        subgroups[strcval].push(template);
      }
    });

    subgroups = Object.keys(subgroups).sort(function(a, b) {
      return a === b ? 0 : a > b ? 1 : -1;
    }).map(function(key) {
      return subgroups[key];
    });

    return {
      id: id.generate(),
      tag: tag[1],
      tagId: tag[0],
      tagStr: utils.stringify(tag[1]),
      cases: subgroups.filter(function(subgroup) {
        return subgroup.length !== 0;
      }).map(function(subgroup) {
        var value = subgroup[0][0][0][2];

        return {
          value: value,
          // Trim first predicate from all members
          body: execute(subgroup.map(function(template) {
            return [ template[0].slice(1) ].concat(template.slice(1));
          }), options, config)
        };
      }),
      fallback: null
    };
  }).reduceRight(function(prev, next) {
    next.fallback = prev;
    return next;
  })
};

// Export engine's name
exports.name = 'sort-group';
