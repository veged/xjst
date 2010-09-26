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

    function newPredicMemo(o, k, v, vv) {
        var r = {};
        for(var i in o) r[i] = o[i];

        arguments.length == 4 ?
            (r[k][vv] = true) :
            (r[k] = v);

        return r;
    }

    function doTemplate(i, j, predicMemo) {
        var template = templates[i];
        if(!template) return " throw true ";

        var subMatch = template[0][j];
        if(!subMatch) return 'return ' + XJSTCompiler.match(template[1], 'tBody') + ';';

        var predicate = subMatch[0],
            predicateConst = subMatch[2];

        if(predicate in predicMemo)
            if(typeof predicMemo[predicate] == 'string')
                if(predicMemo[predicate] == JSON.stringify(predicateConst))
                    return doTemplate(i, j + 1, predicMemo);
                else
                    return doTemplate(i + 1, 0, predicMemo);
            else
                 if(JSON.stringify(predicateConst) in predicMemo[predicate])
                    return doTemplate(i + 1, 0, predicMemo);
                 else
                    return 'if(p' + predicate + '==' + XJSTCompiler.match(predicateConst, 'trans') + '){\n' +
                        doTemplate(i, j + 1, newPredicMemo(predicMemo, predicate, JSON.stringify(predicateConst))) + '}else{\n' +
                        doTemplate(i + 1, 0, newPredicMemo(predicMemo, predicate, undefined, JSON.stringify(predicateConst))) + '}\n';
        else
            return 'var p' + predicate + '=' + XJSTCompiler.match(subMatch[1], 'trans') + ';\n' +
                doTemplate(i, j, newPredicMemo(predicMemo, predicate, {}));
    }

    return '(function(c){\n' + doTemplate(0, 0, {}) + '})';

};
{var XJSTParser=exports.XJSTParser=objectThatDelegatesTo(BSJSParser,{
"exprs":function(){var $elf=this,_fromIdx=this.input.idx,as,e;return this._or((function(){return (function(){this._applyWithArgs("token","(");as=this._applyWithArgs("listOf","expr",",");this._applyWithArgs("token",")");return as}).call(this)}),(function(){return (function(){e=this._apply("expr");return [e]}).call(this)}))},
"const":function(){var $elf=this,_fromIdx=this.input.idx,s,n;return this._or((function(){return (function(){s=this._applyWithArgs("token","string");return ["string",s]}).call(this)}),(function(){return (function(){n=this._applyWithArgs("token","number");return ["number",n]}).call(this)}))},
"tBody":function(){var $elf=this,_fromIdx=this.input.idx;return this._apply("exprs")},
"subMatch":function(){var $elf=this,_fromIdx=this.input.idx,e;return (function(){e=this._apply("expr");return XJSTParser.match(e,"expr2submathc")}).call(this)},
"expr2submathc":function(){var $elf=this,_fromIdx=this.input.idx,e1,x,c,e2;return this._or((function(){return (function(){this._form((function(){return (function(){this._applyWithArgs("exactly","binop");this._applyWithArgs("exactly","==");e1=this._apply("anything");return c=this._form((function(){return (function(){this._applyWithArgs("exactly","string");return x=this._apply("anything")}).call(this)}))}).call(this)}));return [e1,c]}).call(this)}),(function(){return (function(){e2=this._apply("anything");return [e2,["get","true"]]}).call(this)}))},
"tMatch":function(){var $elf=this,_fromIdx=this.input.idx,ms,m;return this._or((function(){return (function(){ms=this._applyWithArgs("listOf","subMatch",",");return ms}).call(this)}),(function(){return (function(){m=this._apply("subMatch");return [m]}).call(this)}))},
"template":function(){var $elf=this,_fromIdx=this.input.idx,m,b;return (function(){m=this._apply("tMatch");this._apply("spaces");b=this._apply("tBody");return [m,b]}).call(this)},
"topLevel":function(){var $elf=this,_fromIdx=this.input.idx,r;return (function(){r=this._many1((function(){return this._apply("template")}));this._many((function(){return this._applyWithArgs("exactly","\n")}));this._apply("end");return XJSTParser._identify(r)}).call(this)}});(XJSTParser["_identify"]=(function (templates){var predicates=new Identifier();templates.forEach((function (template){template[(0)].forEach((function (subMatch){subMatch.unshift(predicates.identify(subMatch[(0)]))}))}));return templates}));var XJSTBeautifier=exports.XJSTBeautifier=objectThatDelegatesTo(OMeta,{
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
"var":function(){var $elf=this,_fromIdx=this.input.idx,name,val;return (function(){name=this._apply("anything");val=this._apply("trans");return ((("var " + name) + "=") + val)}).call(this)},
"throw":function(){var $elf=this,_fromIdx=this.input.idx,x;return (function(){x=this._apply("trans");return ("throw " + x)}).call(this)},
"try":function(){var $elf=this,_fromIdx=this.input.idx,x,name,c,f;return (function(){x=this._apply("curlyTrans");name=this._apply("anything");c=this._apply("curlyTrans");f=this._apply("curlyTrans");return ((((((("try " + x) + "catch(") + name) + ")") + c) + "finally") + f)}).call(this)},
"json":function(){var $elf=this,_fromIdx=this.input.idx,props;return (function(){props=this._many((function(){return this._apply("trans")}));return (("{ " + props.join(", ")) + " }")}).call(this)},
"binding":function(){var $elf=this,_fromIdx=this.input.idx,n2,name,val;return (function(){name=this._or((function(){return this._apply("nameString")}),(function(){return (function(){n2=this._apply("anything");return n2.toProgramString()}).call(this)}));val=this._apply("trans");return ((name + ": ") + val)}).call(this)},
"switch":function(){var $elf=this,_fromIdx=this.input.idx,x,cases;return (function(){x=this._apply("trans");cases=this._many((function(){return this._apply("trans")}));return (((("switch(" + x) + "){") + cases.join(";")) + "}")}).call(this)},
"case":function(){var $elf=this,_fromIdx=this.input.idx,x,y;return (function(){x=this._apply("trans");y=this._apply("trans");return ((("case " + x) + ": ") + y)}).call(this)},
"default":function(){var $elf=this,_fromIdx=this.input.idx,y;return (function(){y=this._apply("trans");return ("default: " + y)}).call(this)},
"subMatch":function(){var $elf=this,_fromIdx=this.input.idx,id,m,id,e,c;return this._or((function(){return (function(){this._form((function(){return (function(){id=this._apply("anything");m=this._apply("trans");return this._form((function(){return (function(){this._applyWithArgs("exactly","get");return this._applyWithArgs("exactly","true")}).call(this)}))}).call(this)}));return m}).call(this)}),(function(){return (function(){this._form((function(){return (function(){id=this._apply("anything");e=this._apply("trans");return c=this._apply("trans")}).call(this)}));return ((e + " == ") + c)}).call(this)}))},
"tMatch":function(){var $elf=this,_fromIdx=this.input.idx,m,ms;return this._or((function(){return (function(){this._form((function(){return m=this._apply("subMatch")}));return m}).call(this)}),(function(){return (function(){this._form((function(){return ms=this._many1((function(){return this._apply("subMatch")}))}));return ms.join(", ")}).call(this)}))},
"tBody":function(){var $elf=this,_fromIdx=this.input.idx,e,es;return this._or((function(){return (function(){this._form((function(){return e=this._apply("trans")}));return ("\n    " + e)}).call(this)}),(function(){return (function(){this._form((function(){return es=this._many1((function(){return this._apply("trans")}))}));return ((" (\n    " + es.join(",\n    ")) + " )")}).call(this)}))},
"template":function(){var $elf=this,_fromIdx=this.input.idx,m,b;return (function(){this._form((function(){return (function(){m=this._apply("tMatch");return b=this._apply("tBody")}).call(this)}));return (m + b)}).call(this)},
"topLevel":function(){var $elf=this,_fromIdx=this.input.idx,ts;return (function(){ts=this._many1((function(){return this._apply("template")}));return ts.join("\n\n")}).call(this)}});var XJSTCompiler=exports.XJSTCompiler=objectThatDelegatesTo(BSJSTranslator,{
"subMatch":function(){var $elf=this,_fromIdx=this.input.idx,id,m,id,e,c;return this._or((function(){return (function(){this._form((function(){return (function(){id=this._apply("anything");m=this._apply("trans");return this._form((function(){return (function(){this._applyWithArgs("exactly","get");return this._applyWithArgs("exactly","true")}).call(this)}))}).call(this)}));return m}).call(this)}),(function(){return (function(){this._form((function(){return (function(){id=this._apply("anything");e=this._apply("trans");return c=this._apply("trans")}).call(this)}));return ((e + " == ") + c)}).call(this)}))},
"tMatch":function(){var $elf=this,_fromIdx=this.input.idx,m,ms;return this._or((function(){return (function(){this._form((function(){return m=this._apply("subMatch")}));return m}).call(this)}),(function(){return (function(){this._form((function(){return ms=this._many1((function(){return this._apply("subMatch")}))}));return ms.join(" && ")}).call(this)}))},
"tBody":function(){var $elf=this,_fromIdx=this.input.idx,e,es;return this._or((function(){return (function(){this._form((function(){return e=this._apply("trans")}));return e}).call(this)}),(function(){return (function(){this._form((function(){return es=this._many1((function(){return this._apply("trans")}))}));return ((" (\n        " + es.join(",\n        ")) + " )")}).call(this)}))},
"template":function(){var $elf=this,_fromIdx=this.input.idx,m,b;return (function(){this._form((function(){return (function(){m=this._apply("tMatch");return b=this._apply("tBody")}).call(this)}));return (((("    if(" + m) + ") return ") + b) + ";")}).call(this)},
"topLevel":function(){var $elf=this,_fromIdx=this.input.idx,ts;return (function(){ts=this._many1((function(){return this._apply("template")}));return (("(function(c){\n" + ts.join("\n")) + "\n})")}).call(this)},
"topLevel2":function(){var $elf=this,_fromIdx=this.input.idx,ts;return (function(){ts=this._apply("anything");return XJSTCompiler.matchAll(ts.reverse(),"topLevel2")}).call(this)}})}
