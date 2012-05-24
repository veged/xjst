var ometajs_ = require("ometajs");

var AbstractGrammar = ometajs_.grammars.AbstractGrammar;

var BSJSParser = ometajs_.grammars.BSJSParser;

var BSJSIdentity = ometajs_.grammars.BSJSIdentity;

var BSJSTranslator = ometajs_.grammars.BSJSTranslator;

var ometajs = require("ometajs"), xjst = require("../../xjst"), utils = xjst.utils, Identifier = utils.Identifier, BSJSParser = ometajs.grammars.BSJSParser, BSJSTranslator = ometajs.grammars.BSJSTranslator, BSJSIdentity = ometajs.grammars.BSJSIdentity;

var XJSTParser = function XJSTParser(source) {
    BSJSParser.call(this, source);
};

XJSTParser.match = BSJSParser.match;

XJSTParser.matchAll = BSJSParser.matchAll;

exports.XJSTParser = XJSTParser;

require("util").inherits(XJSTParser, BSJSParser);

XJSTParser.prototype["isKeyword"] = function $isKeyword() {
    var x;
    return this._skip() && (x = this._getIntermediate(), true) && (BSJSParser._isKeyword(x) || x === "local" || x === "apply" || x === "template" || x === "extends" || x === "super");
};

XJSTParser.prototype["primExprHd"] = function $primExprHd() {
    return this._atomic(function() {
        var a, b, r;
        return this._rule("token", true, [ "local" ], null) && this._rule("token", true, [ "(" ], null) && this._rule("expr", false, [], null) && (a = this._getIntermediate(), true) && this._rule("token", true, [ ")" ], null) && this._rule("asgnExpr", false, [], null) && (b = this._getIntermediate(), true) && this._rule("localExpr", false, [ [ "local", a, b ] ], null) && (r = this._getIntermediate(), true) && this._exec(r);
    }) || this._atomic(function() {
        var st;
        return this._rule("token", true, [ "super" ], null) && this._rule("token", true, [ "apply" ], null) && this._rule("token", true, [ "(" ], null) && this._rule("token", true, [ ")" ], null) && this._rule("superExpr", false, [ [ "super" ] ], null) && (st = this._getIntermediate(), true) && this._exec(st);
    }) || this._atomic(function() {
        var a, st, r;
        return this._rule("token", true, [ "super" ], null) && this._rule("token", true, [ "apply" ], null) && this._rule("token", true, [ "(" ], null) && this._rule("expr", false, [], null) && (a = this._getIntermediate(), true) && this._rule("token", true, [ ")" ], null) && this._rule("superExpr", false, [ [ "super" ] ], null) && (st = this._getIntermediate(), true) && this._rule("localExpr", false, [ [ "local", a, st ] ], null) && (r = this._getIntermediate(), true) && this._exec(r);
    }) || this._atomic(function() {
        var st;
        return this._rule("token", true, [ "apply" ], null) && this._rule("token", true, [ "(" ], null) && this._rule("token", true, [ ")" ], null) && this._rule("applyStmt", false, [ [ "apply" ] ], null) && (st = this._getIntermediate(), true) && this._exec(st);
    }) || this._atomic(function() {
        var a, st, r;
        return this._rule("token", true, [ "apply" ], null) && this._rule("token", true, [ "(" ], null) && this._rule("expr", false, [], null) && (a = this._getIntermediate(), true) && this._rule("token", true, [ ")" ], null) && this._rule("applyStmt", false, [ [ "apply" ] ], null) && (st = this._getIntermediate(), true) && this._rule("localExpr", false, [ [ "local", a, st ] ], null) && (r = this._getIntermediate(), true) && this._exec(r);
    }) || this._atomic(function() {
        var expr;
        return this._rule("token", true, [ "apply" ], null) && this._rule("applyExpr", false, [ [ "apply" ] ], null) && (expr = this._getIntermediate(), true) && this._exec(expr);
    }) || this._atomic(function() {
        return this._rule("primExprHd", false, [], BSJSParser);
    });
};

