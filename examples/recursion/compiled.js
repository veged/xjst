(function(exports) {
    var __r0, __r1;
    exports.apply = apply;
    function apply() {
        var __this = this;
        var __t = this["type"];
        if (__t === "item") {
            return "<li>" + this["ctx"]["value"] + "</li>";
            return;
        } else if (__t === "list") {
            var res = [ "<ul>" ];
            this["items"].forEach(function(item) {
                res.push(("", __r0 = __this["type"], __this["type"] = "item", __r1 = __this["ctx"], __this["ctx"] = item, __r2 = apply.call(__this), __this["type"] = __r0, __this["ctx"] = __r1, "", __r2));
            });
            res.push("</ul>");
            return res.join("");
            return;
        } else {
            return $e.call(this, []);
        }
    }
    function $e() {
        throw new Error;
        return;
    }
    return exports;
})(typeof exports === "undefined" ? {} : exports);