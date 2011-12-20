var ometajs_ = require('ometajs').globals || global;var StringBuffer = ometajs_.StringBuffer;
var objectThatDelegatesTo = ometajs_.objectThatDelegatesTo;
var isImmutable = ometajs_.isImmutable;
var digitValue = ometajs_.digitValue;
var isSequenceable = ometajs_.isSequenceable;
var escapeChar = ometajs_.escapeChar;
var unescape = ometajs_.unescape;
var getTag = ometajs_.getTag;
var inspect = ometajs_.inspect;
var lift = ometajs_.lift;
var clone = ometajs_.clone;
var Parser = ometajs_.Parser;
var fail = ometajs_.fail;
var OMeta = ometajs_.OMeta;
var BSNullOptimization = ometajs_.BSNullOptimization;
var BSAssociativeOptimization = ometajs_.BSAssociativeOptimization;
var BSSeqInliner = ometajs_.BSSeqInliner;
var BSJumpTableOptimization = ometajs_.BSJumpTableOptimization;
var BSOMetaOptimizer = ometajs_.BSOMetaOptimizer;
var BSOMetaParser = ometajs_.BSOMetaParser;
var BSOMetaTranslator = ometajs_.BSOMetaTranslator;
var BSJSParser = ometajs_.BSJSParser;
var BSSemActionParser = ometajs_.BSSemActionParser;
var BSJSIdentity = ometajs_.BSJSIdentity;
var BSJSTranslator = ometajs_.BSJSTranslator;
var BSOMetaJSParser = ometajs_.BSOMetaJSParser;
var BSOMetaJSTranslator = ometajs_.BSOMetaJSTranslator;
if (global === ometajs_) {
  fail = (function(fail) {
    return function() { return fail };
  })(fail);
  OMeta = require('ometajs').OMeta;
}{
    var ometajs = require("ometajs"), xjst = require("../../xjst"), utils = xjst["utils"], Identifier = utils["Identifier"], BSJSParser = ometajs["BSJSParser"], BSJSTranslator = ometajs["BSJSTranslator"], BSJSIdentity = ometajs["BSJSIdentity"];
    var XJSTParser = exports.XJSTParser = objectThatDelegatesTo(BSJSParser, {
        isKeyword: function() {
            var $elf = this, _fromIdx = this.input.idx, x;
            return function() {
                x = this._apply("anything");
                return this._pred(BSJSParser._isKeyword(x) || x === "local" || x === "apply" || x === "template" || x === "extends" || x === "super");
            }.call(this);
        },
        primExprHd: function() {
            var $elf = this, _fromIdx = this.input.idx, a, b, r, st, a, st, r, st, a, st, r, expr;
            return this._or(function() {
                return function() {
                    this._applyWithArgs("token", "local");
                    this._applyWithArgs("token", "(");
                    a = this._apply("expr");
                    this._applyWithArgs("token", ")");
                    b = this._apply("asgnExpr");
                    r = this._applyWithArgs("localExpr", [ "local", a, b ]);
                    return r;
                }.call(this);
            }, function() {
                return function() {
                    this._applyWithArgs("token", "super");
                    this._applyWithArgs("token", "apply");
                    this._applyWithArgs("token", "(");
                    this._applyWithArgs("token", ")");
                    st = this._applyWithArgs("superExpr", [ "super" ]);
                    return st;
                }.call(this);
            }, function() {
                return function() {
                    this._applyWithArgs("token", "super");
                    this._applyWithArgs("token", "apply");
                    this._applyWithArgs("token", "(");
                    a = this._apply("expr");
                    this._applyWithArgs("token", ")");
                    st = this._applyWithArgs("superExpr", [ "super" ]);
                    r = this._applyWithArgs("localExpr", [ "local", a, st ]);
                    return r;
                }.call(this);
            }, function() {
                return function() {
                    this._applyWithArgs("token", "apply");
                    this._applyWithArgs("token", "(");
                    this._applyWithArgs("token", ")");
                    st = this._applyWithArgs("applyStmt", [ "apply" ]);
                    return st;
                }.call(this);
            }, function() {
                return function() {
                    this._applyWithArgs("token", "apply");
                    this._applyWithArgs("token", "(");
                    a = this._apply("expr");
                    this._applyWithArgs("token", ")");
                    st = this._applyWithArgs("applyStmt", [ "apply" ]);
                    r = this._applyWithArgs("localExpr", [ "local", a, st ]);
                    return r;
                }.call(this);
            }, function() {
                return function() {
                    this._applyWithArgs("token", "apply");
                    expr = this._applyWithArgs("applyExpr", [ "apply" ]);
                    return expr;
                }.call(this);
            }, function() {
                return BSJSParser._superApplyWithArgs(this, "primExprHd");
            });
        },
        stmt: function() {
            var $elf = this, _fromIdx = this.input.idx, a, b, r, st, a, st, r, st, a, st, r;
            return this._or(function() {
                return function() {
                    this._applyWithArgs("token", "local");
                    this._applyWithArgs("token", "(");
                    a = this._apply("expr");
                    this._applyWithArgs("token", ")");
                    b = this._apply("stmt");
                    r = this._applyWithArgs("localStmt", [ "local", a, b ]);
                    return r;
                }.call(this);
            }, function() {
                return function() {
                    this._applyWithArgs("token", "super");
                    this._applyWithArgs("token", "apply");
                    this._applyWithArgs("token", "(");
                    this._applyWithArgs("token", ")");
                    st = this._applyWithArgs("superStmt", [ "super" ]);
                    return st;
                }.call(this);
            }, function() {
                return function() {
                    this._applyWithArgs("token", "super");
                    this._applyWithArgs("token", "apply");
                    this._applyWithArgs("token", "(");
                    a = this._apply("expr");
                    this._applyWithArgs("token", ")");
                    st = this._applyWithArgs("superStmt", [ "super" ]);
                    r = this._applyWithArgs("localStmt", [ "local", a, st ]);
                    return r;
                }.call(this);
            }, function() {
                return function() {
                    this._applyWithArgs("token", "apply");
                    this._applyWithArgs("token", "(");
                    this._applyWithArgs("token", ")");
                    st = this._applyWithArgs("applyStmt", [ "apply" ]);
                    return st;
                }.call(this);
            }, function() {
                return function() {
                    this._applyWithArgs("token", "apply");
                    this._applyWithArgs("token", "(");
                    a = this._apply("expr");
                    this._applyWithArgs("token", ")");
                    st = this._applyWithArgs("applyStmt", [ "apply" ]);
                    r = this._applyWithArgs("localStmt", [ "local", a, st ]);
                    return r;
                }.call(this);
            }, function() {
                return BSJSParser._superApplyWithArgs(this, "stmt");
            });
        },
        "extends": function() {
            var $elf = this, _fromIdx = this.input.idx, filename;
            return function() {
                this._applyWithArgs("token", "extends");
                this._apply("spaces");
                filename = this._apply("str");
                return [ "extends", filename[1] ];
            }.call(this);
        },
        template: function() {
            var $elf = this, _fromIdx = this.input.idx, m, b;
            return function() {
                this._applyWithArgs("token", "template");
                this._applyWithArgs("token", "(");
                m = this._apply("expr");
                this._applyWithArgs("token", ")");
                b = this._apply("stmt");
                return [ "template", m, b ];
            }.call(this);
        },
        superExpr: function() {
            var $elf = this, _fromIdx = this.input.idx, st;
            return function() {
                this._form(function() {
                    return this._applyWithArgs("exactly", "super");
                });
                st = this._applyWithArgs("applyStmt", [ "apply" ]);
                return [ "superExpr", st ];
            }.call(this);
        },
        superStmt: function() {
            var $elf = this, _fromIdx = this.input.idx, st;
            return function() {
                this._form(function() {
                    return this._applyWithArgs("exactly", "super");
                });
                st = this._applyWithArgs("applyStmt", [ "apply" ]);
                return [ "superStmt", st ];
            }.call(this);
        },
        applyStmt: function() {
            var $elf = this, _fromIdx = this.input.idx;
            return function() {
                this._form(function() {
                    return this._applyWithArgs("exactly", "apply");
                });
                return [ "nhApplyStmt", {} ];
            }.call(this);
        },
        applyExpr: function() {
            var $elf = this, _fromIdx = this.input.idx;
            return function() {
                this._form(function() {
                    return this._applyWithArgs("exactly", "apply");
                });
                return [ "nhApplyExpr" ];
            }.call(this);
        },
        localStmt: function() {
            var $elf = this, _fromIdx = this.input.idx, a, b;
            return function() {
                this._form(function() {
                    return function() {
                        this._applyWithArgs("exactly", "local");
                        a = this._apply("anything");
                        return b = this._apply("anything");
                    }.call(this);
                });
                return [ "localStmt", a, b ];
            }.call(this);
        },
        localExpr: function() {
            var $elf = this, _fromIdx = this.input.idx, a, b;
            return function() {
                this._form(function() {
                    return function() {
                        this._applyWithArgs("exactly", "local");
                        a = this._apply("anything");
                        return b = this._apply("anything");
                    }.call(this);
                });
                return [ "localExpr", a, b ];
            }.call(this);
        },
        topLevel: function() {
            var $elf = this, _fromIdx = this.input.idx, t, t, s, ts;
            return function() {
                ts = this._many1(function() {
                    return this._or(function() {
                        return function() {
                            t = this._apply("extends");
                            return t;
                        }.call(this);
                    }, function() {
                        return function() {
                            t = this._apply("template");
                            return t;
                        }.call(this);
                    }, function() {
                        return function() {
                            s = this._apply("srcElem");
                            return [ "stmt", s ];
                        }.call(this);
                    });
                });
                this._apply("spaces");
                this._apply("end");
                return ts;
            }.call(this);
        }
    });
    var XJSTTranslator = exports.XJSTTranslator = objectThatDelegatesTo(BSJSIdentity, {
        "const": function() {
            var $elf = this, _fromIdx = this.input.idx, s, n;
            return this._or(function() {
                return this._form(function() {
                    return function() {
                        this._applyWithArgs("exactly", "string");
                        return s = this._apply("anything");
                    }.call(this);
                });
            }, function() {
                return this._form(function() {
                    return function() {
                        this._applyWithArgs("exactly", "number");
                        return n = this._apply("anything");
                    }.call(this);
                });
            });
        },
        "extends": function() {
            var $elf = this, _fromIdx = this.input.idx, filename;
            return function() {
                filename = this._apply("anything");
                return [ "extends", filename ];
            }.call(this);
        },
        superStmt: function() {
            var $elf = this, _fromIdx = this.input.idx, op, st;
            return function() {
                op = this._apply("anything");
                st = this._applyWithArgs("localStmt", [ "json", [ "binding", "__d0" + this["id"], [ "get", true ] ] ], op);
                return st;
            }.call(this);
        },
        superExpr: function() {
            var $elf = this, _fromIdx = this.input.idx, op, st;
            return function() {
                op = this._apply("anything");
                st = this._applyWithArgs("localExpr", [ "json", [ "binding", "__d" + this["id"], [ "get", true ] ] ], op);
                return st;
            }.call(this);
        },
        nhApplyStmt: function() {
            var $elf = this, _fromIdx = this.input.idx, p;
            return function() {
                p = this._apply("anything");
                return [ "applyStmt", p ];
            }.call(this);
        },
        nhApplyExpr: function() {
            var $elf = this, _fromIdx = this.input.idx;
            return [ "nhApplyExpr" ];
        },
        localStmt: function() {
            var $elf = this, _fromIdx = this.input.idx, as, t;
            return function() {
                as = this._apply("localAsmts");
                t = this._apply("trans");
                return [ "begin" ].concat([ [ "localStart", XJSTTranslator._localToPred(this["identifier"], as) ] ], as[0], [ t ], as[1], [ [ "localEnd" ] ]);
            }.call(this);
        },
        localExpr: function() {
            var $elf = this, _fromIdx = this.input.idx, as, t;
            return function() {
                as = this._apply("localAsmts");
                t = this._apply("trans");
                return function() {
                    var prelude = [ [ "localStart", XJSTTranslator._localToPred(this["identifier"], as) ] ], result = XJSTTranslator._getLocalVar(this), $elf = this;
                    as[0].forEach(function(e) {
                        if (e[0] === "var") {
                            e.slice(1).forEach(function(v) {
                                $elf["_vars"].push([ v[0] ]);
                                prelude.push([ "set", [ "get", v[0] ], v[1] ]);
                            });
                        } else {
                            prelude.push(e);
                        }
                    });
                    return [].concat(prelude, [ [ "set", result, t ] ], as[1], [ [ "localEnd" ], result ]).reduce(function(a, i) {
                        return a ? [ "binop", ",", a, i ] : i;
                    });
                }.call(this);
            }.call(this);
        },
        bindingToAsmt: function() {
            var $elf = this, _fromIdx = this.input.idx, k, v, r;
            return function() {
                this._form(function() {
                    return function() {
                        this._applyWithArgs("exactly", "binding");
                        k = this._apply("anything");
                        return v = this._apply("anything");
                    }.call(this);
                });
                r = this._applyWithArgs("localAsmt", [ "set", [ "getp", [ "string", k ], [ "get", "__this" ] ], v ]);
                return r;
            }.call(this);
        },
        localAsmts: function() {
            var $elf = this, _fromIdx = this.input.idx, as, e1, es, e2;
            return this._or(function() {
                return function() {
                    this._form(function() {
                        return function() {
                            this._applyWithArgs("exactly", "json");
                            return as = this._many(function() {
                                return this._apply("bindingToAsmt");
                            });
                        }.call(this);
                    });
                    return function() {
                        var es = [];
                        as.forEach(function(a) {
                            a.forEach(function(e, i) {
                                es[i] = es[i] ? es[i].concat(e) : e;
                            });
                        });
                        return es;
                    }.call(this);
                }.call(this);
            }, function() {
                return function() {
                    e1 = this._apply("localAsmt");
                    return e1;
                }.call(this);
            }, function() {
                return function() {
                    this._form(function() {
                        return function() {
                            this._applyWithArgs("exactly", "binop");
                            this._applyWithArgs("exactly", ",");
                            es = this._apply("localAsmts");
                            return e2 = this._apply("localAsmt");
                        }.call(this);
                    });
                    return function() {
                        es.forEach(function(e, i) {
                            es[i] = e.concat(e2[i]);
                        });
                        return es;
                    }.call(this);
                }.call(this);
            });
        },
        localAsmt: function() {
            var $elf = this, _fromIdx = this.input.idx, n, k, o, p, v, props;
            return function() {
                this._form(function() {
                    return function() {
                        this._applyWithArgs("exactly", "set");
                        p = this._form(function() {
                            return function() {
                                switch (this._apply("anything")) {
                                  case "getp":
                                    return function() {
                                        k = this._apply("anything");
                                        return o = this._apply("anything");
                                    }.call(this);
                                  case "get":
                                    return n = this._apply("anything");
                                  default:
                                    throw fail();
                                }
                            }.call(this);
                        });
                        return v = this._apply("anything");
                    }.call(this);
                });
                props = this._applyWithArgs("localProps", p);
                return function() {
                    var lv = XJSTTranslator._getLocalVar(this), vars = [ [ "var" ].concat(props[1], [ [ lv[1], props[0] ] ]) ];
                    return [ vars.concat([ [ "set", props[0], v ] ]), [ [ "set", props[0], lv ] ], [ [ p, v ] ] ];
                }.call(this);
            }.call(this);
        },
        localProps: function() {
            var $elf = this, _fromIdx = this.input.idx, k, expr, k, o, expr, k, k, o, k, o, expr;
            return this._or(function() {
                return function() {
                    expr = this._form(function() {
                        return function() {
                            this._applyWithArgs("exactly", "getp");
                            k = this._apply("const");
                            return this._form(function() {
                                return this._applyWithArgs("exactly", "this");
                            });
                        }.call(this);
                    });
                    return [ expr, [] ];
                }.call(this);
            }, function() {
                return function() {
                    expr = this._form(function() {
                        return function() {
                            this._applyWithArgs("exactly", "getp");
                            k = this._apply("const");
                            return this._form(function() {
                                return function() {
                                    this._applyWithArgs("exactly", "get");
                                    return o = this._apply("anything");
                                }.call(this);
                            });
                        }.call(this);
                    });
                    return [ expr, [] ];
                }.call(this);
            }, function() {
                return function() {
                    this._form(function() {
                        return function() {
                            this._applyWithArgs("exactly", "getp");
                            k = this._apply("anything");
                            return this._form(function() {
                                return this._applyWithArgs("exactly", "this");
                            });
                        }.call(this);
                    });
                    return function() {
                        var v = XJSTTranslator._getLocalVar(this);
                        return [ [ "getp", v, [ "this" ] ], [ [ v[1], k ] ] ];
                    }.call(this);
                }.call(this);
            }, function() {
                return function() {
                    this._form(function() {
                        return function() {
                            this._applyWithArgs("exactly", "getp");
                            k = this._apply("const");
                            return o = this._apply("anything");
                        }.call(this);
                    });
                    return function() {
                        var v = XJSTTranslator._getLocalVar(this);
                        return [ [ "getp", k, v ], [ [ v[1], o ] ] ];
                    }.call(this);
                }.call(this);
            }, function() {
                return function() {
                    this._form(function() {
                        return function() {
                            this._applyWithArgs("exactly", "getp");
                            k = this._apply("anything");
                            return o = this._apply("anything");
                        }.call(this);
                    });
                    return function() {
                        var v1 = XJSTTranslator._getLocalVar(this), v2 = XJSTTranslator._getLocalVar(this);
                        return [ [ "getp", v1, v2 ], [ [ v1[1], k ], [ v2[1], o ] ] ];
                    }.call(this);
                }.call(this);
            }, function() {
                return function() {
                    expr = this._apply("anything");
                    return [ expr, [] ];
                }.call(this);
            });
        },
        subMatch: function() {
            var $elf = this, _fromIdx = this.input.idx, e1, c, c, e2, e3;
            return this._or(function() {
                return function() {
                    this._form(function() {
                        return function() {
                            this._applyWithArgs("exactly", "binop");
                            this._applyWithArgs("exactly", "===");
                            e1 = this._apply("anything");
                            return c = this._apply("const");
                        }.call(this);
                    });
                    return [ e1, c ];
                }.call(this);
            }, function() {
                return function() {
                    this._form(function() {
                        return function() {
                            this._applyWithArgs("exactly", "binop");
                            this._applyWithArgs("exactly", "===");
                            c = this._apply("const");
                            return e2 = this._apply("anything");
                        }.call(this);
                    });
                    return [ e2, c ];
                }.call(this);
            }, function() {
                return function() {
                    e3 = this._apply("anything");
                    return [ [ "unop", "!", e3 ], [ "get", "false" ] ];
                }.call(this);
            });
        },
        expr2match: function() {
            var $elf = this, _fromIdx = this.input.idx, ms, m1, m2;
            return this._or(function() {
                return function() {
                    this._form(function() {
                        return function() {
                            this._applyWithArgs("exactly", "binop");
                            this._applyWithArgs("exactly", "&&");
                            ms = this._apply("expr2match");
                            return m1 = this._apply("subMatch");
                        }.call(this);
                    });
                    return function() {
                        ms.push(m1);
                        return ms;
                    }.call(this);
                }.call(this);
            }, function() {
                return function() {
                    m2 = this._apply("subMatch");
                    return [ m2 ];
                }.call(this);
            });
        },
        template: function() {
            var $elf = this, _fromIdx = this.input.idx, m, b;
            return function() {
                m = this._apply("anything");
                b = this._apply("trans");
                return [ "template", [ XJSTTranslator.match(m, "expr2match"), b ] ];
            }.call(this);
        },
        stmt: function() {
            var $elf = this, _fromIdx = this.input.idx, s;
            return function() {
                s = this._apply("trans");
                return [ "stmt", s ];
            }.call(this);
        },
        topLevel: function() {
            var $elf = this, _fromIdx = this.input.idx, id, ts;
            return function() {
                id = this._apply("anything");
                ((function() {
                    this["id"] = id;
                    this["_vars"] = [];
                    return this["identifier"] = new Identifier;
                })).call(this);
                ts = this._many(function() {
                    return this._apply("trans");
                });
                return function() {
                    if (this["_vars"]["length"]) {
                        this["_vars"].unshift("var");
                        ts.unshift([ "stmt", this["_vars"] ]);
                    } else {
                        undefined;
                    }
                    return XJSTTranslator._splitTemplates(this["identifier"], ts);
                }.call(this);
            }.call(this);
        }
    });
    XJSTTranslator["_getLocalIdCounter"] = 0;
    XJSTTranslator["_getLocalId"] = function() {
        return this["_getLocalIdCounter"]++;
    };
    XJSTTranslator["_getLocalVar"] = function(p) {
        var id = this._getLocalId();
        return [ "get", "__r" + id ];
    };
    XJSTTranslator["_localToPred"] = function(identifier, as) {
        return as[2].map(function(as) {
            var replaceThis = function(as) {
                if (Array.isArray(as)) {
                    if (as[0] === "get" && as[1] === "__this") {
                        return [ "this" ];
                    } else {
                        undefined;
                    }
                    return as.map(replaceThis);
                } else {
                    return as;
                }
            };
            as = [ identifier.identify(replaceThis(as[0])), as[0], as[1] ];
            if (as[2][0] !== "string" && as[2][0] !== "number") {
                return [ as[0], as[1], "reset" ];
            } else {
                return as;
            }
        });
    };
    XJSTTranslator["_splitTemplates"] = function(predicates, ts) {
        var extend = [], templates = [], other = [], i;
        while (i = ts.shift()) {
            i[0] === "extends" ? extend.push(i[1]) : i[0] === "template" ? templates.push(i[1]) : other.push(i[1]);
        }
        return [ other, XJSTTranslator._identify(predicates, templates.reverse()), extend ];
    };
    XJSTTranslator["_identify"] = function(predicates, templates) {
        templates.forEach(function(template) {
            template[0].forEach(function(subMatch) {
                subMatch.unshift(predicates.identify(subMatch[0]));
            });
        });
        return templates;
    };
    var XJSTLocalAndApplyCompiler = exports.XJSTLocalAndApplyCompiler = objectThatDelegatesTo(BSJSIdentity, {
        "extends": function() {
            var $elf = this, _fromIdx = this.input.idx, filename;
            return function() {
                filename = this._apply("anything");
                return [ "extends", filename ];
            }.call(this);
        },
        superStmt: function() {
            var $elf = this, _fromIdx = this.input.idx, op;
            return function() {
                op = this._apply("trans");
                return [ "superStmt", op ];
            }.call(this);
        },
        superExpr: function() {
            var $elf = this, _fromIdx = this.input.idx, op;
            return function() {
                op = this._apply("trans");
                return [ "superExpr", op ];
            }.call(this);
        },
        applyStmt: function() {
            var $elf = this, _fromIdx = this.input.idx, p;
            return function() {
                p = this._apply("anything");
                return function() {
                    this["result"].push([ "apply", p ]);
                    return [ "applyStmt", p ];
                }.call(this);
            }.call(this);
        },
        nhApplyExpr: function() {
            var $elf = this, _fromIdx = this.input.idx;
            return this._form(function() {
                return this._applyWithArgs("exactly", "nhApplyExpr");
            });
        },
        localStart: function() {
            var $elf = this, _fromIdx = this.input.idx, as;
            return function() {
                as = this._apply("anything");
                return function() {
                    this["result"].push([ "localStart", as ]);
                    return [ "localStart", as ];
                }.call(this);
            }.call(this);
        },
        localEnd: function() {
            var $elf = this, _fromIdx = this.input.idx;
            return function() {
                this["result"].push([ "localEnd" ]);
                return [ "localEnd" ];
            }.call(this);
        },
        topLevel: function() {
            var $elf = this, _fromIdx = this.input.idx, t;
            return function() {
                this["result"] = [];
                t = this._apply("trans");
                return this["result"];
            }.call(this);
        }
    });
    var XJSTCompiler = exports.XJSTCompiler = objectThatDelegatesTo(BSJSTranslator, {
        "extends": function() {
            var $elf = this, _fromIdx = this.input.idx, filename;
            return function() {
                filename = this._apply("trans");
                return '"extends" + ' + filename;
            }.call(this);
        },
        superStmt: function() {
            var $elf = this, _fromIdx = this.input.idx, op;
            return function() {
                op = this._apply("trans");
                return op;
            }.call(this);
        },
        superExpr: function() {
            var $elf = this, _fromIdx = this.input.idx, op;
            return function() {
                op = this._apply("trans");
                return op;
            }.call(this);
        },
        applyStmt: function() {
            var $elf = this, _fromIdx = this.input.idx, param;
            return function() {
                param = this._apply("anything");
                return param["code"] || "apply.call(__this)";
            }.call(this);
        },
        nhApplyStmt: function() {
            var $elf = this, _fromIdx = this.input.idx, param;
            return function() {
                param = this._apply("anything");
                return "apply()";
            }.call(this);
        },
        nhApplyExpr: function() {
            var $elf = this, _fromIdx = this.input.idx;
            return "apply";
        },
        localStmt: function() {
            var $elf = this, _fromIdx = this.input.idx, a, b;
            return function() {
                a = this._apply("trans");
                b = this._apply("trans");
                return "local (" + a + ") " + b + ";";
            }.call(this);
        },
        localExpr: function() {
            var $elf = this, _fromIdx = this.input.idx, a, b;
            return function() {
                a = this._apply("trans");
                b = this._apply("trans");
                return "local (" + a + ") " + b;
            }.call(this);
        },
        localStart: function() {
            var $elf = this, _fromIdx = this.input.idx, as;
            return function() {
                as = this._apply("anything");
                return '""';
            }.call(this);
        },
        localEnd: function() {
            var $elf = this, _fromIdx = this.input.idx;
            return '""';
        },
        subMatch: function() {
            var $elf = this, _fromIdx = this.input.idx, id, m, id, e, c;
            return this._or(function() {
                return function() {
                    this._form(function() {
                        return function() {
                            id = this._apply("anything");
                            m = this._apply("trans");
                            return this._form(function() {
                                return function() {
                                    this._applyWithArgs("exactly", "get");
                                    return this._applyWithArgs("exactly", "true");
                                }.call(this);
                            });
                        }.call(this);
                    });
                    return m;
                }.call(this);
            }, function() {
                return function() {
                    this._form(function() {
                        return function() {
                            id = this._apply("anything");
                            e = this._apply("trans");
                            return c = this._apply("trans");
                        }.call(this);
                    });
                    return e + " === " + c;
                }.call(this);
            });
        },
        tMatch: function() {
            var $elf = this, _fromIdx = this.input.idx, m, ms;
            return this._or(function() {
                return function() {
                    this._form(function() {
                        return m = this._apply("subMatch");
                    });
                    return m;
                }.call(this);
            }, function() {
                return function() {
                    this._form(function() {
                        return ms = this._many1(function() {
                            return this._apply("subMatch");
                        });
                    });
                    return ms.join(" && ");
                }.call(this);
            });
        },
        tBody: function() {
            var $elf = this, _fromIdx = this.input.idx, e;
            return function() {
                e = this._apply("trans");
                return e;
            }.call(this);
        },
        template: function() {
            var $elf = this, _fromIdx = this.input.idx, m, b;
            return function() {
                this._form(function() {
                    return function() {
                        m = this._apply("tMatch");
                        return b = this._apply("tBody");
                    }.call(this);
                });
                return "if(" + m + ") {" + b + ";return}";
            }.call(this);
        },
        templates: function() {
            var $elf = this, _fromIdx = this.input.idx, ts;
            return function() {
                this._form(function() {
                    return ts = this._many(function() {
                        return this._apply("template");
                    });
                });
                return "exports.apply = apply;function apply(c) {\nvar __this = this;\n" + ts.join("\n") + "\n};";
            }.call(this);
        },
        other: function() {
            var $elf = this, _fromIdx = this.input.idx, o;
            return function() {
                this._form(function() {
                    return o = this._many(function() {
                        return this._apply("trans");
                    });
                });
                return o.join(";");
            }.call(this);
        },
        skipBraces: function() {
            var $elf = this, _fromIdx = this.input.idx, e, e;
            return this._or(function() {
                return function() {
                    this._form(function() {
                        return function() {
                            this._applyWithArgs("exactly", "begin");
                            return e = this._many(function() {
                                return this._apply("skipBraces");
                            });
                        }.call(this);
                    });
                    return e.join(";");
                }.call(this);
            }, function() {
                return function() {
                    e = this._apply("trans");
                    return e;
                }.call(this);
            });
        },
        topLevel: function() {
            var $elf = this, _fromIdx = this.input.idx, o, t;
            return function() {
                this._form(function() {
                    return function() {
                        o = this._apply("other");
                        return t = this._apply("templates");
                    }.call(this);
                });
                return "(function(exports) {" + o + ";" + t + 'return exports})(typeof exports === "undefined"? {} : exports)';
            }.call(this);
        }
    });
}