XJSTParser.prototype["stmt"] = function $stmt() {
    return this._atomic(function() {
        var a, b, r;
        return this._rule("token", true, [ "local" ], null) && this._rule("token", true, [ "(" ], null) && this._rule("expr", false, [], null) && (a = this._getIntermediate(), true) && this._rule("token", true, [ ")" ], null) && this._rule("stmt", false, [], null) && (b = this._getIntermediate(), true) && this._rule("localStmt", false, [ [ "local", a, b ] ], null) && (r = this._getIntermediate(), true) && this._exec(r);
    }) || this._atomic(function() {
        var st;
        return this._rule("token", true, [ "super" ], null) && this._rule("token", true, [ "apply" ], null) && this._rule("token", true, [ "(" ], null) && this._rule("token", true, [ ")" ], null) && this._rule("superStmt", false, [ [ "super" ] ], null) && (st = this._getIntermediate(), true) && this._exec(st);
    }) || this._atomic(function() {
        var a, st, r;
        return this._rule("token", true, [ "super" ], null) && this._rule("token", true, [ "apply" ], null) && this._rule("token", true, [ "(" ], null) && this._rule("expr", false, [], null) && (a = this._getIntermediate(), true) && this._rule("token", true, [ ")" ], null) && this._rule("superStmt", false, [ [ "super" ] ], null) && (st = this._getIntermediate(), true) && this._rule("localStmt", false, [ [ "local", a, st ] ], null) && (r = this._getIntermediate(), true) && this._exec(r);
    }) || this._atomic(function() {
        var st;
        return this._rule("token", true, [ "apply" ], null) && this._rule("token", true, [ "(" ], null) && this._rule("token", true, [ ")" ], null) && this._rule("applyStmt", false, [ [ "apply" ] ], null) && (st = this._getIntermediate(), true) && this._exec(st);
    }) || this._atomic(function() {
        var a, st, r;
        return this._rule("token", true, [ "apply" ], null) && this._rule("token", true, [ "(" ], null) && this._rule("expr", false, [], null) && (a = this._getIntermediate(), true) && this._rule("token", true, [ ")" ], null) && this._rule("applyStmt", false, [ [ "apply" ] ], null) && (st = this._getIntermediate(), true) && this._rule("localStmt", false, [ [ "local", a, st ] ], null) && (r = this._getIntermediate(), true) && this._exec(r);
    }) || this._atomic(function() {
        return this._rule("stmt", false, [], BSJSParser);
    });
};

XJSTParser.prototype["extends"] = function $extends() {
    var filename;
    return this._rule("token", true, [ "extends" ], null) && this._rule("spaces", false, [], null) && this._rule("str", false, [], null) && (filename = this._getIntermediate(), true) && this._exec([ "extends", filename[1] ]);
};

XJSTParser.prototype["template"] = function $template() {
    var m, b;
    return this._rule("token", true, [ "template" ], null) && this._rule("token", true, [ "(" ], null) && this._rule("expr", false, [], null) && (m = this._getIntermediate(), true) && this._rule("token", true, [ ")" ], null) && this._rule("stmt", false, [], null) && (b = this._getIntermediate(), true) && this._exec([ "template", m, b ]);
};

XJSTParser.prototype["superExpr"] = function $superExpr() {
    var st;
    return this._list(function() {
        return this._match("super");
    }) && this._rule("applyStmt", false, [ [ "apply" ] ], null) && (st = this._getIntermediate(), true) && this._exec([ "superExpr", st ]);
};

XJSTParser.prototype["superStmt"] = function $superStmt() {
    var st;
    return this._list(function() {
        return this._match("super");
    }) && this._rule("applyStmt", false, [ [ "apply" ] ], null) && (st = this._getIntermediate(), true) && this._exec([ "superStmt", st ]);
};

XJSTParser.prototype["applyStmt"] = function $applyStmt() {
    return this._list(function() {
        return this._match("apply");
    }) && this._exec([ "nhApplyStmt", {} ]);
};

XJSTParser.prototype["applyExpr"] = function $applyExpr() {
    return this._list(function() {
        return this._match("apply");
    }) && this._exec([ "nhApplyExpr" ]);
};

XJSTParser.prototype["localStmt"] = function $localStmt() {
    var a, b;
    return this._list(function() {
        return this._match("local") && this._skip() && (a = this._getIntermediate(), true) && this._skip() && (b = this._getIntermediate(), true);
    }) && this._exec([ "localStmt", a, b ]);
};

XJSTParser.prototype["localExpr"] = function $localExpr() {
    var a, b;
    return this._list(function() {
        return this._match("local") && this._skip() && (a = this._getIntermediate(), true) && this._skip() && (b = this._getIntermediate(), true);
    }) && this._exec([ "localExpr", a, b ]);
};

