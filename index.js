(function($){
    function compileTemplates(templates) {
        function makeFunction(s) { return new Function('o', 'c', s)}
        var submatches = {}, submatchesCount = 0;
        $.each(templates, function(){
            this.body = makeFunction(this.body);
            $.each(this.match, function(i, m){
                if (!submatches.hasOwnProperty(m[0])) {
                    submatches[m[0]] = makeFunction(m[0]);
                    submatches[m[0]].id = submatchesCount++;
                }
                m[0] = submatches[m[0]];
                m.stat = {runs: 0, fails: 0};
            });
        });
        console.log('submatches', submatches);
        return templates;
    }

    function compareMatchStats(current, previous) {
        return (current.stat.fails / current.stat.runs) > (previous.stat.fails / previous.stat.runs);
    }

    // Функция поиска среди шаблонов
    function match(o, c, ts) {
        var res, t, i = ts.length - 1, cache = {};
        while (!res && (t = ts[i--])) { // итерируемся по шаблонам с конца, пока не найдём подошедший
            //console.log('t', i);
            var matched, m = t.match[0], j = 1;
            do { // итерируемся по подматчам, пока они все матчатся
                var mf = m[0];
                matched = ((cache[mf.id] || (cache[mf.id] = mf(o, c))) == m[1]);
                m.stat.runs++;
                //console.log('m', m);
                // если подматч не сматчился накапливаем и учитываем статистику
                if (!matched) {
                    m.stat.fails++;
                    //console.log('m.stat.fails', m.stat.fails);
                    if (j != 1) {
                        var prev = t.match[j - 2];
                        if (compareMatchStats(m, prev)) {
                            t.match[j - 2] = m;
                            t.match[j - 1] = prev;
                            //console.count('swap');
                        }
                    }
                }
            } while (matched && (m = t.match[j++]))
            //console.log('matched', matched);
            if (matched) res = t;
        }
        console.log('ti', i);
        return res;
    }

    console.time('compileTemplates');
    var ts = compileTemplates(templates1);
    console.timeEnd('compileTemplates');
    $.each(input1, function(i, ii){
            console.log('VVVV');
            console.time(i);
            console.log(ii, match(ii, {}, ts));
            console.timeEnd(i);
            console.log('^^^^');
        }
    );

    function applyForEach(o, c, ts) {
        function isSimple(o) {
            var t = typeof o;
            return t === 'string' || t === 'number' || t === 'boolean';
        }

        if (isSimple(o)) {
            return apply(o);
        } else if ($.isArray(o)) {
            var res = [];
            for (var i = 0, l = o.length; i < l; i++)
                res[res.length] = apply(o[i], c);
            return res.join('');
        } else {
            var res = [];
            for (var i in o) if (o.hasOwnProperty(i))
                res[res.length] = apply(o[i], c);
            return res.join('');
        }
    }

})(jQuery);
