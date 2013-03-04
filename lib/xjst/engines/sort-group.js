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
        stmt: group[0][1]
      };
    }

    var tag = group[0][0][0],
        subgroups = [];

    subgroups.push(group.reduce(function(subgroup, template) {
      if (subgroup.length === 0) return [ template ];

      var cval = template[0][0][2],
          subCval = subgroup[0][0][0][2];

      if (utils.stringify(cval) !== utils.stringify(subCval)) {
        subgroups.push(subgroup);
        return [ template];
      }

      subgroup.push(template);
      return subgroup;
    }, []));

    return {
      tag: tag[1],
      tagId: tag[0],
      tagStr: utils.stringify(tag[1]),
      cases: subgroups.filter(function(subgroup) {
        return subgroup.length !== 0;
      }).map(function(subgroup) {
        var value = subgroup[0][0][0][2];

        // Trim first predicate from all members
        subgroup.forEach(function(template) {
          template[0].shift();
        });

        return {
          value: value,
          body: execute(subgroup, options, config)
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