XJSTParser.prototype["topLevel"] = function $topLevel() {
    var ts;
    return this._many(function() {
        return this._atomic(function() {
            var t;
            return this._rule("extends", false, [], null) && (t = this._getIntermediate(), true) && this._exec(t);
        }) || this._atomic(function() {
            var t;
            return this._rule("template", false, [], null) && (t = this._getIntermediate(), true) && this._exec(t);
        }) || this._atomic(function() {
            var s;
            return this._rule("srcElem", false, [], null) && (s = this._getIntermediate(), true) && this._exec([ "stmt", s ]);
        });
    }) && (ts = this._getIntermediate(), true) && this._rule("spaces", false, [], null) && this._rule("end", false, [], null) && this._exec(ts);
};

var XJSTTranslator = function XJSTTranslator(source) {
    BSJSIdentity.call(this, source);
};

XJSTTranslator.match = BSJSIdentity.match;

XJSTTranslator.matchAll = BSJSIdentity.matchAll;

exports.XJSTTranslator = XJSTTranslator;

require("util").inherits(XJSTTranslator, BSJSIdentity);

XJSTTranslator.prototype["const"] = function $const() {
    var s, n;
    return this._list(function() {
        return this._match("string") && this._skip() && (s = this._getIntermediate(), true);
    }) || this._list(function() {
        return this._match("number") && this._skip() && (n = this._getIntermediate(), true);
    });
};

XJSTTranslator.prototype["extends"] = function $extends() {
    var filename;
    return this._skip() && (filename = this._getIntermediate(), true) && this._exec([ "extends", filename ]);
};

XJSTTranslator.prototype["superStmt"] = function $superStmt() {
    var op, st;
    return this._skip() && (op = this._getIntermediate(), true) && this._rule("localStmt", false, [ [ "json", [ "binding", "__d0" + this.id, [ "get", true ] ] ], op ], null) && (st = this._getIntermediate(), true) && this._exec(function() {
        return st;
    }.call(this));
};

XJSTTranslator.prototype["superExpr"] = function $superExpr() {
    var op, st;
    return this._skip() && (op = this._getIntermediate(), true) && this._rule("localExpr", false, [ [ "json", [ "binding", "__d" + this.id, [ "get", true ] ] ], op ], null) && (st = this._getIntermediate(), true) && this._exec(function() {
        return st;
    }.call(this));
};

XJSTTranslator.prototype["nhApplyStmt"] = function $nhApplyStmt() {
    var p;
    return this._skip() && (p = this._getIntermediate(), true) && this._exec([ "applyStmt", p ]);
};

XJSTTranslator.prototype["nhApplyExpr"] = function $nhApplyExpr() {
    return this._exec([ "nhApplyExpr" ]);
};

XJSTTranslator.prototype["localStmt"] = function $localStmt() {
    var as, t;
    return this._rule("localAsmts", false, [], null) && (as = this._getIntermediate(), true) && this._rule("trans", false, [], null) && (t = this._getIntermediate(), true) && this._exec(function() {
        return [ "begin" ].concat([ [ "localStart", XJSTTranslator._localToPred(this.identifier, as), [] ] ], as[0], [ t ], as[1], [ [ "localEnd" ] ]);
    }.call(this));
};

XJSTTranslator.prototype["localExpr"] = function $localExpr() {
    var as, t;
    return this._rule("localAsmts", false, [], null) && (as = this._getIntermediate(), true) && this._rule("trans", false, [], null) && (t = this._getIntermediate(), true) && this._exec(function() {
        var result = XJSTTranslator._getLocalVar(this), prelude = [ [ "localStart", XJSTTranslator._localToPred(this.identifier, as), as[0].filter(function(op) {
            return op[0] === "var";
        }).map(function(op) {
            return op.slice(1).map(function(asmt) {
                return [ asmt[0] ];
            });
        }).concat([ [ [ result[1] ] ] ]) ] ], self = this;
        as[0].forEach(function(e) {
            if (e[0] === "var") {
                e.slice(1).forEach(function(v) {
                    prelude.push([ "set", [ "get", v[0] ], v[1] ]);
                });
            } else {
                prelude.push(e);
            }
        });
        return [].concat(prelude, [ [ "set", result, t ] ], as[1], [ [ "localEnd" ], result ]).reduce(function(a, i) {
            return a ? [ "binop", ",", a, i ] : i;
        });
    }.call(this));
};

