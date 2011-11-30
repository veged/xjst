(function(exports) {
    exports.apply = apply;
    function apply() {
        var __this = this;
        var __t = this["elem"];
        if (__t === "div") {
            if (this["colour"] === "blue") {
                return '<div class="blue">' + this["body"] + "</div>";
                return;
            } else {
                return "<div>" + this["body"] + "</div>";
                return;
            }
        } else if (__t === "a") {
            return '<a href="' + this["href"] + '">' + this["text"] + "</a>";
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