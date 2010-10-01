var ometa = require('ometajs'),
    OMeta = ometa.OMeta,
    Parser = ometa.Parser,
    BSJSParser = exports.BSJSParser = ometa.BSJSParser,
    BSJSTranslator = exports.BSJSTranslator = ometa.BSJSTranslator;

function Identifier () {
    this.counter = 0;
    this.cache = {};
}

Identifier.prototype.identify = function(o) {
    var key = JSON.stringify(o);
    return key in this.cache ?
        this.cache[key] :
        this.cache[key] = ++this.counter;
};

exports.compile = function(templates) {

    function newPredicMemo(o, k, v) {
        var r = {};
        for(var i in o) r[i] = o[i];
        r[k] = v;
        return r;
    }

    var predicatesValues = (function() {
            var vals = {};

            templates.forEach(function(t){
                t[0].forEach(function(subMatch){
                    var p = subMatch[0],
                        c = JSON.stringify(subMatch[2]);
                    (vals[p] || (vals[p] = {}))[c] = subMatch[2];
                });
            });

            for(var p in vals) {
                var vs = [];
                for(var v in vals[p]) vs.push(vals[p][v]);
                vals[p] = vs;
            }

            return vals;
        })();

    function doTemplate(i, j, predicMemo) {
        var template = templates[i];
        if(!template) return { 'stmt': ['throw', ['get', 'true']] };

        var subMatch = template[0][j];
        if(!subMatch) return {
            //comment: JSON.stringify([i, j, predicMemo]),
            stmt: template[1] };

        var jj = j, s;
        while(s = template[0][++jj]) {
            var predicate = s[0],
                predicateConst = s[2];

            if(predicate in predicMemo)
                if(predicMemo[predicate] != JSON.stringify(predicateConst))
                    return doTemplate(i + 1, 0, predicMemo);
        }

        var predicate = subMatch[0],
            predicateConst = subMatch[2];

        if(predicate in predicMemo)
            if(predicMemo[predicate] == JSON.stringify(predicateConst))
                return doTemplate(i, j + 1, predicMemo);
            else
                return doTemplate(i + 1, 0, predicMemo);
        else
            return {
                //'comment': JSON.stringify([i, j, predicMemo]),
                'switch': subMatch[1],
                'cases': predicatesValues[predicate].map(function(v){
                        return [v, doTemplate(i, j, newPredicMemo(predicMemo, predicate, JSON.stringify(v)))]
                    }),
                'default': doTemplate(i, j, newPredicMemo(predicMemo, predicate, undefined))
            };
    }

    var cache = {},
        idCounter = 1,
        merges = {};

    function merge(o) {
        var hash,
            id = idCounter++;

        if(o['switch']) {
            hash += 'switch ' + JSON.stringify(o['switch']) + '{';
            o.cases.forEach(function(c){
                c[1] = merge(c[1]);
                hash += c[1].hash + " ";
            });
            o['default'] = merge(o['default']);
            hash += o['default'].hash + "}";
        } else {
            hash = JSON.stringify(o.exprs || o.stmt);
        }

        (hash in cache) || (cache[o.hash = hash] = o);
        cache[hash].id = id;

        return cache[hash];
    }

    function serialize(o, tails) {
        if(o.id in merges) {
            tails[o.id] = o;
            return 'break l' + o.id + ';';
        }

        var res = '';

        o.comment && (res += '/*' + o.comment + '*/\n');
        o.id && (res += '/*' + o.id + '*/');

        if(o['switch']) {
            if(o.cases.length == 1) {
                var c = o.cases[0];
                res += 'if(' +
                    XJSTCompiler.match(o['switch'], 'trans') +
                    ' === ' +
                    XJSTCompiler.match(c[0], 'trans') + ') {\n' +
                        serialize(c[1], tails) +
                    '} else {\n' +
                        serialize(o['default'], tails) +
                    '}';
            } else {
                res += 'switch(' + XJSTCompiler.match(o['switch'], 'trans') + ') {\n' +
                    o.cases.map(function(c){
                        return 'case ' + XJSTCompiler.match(c[0], 'trans') + ':\n' +
                            serialize(c[1], tails) + '; break;'
                        }).join('\n') +
                    'default: ' + serialize(o['default'], tails) +
                    '}\n';
            }
        } else {
            res += o.exprs ?
                'return ' + XJSTCompiler.match(o.exprs, 'tBody') :
                XJSTCompiler.match(o.stmt, 'trans') + ';return;';
        }
        return res;
    }

    function shiftTails(tails) {
        var ids = [];
        for(var i in tails) ids.push(i);
        ids.sort(function(a, b) { return a - b });
        var res = tails[ids[0]];
        delete tails[ids[0]];
        return res;
    }

    function detectJoins(o, joins) {
        if(o.id in joins) {
            joins[o.id]++;
        } else {
            joins[o.id] = 1;
            if(o['switch']) {
                o.cases.forEach(function(c){ detectJoins(c[1], joins) });
                detectJoins(o['default'], joins);
            }
        }
        return joins;
    }

    function serializeTop(prog) {
        var res = '(function(c){\n',
            joins = detectJoins(prog, {});

        var labels = [];
        for(var k in joins) {
            if(joins[k] == 1) continue
            labels.push(k);
            merges[k] = true;
        }
        labels.sort(function(a, b) { return b - a });

        res += labels.map(function(l){ return 'l' + l + ': {\n' }).join('');

        var tails = {};
        tails[prog.id] = prog;
        var t, first = true;
        while(t = shiftTails(tails)) {
            first || (res += '}');
            first = false;
            delete merges[t.id];
            res += serialize(t, tails);
        }

        return res += '})';
    }

    return serializeTop(merge(doTemplate(0, 0, {})));

};
{var XJSTParser=exports.XJSTParser=objectThatDelegatesTo(BSJSParser,{
"const":function(){var $elf=this,_fromIdx=this.input.idx,s,n;return this._or((function(){return this._form((function(){return (function(){this._applyWithArgs("exactly","string");return s=this._apply("anything")}).call(this)}))}),(function(){return this._form((function(){return (function(){this._applyWithArgs("exactly","number");return n=this._apply("anything")}).call(this)}))}))},
"isKeyword":function(){var $elf=this,_fromIdx=this.input.idx,x;return (function(){x=this._apply("anything");return this._pred((BSJSParser._isKeyword(x) || (x == "local")))}).call(this)},
"stmt":function(){var $elf=this,_fromIdx=this.input.idx,c,t;return this._or((function(){return (function(){this._applyWithArgs("token","local");this._applyWithArgs("token","(");c=this._apply("expr");this._applyWithArgs("token",")");t=this._apply("stmt");return XJSTParser.match(["local",c,t],"local")}).call(this)}),(function(){return BSJSParser._superApplyWithArgs(this,'stmt')}))},
"local":function(){var $elf=this,_fromIdx=this.input.idx,es,t;return (function(){this._form((function(){return (function(){this._applyWithArgs("exactly","local");es=this._apply("localExprs");return t=this._apply("anything")}).call(this)}));return (function (){var id = XJSTParser._getLocalId(),res = ["begin"];es.forEach((function (x){res["push"].apply(res,x[(0)])}));res.push(t);es.reverse().forEach((function (x){res["push"].apply(res,x[(1)])}));return res}).call(this)}).call(this)},
"localExprs":function(){var $elf=this,_fromIdx=this.input.idx,e1,es,e2;return this._or((function(){return (function(){e1=this._apply("localExpr");return [e1]}).call(this)}),(function(){return (function(){this._form((function(){return (function(){this._applyWithArgs("exactly","binop");this._applyWithArgs("exactly",",");es=this._apply("localExprs");return e2=this._apply("localExpr")}).call(this)}));return (function (){es.push(e2);return es}).call(this)}).call(this)}))},
"localExpr":function(){var $elf=this,_fromIdx=this.input.idx,n,p,v,k,o,p,v,k,o,p,v;return this._or((function(){return (function(){this._form((function(){return (function(){this._applyWithArgs("exactly","set");p=this._form((function(){return (function(){this._applyWithArgs("exactly","get");return n=this._apply("anything")}).call(this)}));return v=this._apply("anything")}).call(this)}));return (function (){var id = XJSTParser._getLocalId();return [[["var",[("__v" + id),p]],["set",["get",n],v]],[["set",["get",n],["get",("__v" + id)]]]]}).call(this)}).call(this)}),(function(){return (function(){this._form((function(){return (function(){this._applyWithArgs("exactly","set");p=this._form((function(){return (function(){this._applyWithArgs("exactly","getp");k=this._apply("const");return o=this._apply("anything")}).call(this)}));return v=this._apply("anything")}).call(this)}));return (function (){var id = XJSTParser._getLocalId(),vTree = ["getp",k,["get",("__o" + id)]];return [[["var",[("__o" + id),o],[("__v" + id),vTree]],["set",vTree,v]],[["set",vTree,["get",("__v" + id)]]]]}).call(this)}).call(this)}),(function(){return (function(){this._form((function(){return (function(){this._applyWithArgs("exactly","set");p=this._form((function(){return (function(){this._applyWithArgs("exactly","getp");k=this._apply("anything");return o=this._apply("anything")}).call(this)}));return v=this._apply("anything")}).call(this)}));return (function (){var id = XJSTParser._getLocalId(),vTree = ["getp",["get",("__k" + id)],["get",("__o" + id)]];return [[["var",[("__o" + id),o],[("__k" + id),k],[("__v" + id),vTree]],["set",vTree,v]],[["set",vTree,["get",("__v" + id)]]]]}).call(this)}).call(this)}))},
"tBody":function(){var $elf=this,_fromIdx=this.input.idx;return this._apply("stmt")},
"subMatch":function(){var $elf=this,_fromIdx=this.input.idx,e1,c,c,e2,e3;return this._or((function(){return (function(){this._form((function(){return (function(){this._applyWithArgs("exactly","binop");this._applyWithArgs("exactly","===");e1=this._apply("anything");return c=this._apply("const")}).call(this)}));return [e1,c]}).call(this)}),(function(){return (function(){this._form((function(){return (function(){this._applyWithArgs("exactly","binop");this._applyWithArgs("exactly","===");c=this._apply("const");return e2=this._apply("anything")}).call(this)}));return [e2,c]}).call(this)}),(function(){return (function(){e3=this._apply("anything");return [["unop","!",e3],["get","false"]]}).call(this)}))},
"expr2match":function(){var $elf=this,_fromIdx=this.input.idx,ms,m1,m2;return this._or((function(){return (function(){this._form((function(){return (function(){this._applyWithArgs("exactly","binop");this._applyWithArgs("exactly","&&");ms=this._apply("expr2match");return m1=this._apply("subMatch")}).call(this)}));return (function (){ms.push(m1);return ms}).call(this)}).call(this)}),(function(){return (function(){m2=this._apply("subMatch");return [m2]}).call(this)}))},
"tMatch":function(){var $elf=this,_fromIdx=this.input.idx,ms;return (function(){ms=this._apply("expr");return XJSTParser.match(ms,"expr2match")}).call(this)},
"template":function(){var $elf=this,_fromIdx=this.input.idx,m,b;return (function(){m=this._apply("tMatch");this._apply("spaces");b=this._apply("tBody");return [m,b]}).call(this)},
"topLevel":function(){var $elf=this,_fromIdx=this.input.idx,r;return (function(){r=this._many1((function(){return this._apply("template")}));this._many((function(){return this._applyWithArgs("exactly","\n")}));this._apply("end");return XJSTParser._identify(r)}).call(this)}});(XJSTParser["_getLocalIdCounter"]=(0));(XJSTParser["_getLocalId"]=(function (){return this["_getLocalIdCounter"]++}));(XJSTParser["_identify"]=(function (templates){var predicates = new Identifier();templates.forEach((function (template){template[(0)].forEach((function (subMatch){subMatch.unshift(predicates.identify(subMatch[(0)]))}))}));return templates}));var XJSTBeautifier=exports.XJSTBeautifier=objectThatDelegatesTo(OMeta,{
"trans":function(){var $elf=this,_fromIdx=this.input.idx,t,ans;return (function(){this._form((function(){return (function(){t=this._apply("anything");return ans=this._applyWithArgs("apply",t)}).call(this)}));return ans}).call(this)},
"curlyTrans":function(){var $elf=this,_fromIdx=this.input.idx,r,rs,r;return this._or((function(){return (function(){this._form((function(){return (function(){this._applyWithArgs("exactly","begin");return r=this._apply("curlyTrans")}).call(this)}));return r}).call(this)}),(function(){return (function(){this._form((function(){return (function(){this._applyWithArgs("exactly","begin");return rs=this._many((function(){return this._apply("trans")}))}).call(this)}));return (("{ " + rs.join(";")) + " }")}).call(this)}),(function(){return (function(){r=this._apply("trans");return (("{ " + r) + " }")}).call(this)}))},
"nameString":function(){var $elf=this,_fromIdx=this.input.idx,n;return (function(){n=this._apply("anything");this._pred((XJSTParser.matchAll(n,"name")[(1)] == n));return n}).call(this)},
"this":function(){var $elf=this,_fromIdx=this.input.idx;return "this"},
"break":function(){var $elf=this,_fromIdx=this.input.idx;return "break"},
"continue":function(){var $elf=this,_fromIdx=this.input.idx;return "continue"},
"number":function(){var $elf=this,_fromIdx=this.input.idx,n;return (function(){n=this._apply("anything");return n}).call(this)},
"string":function(){var $elf=this,_fromIdx=this.input.idx,s;return (function(){s=this._apply("anything");return s.toProgramString()}).call(this)},
"arr":function(){var $elf=this,_fromIdx=this.input.idx,xs;return (function(){xs=this._many((function(){return this._apply("trans")}));return (("[" + xs.join(", ")) + "]")}).call(this)},
"unop":function(){var $elf=this,_fromIdx=this.input.idx,op,x;return (function(){op=this._apply("anything");x=this._apply("trans");return (op + x)}).call(this)},
"getp":function(){var $elf=this,_fromIdx=this.input.idx,n,fd,p,x;return (function(){p=this._or((function(){return (function(){this._form((function(){return (function(){this._applyWithArgs("exactly","string");return n=this._apply("nameString")}).call(this)}));return ("." + n)}).call(this)}),(function(){return (function(){fd=this._apply("trans");return (("[" + fd) + "]")}).call(this)}));x=this._apply("trans");return (x + p)}).call(this)},
"get":function(){var $elf=this,_fromIdx=this.input.idx,x;return (function(){x=this._apply("anything");return x}).call(this)},
"set":function(){var $elf=this,_fromIdx=this.input.idx,lhs,rhs;return (function(){lhs=this._apply("trans");rhs=this._apply("trans");return ((lhs + " = ") + rhs)}).call(this)},
"mset":function(){var $elf=this,_fromIdx=this.input.idx,lhs,op,rhs;return (function(){lhs=this._apply("trans");op=this._apply("anything");rhs=this._apply("trans");return ((((lhs + " ") + op) + "= ") + rhs)}).call(this)},
"binop":function(){var $elf=this,_fromIdx=this.input.idx,op,x,y;return (function(){op=this._apply("anything");x=this._apply("trans");y=this._apply("trans");return ((((x + " ") + op) + " ") + y)}).call(this)},
"preop":function(){var $elf=this,_fromIdx=this.input.idx,op,x;return (function(){op=this._apply("anything");x=this._apply("trans");return (op + x)}).call(this)},
"postop":function(){var $elf=this,_fromIdx=this.input.idx,op,x;return (function(){op=this._apply("anything");x=this._apply("trans");return (x + op)}).call(this)},
"return":function(){var $elf=this,_fromIdx=this.input.idx,x;return (function(){x=this._apply("trans");return ("return " + x)}).call(this)},
"with":function(){var $elf=this,_fromIdx=this.input.idx,x,s;return (function(){x=this._apply("trans");s=this._apply("curlyTrans");return ((("with(" + x) + ")") + s)}).call(this)},
"if":function(){var $elf=this,_fromIdx=this.input.idx,cond,t,e;return (function(){cond=this._apply("trans");t=this._apply("curlyTrans");e=this._apply("curlyTrans");return ((((("if(" + cond) + ")") + t) + " else ") + e)}).call(this)},
"condExpr":function(){var $elf=this,_fromIdx=this.input.idx,cond,t,e;return (function(){cond=this._apply("trans");t=this._apply("trans");e=this._apply("trans");return (((((("(" + cond) + " ? ") + t) + " : ") + e) + ")")}).call(this)},
"while":function(){var $elf=this,_fromIdx=this.input.idx,cond,body;return (function(){cond=this._apply("trans");body=this._apply("curlyTrans");return ((("while(" + cond) + ")") + body)}).call(this)},
"doWhile":function(){var $elf=this,_fromIdx=this.input.idx,body,cond;return (function(){body=this._apply("curlyTrans");cond=this._apply("trans");return (((("do" + body) + "while(") + cond) + ")")}).call(this)},
"for":function(){var $elf=this,_fromIdx=this.input.idx,init,cond,upd,body;return (function(){init=this._apply("trans");cond=this._apply("trans");upd=this._apply("trans");body=this._apply("curlyTrans");return ((((((("for(" + init) + ";") + cond) + ";") + upd) + ")") + body)}).call(this)},
"forIn":function(){var $elf=this,_fromIdx=this.input.idx,x,arr,body;return (function(){x=this._apply("trans");arr=this._apply("trans");body=this._apply("curlyTrans");return ((((("for(" + x) + " in ") + arr) + ")") + body)}).call(this)},
"begin":function(){var $elf=this,_fromIdx=this.input.idx,x,x,xs;return this._or((function(){return (function(){x=this._apply("trans");this._apply("end");return x}).call(this)}),(function(){return (function(){xs=this._many((function(){return (function(){x=this._apply("trans");return this._or((function(){return (function(){this._or((function(){return this._pred((x[(x["length"] - (1))] == "}"))}),(function(){return this._apply("end")}));return x}).call(this)}),(function(){return (function(){this._apply("empty");return (x + ";")}).call(this)}))}).call(this)}));return (("{" + xs.join("")) + "}")}).call(this)}))},
"func":function(){var $elf=this,_fromIdx=this.input.idx,args,body;return (function(){args=this._apply("anything");body=this._apply("curlyTrans");return (((("(function (" + args.join(", ")) + ")") + body) + ")")}).call(this)},
"call":function(){var $elf=this,_fromIdx=this.input.idx,fn,args;return (function(){fn=this._apply("trans");args=this._many((function(){return this._apply("trans")}));return (((fn + "(") + args.join(", ")) + ")")}).call(this)},
"send":function(){var $elf=this,_fromIdx=this.input.idx,msg,recv,args;return (function(){msg=this._apply("anything");recv=this._apply("trans");args=this._many((function(){return this._apply("trans")}));return (((((recv + ".") + msg) + "(") + args.join(", ")) + ")")}).call(this)},
"new":function(){var $elf=this,_fromIdx=this.input.idx,cls,args;return (function(){cls=this._apply("anything");args=this._many((function(){return this._apply("trans")}));return (((("new " + cls) + "(") + args.join(", ")) + ")")}).call(this)},
"var":function(){var $elf=this,_fromIdx=this.input.idx,n,v,vs;return (function(){vs=this._many1((function(){return (function(){this._form((function(){return (function(){n=this._apply("anything");return v=this._apply("trans")}).call(this)}));return ((n + " = ") + v)}).call(this)}));return ("var " + vs.join(","))}).call(this)},
"throw":function(){var $elf=this,_fromIdx=this.input.idx,x;return (function(){x=this._apply("trans");return ("throw " + x)}).call(this)},
"try":function(){var $elf=this,_fromIdx=this.input.idx,x,name,c,f;return (function(){x=this._apply("curlyTrans");name=this._apply("anything");c=this._apply("curlyTrans");f=this._apply("curlyTrans");return ((((((("try " + x) + "catch(") + name) + ")") + c) + "finally") + f)}).call(this)},
"json":function(){var $elf=this,_fromIdx=this.input.idx,props;return (function(){props=this._many((function(){return this._apply("trans")}));return (("{ " + props.join(", ")) + " }")}).call(this)},
"binding":function(){var $elf=this,_fromIdx=this.input.idx,n2,name,val;return (function(){name=this._or((function(){return this._apply("nameString")}),(function(){return (function(){n2=this._apply("anything");return n2.toProgramString()}).call(this)}));val=this._apply("trans");return ((name + ": ") + val)}).call(this)},
"switch":function(){var $elf=this,_fromIdx=this.input.idx,x,cases;return (function(){x=this._apply("trans");cases=this._many((function(){return this._apply("trans")}));return (((("switch(" + x) + "){") + cases.join(";")) + "}")}).call(this)},
"case":function(){var $elf=this,_fromIdx=this.input.idx,x,y;return (function(){x=this._apply("trans");y=this._apply("trans");return ((("case " + x) + ": ") + y)}).call(this)},
"default":function(){var $elf=this,_fromIdx=this.input.idx,y;return (function(){y=this._apply("trans");return ("default: " + y)}).call(this)},
"subMatch":function(){var $elf=this,_fromIdx=this.input.idx,id,m,id,e,c;return this._or((function(){return (function(){this._form((function(){return (function(){id=this._apply("anything");m=this._apply("trans");return this._form((function(){return (function(){this._applyWithArgs("exactly","get");return this._applyWithArgs("exactly","true")}).call(this)}))}).call(this)}));return m}).call(this)}),(function(){return (function(){this._form((function(){return (function(){id=this._apply("anything");e=this._apply("trans");return c=this._apply("trans")}).call(this)}));return ((e + " == ") + c)}).call(this)}))},
"tMatch":function(){var $elf=this,_fromIdx=this.input.idx,m,ms;return this._or((function(){return (function(){this._form((function(){return m=this._apply("subMatch")}));return m}).call(this)}),(function(){return (function(){this._form((function(){return ms=this._many1((function(){return this._apply("subMatch")}))}));return ms.join(" && ")}).call(this)}))},
"tBody":function(){var $elf=this,_fromIdx=this.input.idx,e;return (function(){e=this._apply("trans");return ("\n    " + e)}).call(this)},
"template":function(){var $elf=this,_fromIdx=this.input.idx,m,b;return (function(){this._form((function(){return (function(){m=this._apply("tMatch");return b=this._apply("tBody")}).call(this)}));return (m + b)}).call(this)},
"topLevel":function(){var $elf=this,_fromIdx=this.input.idx,ts;return (function(){ts=this._many1((function(){return this._apply("template")}));return ts.join("\n\n")}).call(this)}});var XJSTCompiler=exports.XJSTCompiler=objectThatDelegatesTo(BSJSTranslator,{
"subMatch":function(){var $elf=this,_fromIdx=this.input.idx,id,m,id,e,c;return this._or((function(){return (function(){this._form((function(){return (function(){id=this._apply("anything");m=this._apply("trans");return this._form((function(){return (function(){this._applyWithArgs("exactly","get");return this._applyWithArgs("exactly","true")}).call(this)}))}).call(this)}));return m}).call(this)}),(function(){return (function(){this._form((function(){return (function(){id=this._apply("anything");e=this._apply("trans");return c=this._apply("trans")}).call(this)}));return ((e + " === ") + c)}).call(this)}))},
"tMatch":function(){var $elf=this,_fromIdx=this.input.idx,m,ms;return this._or((function(){return (function(){this._form((function(){return m=this._apply("subMatch")}));return m}).call(this)}),(function(){return (function(){this._form((function(){return ms=this._many1((function(){return this._apply("subMatch")}))}));return ms.join(" && ")}).call(this)}))},
"tBody":function(){var $elf=this,_fromIdx=this.input.idx,e;return (function(){e=this._apply("trans");return e}).call(this)},
"template":function(){var $elf=this,_fromIdx=this.input.idx,m,b;return (function(){this._form((function(){return (function(){m=this._apply("tMatch");return b=this._apply("tBody")}).call(this)}));return (((("    if(" + m) + ") {") + b) + ";return}")}).call(this)},
"topLevel":function(){var $elf=this,_fromIdx=this.input.idx,ts;return (function(){ts=this._many1((function(){return this._apply("template")}));return (("(function(c){\n" + ts.join("\n")) + "\n})")}).call(this)},
"topLevel2":function(){var $elf=this,_fromIdx=this.input.idx,ts;return (function(){ts=this._apply("anything");return XJSTCompiler.matchAll(ts.reverse(),"topLevel2")}).call(this)}})}