XJSTTranslator.prototype["bindingToAsmt"] = function $bindingToAsmt() {
    var k, v, r;
    return this._list(function() {
        return this._match("binding") && this._skip() && (k = this._getIntermediate(), true) && this._skip() && (v = this._getIntermediate(), true);
    }) && this._rule("localAsmt", false, [ [ "set", [ "getp", [ "string", k ], [ "get", "__this" ] ], v ] ], null) && (r = this._getIntermediate(), true) && this._exec(r);
};

XJSTTranslator.prototype["localAsmts"] = function $localAsmts() {
    return this._atomic(function() {
        var as;
        return this._list(function() {
            return this._match("json") && this._any(function() {
                return this._rule("bindingToAsmt", false, [], null);
            }) && (as = this._getIntermediate(), true);
        }) && this._exec(function() {
            var es = [];
            as.forEach(function(a) {
                a.forEach(function(e, i) {
                    es[i] = es[i] ? es[i].concat(e) : e;
                });
            });
            return es;
        }.call(this));
    }) || this._atomic(function() {
        var e1;
        return this._rule("localAsmt", false, [], null) && (e1 = this._getIntermediate(), true) && this._exec(e1);
    }) || this._atomic(function() {
        var es, e2;
        return this._list(function() {
            return this._match("binop") && this._match(",") && this._rule("localAsmts", false, [], null) && (es = this._getIntermediate(), true) && this._rule("localAsmt", false, [], null) && (e2 = this._getIntermediate(), true);
        }) && this._exec(function() {
            es.forEach(function(e, i) {
                es[i] = e.concat(e2[i]);
            });
            return es;
        }.call(this));
    });
};

XJSTTranslator.prototype["localAsmt"] = function $localAsmt() {
    var p, v, props;
    return this._list(function() {
        return this._match("set") && this._list(function() {
            return this._atomic(function() {
                var n;
                return this._match("get") && this._skip() && (n = this._getIntermediate(), true);
            }) || this._atomic(function() {
                var k, o;
                return this._match("getp") && this._skip() && (k = this._getIntermediate(), true) && this._skip() && (o = this._getIntermediate(), true);
            });
        }) && (p = this._getIntermediate(), true) && this._skip() && (v = this._getIntermediate(), true);
    }) && this._rule("localProps", false, [ p ], null) && (props = this._getIntermediate(), true) && this._exec(function() {
        var lv = XJSTTranslator._getLocalVar(this), vars = [ [ "var" ].concat(props[1], [ [ lv[1], props[0] ] ]) ];
        return [ vars.concat([ [ "set", props[0], v ] ]), [ [ "set", props[0], lv ] ], [ [ p, v ] ] ];
    }.call(this));
};

XJSTTranslator.prototype["localProps"] = function $localProps() {
    return this._atomic(function() {
        var k, expr;
        return this._list(function() {
            return this._match("getp") && this._rule("const", false, [], null) && (k = this._getIntermediate(), true) && this._list(function() {
                return this._match("this");
            });
        }) && (expr = this._getIntermediate(), true) && this._exec([ expr, [] ]);
    }) || this._atomic(function() {
        var k, o, expr;
        return this._list(function() {
            return this._match("getp") && this._rule("const", false, [], null) && (k = this._getIntermediate(), true) && this._list(function() {
                return this._match("get") && this._skip() && (o = this._getIntermediate(), true);
            });
        }) && (expr = this._getIntermediate(), true) && this._exec([ expr, [] ]);
    }) || this._atomic(function() {
        var k;
        return this._list(function() {
            return this._match("getp") && this._skip() && (k = this._getIntermediate(), true) && this._list(function() {
                return this._match("this");
            });
        }) && this._exec(function() {
            var v = XJSTTranslator._getLocalVar(this);
            return [ [ "getp", v, [ "this" ] ], [ [ v[1], k ] ] ];
        }.call(this));
    }) || this._atomic(function() {
        var k, o;
        return this._list(function() {
            return this._match("getp") && this._rule("const", false, [], null) && (k = this._getIntermediate(), true) && this._skip() && (o = this._getIntermediate(), true);
        }) && this._exec(function() {
            var v = XJSTTranslator._getLocalVar(this);
            return [ [ "getp", k, v ], [ [ v[1], o ] ] ];
        }.call(this));
    }) || this._atomic(function() {
        var k, o;
        return this._list(function() {
            return this._match("getp") && this._skip() && (k = this._getIntermediate(), true) && this._skip() && (o = this._getIntermediate(), true);
        }) && this._exec(function() {
            var v1 = XJSTTranslator._getLocalVar(this), v2 = XJSTTranslator._getLocalVar(this);
            return [ [ "getp", v1, v2 ], [ [ v1[1], k ], [ v2[1], o ] ] ];
        }.call(this));
    }) || this._atomic(function() {
        var expr;
        return this._skip() && (expr = this._getIntermediate(), true) && this._exec([ expr, [] ]);
    });
};

