(function(exports) {
    var __r0, __r1, __r3, __r4, __r6, __r7, __r9, __r10;
    exports.apply = apply;
    function apply() {
        var __this = this;
        var __t = this["node"];
        if (__t === "right") {
            return [ "right", ("", __r9 = __this["node"], __this["node"] = null, __r10 = __this["tree"], __this["tree"] = this["tree"], __r11 = apply.call(__this), __this["node"] = __r9, __this["tree"] = __r10, "", __r11) ];
            return;
        } else if (__t === "left") {
            return [ "left", ("", __r6 = __this["node"], __this["node"] = null, __r7 = __this["tree"], __this["tree"] = this["tree"], __r8 = apply.call(__this), __this["node"] = __r6, __this["tree"] = __r7, "", __r8) ];
            return;
        } else {
            if (!Array.isArray(this["tree"]) === false) {
                return [ ("", __r0 = __this["node"], __this["node"] = "left", __r1 = __this["tree"], __this["tree"] = this["tree"][0], __r2 = apply.call(__this), __this["node"] = __r0, __this["tree"] = __r1, "", __r2), ("", __r3 = __this["node"], __this["node"] = "right", __r4 = __this["tree"], __this["tree"] = this["tree"][1], __r5 = apply.call(__this), __this["node"] = __r3, __this["tree"] = __r4, "", __r5) ];
                return;
            } else {
                if (!true === false) {
                    return this["tree"];
                    return;
                } else {
                    return $e.call(this, []);
                }
            }
        }
    }
    function $e() {
        throw new Error;
        return;
    }
    return exports;
})(typeof exports === "undefined" ? {} : exports);