XJSTTranslator.prototype["subMatch"] = function $subMatch() {
    return this._atomic(function() {
        var e1, c;
        return this._list(function() {
            return this._match("binop") && this._match("===") && this._skip() && (e1 = this._getIntermediate(), true) && this._rule("const", false, [], null) && (c = this._getIntermediate(), true);
        }) && this._exec([ e1, c ]);
    }) || this._atomic(function() {
        var c, e2;
        return this._list(function() {
            return this._match("binop") && this._match("===") && this._rule("const", false, [], null) && (c = this._getIntermediate(), true) && this._skip() && (e2 = this._getIntermediate(), true);
        }) && this._exec([ e2, c ]);
    }) || this._atomic(function() {
        var e3;
        return this._skip() && (e3 = this._getIntermediate(), true) && this._exec([ [ "unop", "!", e3 ], [ "get", "false" ] ]);
    });
};

XJSTTranslator.prototype["expr2match"] = function $expr2match() {
    return this._atomic(function() {
        var ms, m1;
        return this._list(function() {
            return this._match("binop") && this._match("&&") && this._rule("expr2match", false, [], null) && (ms = this._getIntermediate(), true) && this._rule("subMatch", false, [], null) && (m1 = this._getIntermediate(), true);
        }) && this._exec(function() {
            ms.push(m1);
            return ms;
        }.call(this));
    }) || this._atomic(function() {
        var m2;
        return this._rule("subMatch", false, [], null) && (m2 = this._getIntermediate(), true) && this._exec([ m2 ]);
    });
};

XJSTTranslator.prototype["template"] = function $template() {
    var m, b;
    return this._skip() && (m = this._getIntermediate(), true) && this._rule("trans", false, [], null) && (b = this._getIntermediate(), true) && this._exec([ "template", [ XJSTTranslator.match(m, "expr2match"), b ] ]);
};

XJSTTranslator.prototype["stmt"] = function $stmt() {
    var s;
    return this._rule("trans", false, [], null) && (s = this._getIntermediate(), true) && this._exec([ "stmt", s ]);
};

XJSTTranslator.prototype["topLevel"] = function $topLevel() {
    var id, ts;
    return this._skip() && (id = this._getIntermediate(), true) && this._exec(function() {
        this.id = id;
        this._vars = [];
        return this.identifier = new Identifier;
    }.call(this)) && this._any(function() {
        return this._rule("trans", false, [], null);
    }) && (ts = this._getIntermediate(), true) && this._exec(function() {
        if (this._vars.length) {
            this._vars.unshift("var");
            ts.unshift([ "stmt", this._vars ]);
        }
        return XJSTTranslator._splitTemplates(this.identifier, ts);
    }.call(this));
};

XJSTTranslator._getLocalIdCounter = 0, XJSTTranslator._getLocalId = function() {
    return this._getLocalIdCounter++;
}, XJSTTranslator._getLocalVar = function(a) {
    var b = this._getLocalId();
    return [ "get", "__r" + b ];
}, XJSTTranslator._localToPred = function(a, b) {
    return b[2].map(function(b) {
        function c(a) {
            return Array.isArray(a) ? a[0] === "get" && a[1] === "__this" ? [ "this" ] : a.map(c) : a;
        }
        return b = [ a.identify(c(b[0])), b[0], b[1] ], b[2][0] !== "string" && b[2][0] !== "number" ? [ b[0], b[1], "reset" ] : b;
    });
}, XJSTTranslator._splitTemplates = function(a, b) {
    var c = [], d = [], e = [], f;
    while (f = b.shift()) f[0] === "extends" ? c.push(f[1]) : f[0] === "template" ? d.push(f[1]) : e.push(f[1]);
    return [ e, XJSTTranslator._identify(a, d.reverse()), c ];
}, XJSTTranslator._identify = function(a, b) {
    return b.forEach(function(b) {
        b[0].forEach(function(b) {
            b.unshift(a.identify(b[0]));
        });
    }), b;
};

var XJSTLocalAndApplyCompiler = function XJSTLocalAndApplyCompiler(source) {
    BSJSIdentity.call(this, source);
};

XJSTLocalAndApplyCompiler.match = BSJSIdentity.match;

XJSTLocalAndApplyCompiler.matchAll = BSJSIdentity.matchAll;

exports.XJSTLocalAndApplyCompiler = XJSTLocalAndApplyCompiler;

require("util").inherits(XJSTLocalAndApplyCompiler, BSJSIdentity);

XJSTLocalAndApplyCompiler.prototype["extends"] = function $extends() {
    var filename;
    return this._skip() && (filename = this._getIntermediate(), true) && this._exec([ "extends", filename ]);
};

XJSTLocalAndApplyCompiler.prototype["superStmt"] = function $superStmt() {
    var op;
    return this._rule("trans", false, [], null) && (op = this._getIntermediate(), true) && this._exec([ "superStmt", op ]);
};

XJSTLocalAndApplyCompiler.prototype["superExpr"] = function $superExpr() {
    var op;
    return this._rule("trans", false, [], null) && (op = this._getIntermediate(), true) && this._exec([ "superExpr", op ]);
};

XJSTLocalAndApplyCompiler.prototype["applyStmt"] = function $applyStmt() {
    var p;
    return this._skip() && (p = this._getIntermediate(), true) && this._exec(function() {
        this.result.push([ "apply", p ]);
        return [ "applyStmt", p ];
    }.call(this));
};

XJSTLocalAndApplyCompiler.prototype["nhApplyExpr"] = function $nhApplyExpr() {
    return this._list(function() {
        return this._match("nhApplyExpr");
    });
};

XJSTLocalAndApplyCompiler.prototype["localStart"] = function $localStart() {
    var as, vars;
    return this._skip() && (as = this._getIntermediate(), true) && this._skip() && (vars = this._getIntermediate(), true) && this._exec(function() {
        this.result.push([ "localStart", as, vars ]);
        return [ "localStart", as, vars ];
    }.call(this));
};

XJSTLocalAndApplyCompiler.prototype["localEnd"] = function $localEnd() {
    return this._exec(function() {
        this.result.push([ "localEnd" ]);
        return [ "localEnd" ];
    }.call(this));
};

XJSTLocalAndApplyCompiler.prototype["topLevel"] = function $topLevel() {
    var t;
    return this._exec(this.result = []) && this._rule("trans", false, [], null) && (t = this._getIntermediate(), true) && this._exec(this.result);
};

var XJSTCompiler = function XJSTCompiler(source) {
    BSJSTranslator.call(this, source);
};

XJSTCompiler.match = BSJSTranslator.match;

XJSTCompiler.matchAll = BSJSTranslator.matchAll;

exports.XJSTCompiler = XJSTCompiler;

require("util").inherits(XJSTCompiler, BSJSTranslator);

XJSTCompiler.prototype["extends"] = function $extends() {
    var filename;
    return this._rule("trans", false, [], null) && (filename = this._getIntermediate(), true) && this._exec(function() {
        return '"extends" + ' + filename;
    }.call(this));
};

XJSTCompiler.prototype["superStmt"] = function $superStmt() {
    var op;
    return this._rule("trans", false, [], null) && (op = this._getIntermediate(), true) && this._exec(op);
};

XJSTCompiler.prototype["superExpr"] = function $superExpr() {
    var op;
    return this._rule("trans", false, [], null) && (op = this._getIntermediate(), true) && this._exec(op);
};

XJSTCompiler.prototype["applyStmt"] = function $applyStmt() {
    var param;
    return this._skip() && (param = this._getIntermediate(), true) && this._exec(function() {
        return param.code || "apply.call(__this)";
    }.call(this));
};

XJSTCompiler.prototype["nhApplyStmt"] = function $nhApplyStmt() {
    var param;
    return this._skip() && (param = this._getIntermediate(), true) && this._exec("apply()");
};

XJSTCompiler.prototype["nhApplyExpr"] = function $nhApplyExpr() {
    return this._exec("apply");
};

XJSTCompiler.prototype["localStmt"] = function $localStmt() {
    var a, b;
    return this._rule("trans", false, [], null) && (a = this._getIntermediate(), true) && this._rule("trans", false, [], null) && (b = this._getIntermediate(), true) && this._exec(function() {
        return "local (" + a + ") " + b + ";";
    }.call(this));
};

XJSTCompiler.prototype["localExpr"] = function $localExpr() {
    var a, b;
    return this._rule("trans", false, [], null) && (a = this._getIntermediate(), true) && this._rule("trans", false, [], null) && (b = this._getIntermediate(), true) && this._exec(function() {
        return "local (" + a + ") " + b;
    }.call(this));
};

XJSTCompiler.prototype["localStart"] = function $localStart() {
    var as, vars;
    return this._skip() && (as = this._getIntermediate(), true) && this._skip() && (vars = this._getIntermediate(), true) && this._exec('""');
};

XJSTCompiler.prototype["localEnd"] = function $localEnd() {
    return this._exec('""');
};

XJSTCompiler.prototype["subMatch"] = function $subMatch() {
    return this._atomic(function() {
        var id, m;
        return this._list(function() {
            return this._skip() && (id = this._getIntermediate(), true) && this._rule("trans", false, [], null) && (m = this._getIntermediate(), true) && this._list(function() {
                return this._match("get") && this._match("true");
            });
        }) && this._exec(m);
    }) || this._atomic(function() {
        var id, e, c;
        return this._list(function() {
            return this._skip() && (id = this._getIntermediate(), true) && this._rule("trans", false, [], null) && (e = this._getIntermediate(), true) && this._rule("trans", false, [], null) && (c = this._getIntermediate(), true);
        }) && this._exec(e + " === " + c);
    });
};

XJSTCompiler.prototype["tMatch"] = function $tMatch() {
    return this._atomic(function() {
        var m;
        return this._list(function() {
            return this._rule("subMatch", false, [], null) && (m = this._getIntermediate(), true);
        }) && this._exec(m);
    }) || this._atomic(function() {
        var ms;
        return this._list(function() {
            return this._many(function() {
                return this._rule("subMatch", false, [], null);
            }) && (ms = this._getIntermediate(), true);
        }) && this._exec(ms.join(" && "));
    });
};

XJSTCompiler.prototype["tBody"] = function $tBody() {
    var e;
    return this._rule("trans", false, [], null) && (e = this._getIntermediate(), true) && this._exec(e);
};

XJSTCompiler.prototype["template"] = function $template() {
    var m, b;
    return this._list(function() {
        return this._rule("tMatch", false, [], null) && (m = this._getIntermediate(), true) && this._rule("tBody", false, [], null) && (b = this._getIntermediate(), true);
    }) && this._exec("if(" + m + ") {" + b + ";return}");
};

XJSTCompiler.prototype["templates"] = function $templates() {
    var ts;
    return this._list(function() {
        return this._any(function() {
            return this._rule("template", false, [], null);
        }) && (ts = this._getIntermediate(), true);
    }) && this._exec("exports.apply = apply;function apply(c) {\nvar __this = this;\n" + ts.join("\n") + "\n};");
};

XJSTCompiler.prototype["other"] = function $other() {
    var o;
    return this._list(function() {
        return this._any(function() {
            return this._rule("trans", false, [], null);
        }) && (o = this._getIntermediate(), true);
    }) && this._exec(o.join(";"));
};

XJSTCompiler.prototype["skipBraces"] = function $skipBraces() {
    return this._atomic(function() {
        var e;
        return this._list(function() {
            return this._match("begin") && this._any(function() {
                return this._rule("skipBraces", false, [], null);
            }) && (e = this._getIntermediate(), true);
        }) && this._exec(e.join(";"));
    }) || this._atomic(function() {
        var e;
        return this._rule("trans", false, [], null) && (e = this._getIntermediate(), true) && this._exec(e);
    });
};

XJSTCompiler.prototype["topLevel"] = function $topLevel() {
    var o, t;
    return this._list(function() {
        return this._rule("other", false, [], null) && (o = this._getIntermediate(), true) && this._rule("templates", false, [], null) && (t = this._getIntermediate(), true);
    }) && this._exec(function() {
        return "(function(exports) {" + o + ";" + t + 'return exports})(typeof exports === "undefined"? {} : exports)';
    }.call(this));
};
