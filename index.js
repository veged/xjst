(function($){
    function compileTemplates(templates) {
        console.log('templates.length', templates.length);
        function makeFunction(s) { return new Function('o', 'c', s)}
        var submatches = {}, submatchesCount = 0;
        $.each(templates, function(i){
            this.id = i;
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
        templates.bySubmatches = {};
        console.log('submatches', submatches);
        return templates;
    }


    function objectId(object) {
        var keys = [], id = [];
        $.each(object, function(k){ keys[keys.length] = k });
        $.each(keys.sort(), function() {
            var o = {};
            o[this] = object[this];
            id[id.length] = $.param(o);
        });
        return id.join('&');
    };

    // Функция накапливания и использования статистики неподошедших матчей.
    // Делаем так, чтобы чаще неподходящие матчи шли раньше,
    // чем раньше мы узнаем, что шаблон неподходит -- тем лучше.
    function updateSubmatchStat(t, m, j, matched) {
        function compareMatchStats(current, previous) {
            return (current.fails / current.runs) > (previous.fails / previous.runs);
        }

        m.stat.runs++;
        if (!matched) {
            m.stat.fails++;
            if (j != 1) {
                var prev = t.match[j - 2];
                if (compareMatchStats(m.stat, prev.stat)) {
                    t.match[j - 2] = m;
                    t.match[j - 1] = prev;
                }
            }
        }
    }

    // Функция фильтрации шаблонов по подматчу
    function filterTemplatesBySubmatch(templates, id, value) {
        var res = [];
        $.each(templates, function(ii, template){
            var m, i = 0, hasSubmatch = false;
            while (!hasSubmatch && (m = this.match[i++])) {
                var eqId = m[0].id == id;
                hasSubmatch = hasSubmatch || eqId;
                // оставляем те шаблоны, у которых есть такой подматч
                // и он или равен текущему значению от объекта
                if (eqId && m[1] == value) res[res.length] = template;
            }
            // если такого подматча в шаблоне нет -- всегда оставляем
            if (!hasSubmatch) res[res.length] = template;
        });
        return res;
    }


    // Функция поиска среди шаблонов
    function match(o, c, templates) {
        var res, ts = templates, t, i = 1, submatches = {}, submatchesId;
        var viewTemplatesCount = 0; // DEBUG
        while (!res && (t = ts[ts.length - i])) { // итерируемся по шаблонам с конца, пока не найдём подошедший
            viewTemplatesCount++;
            var matched, m = t.match[0], j = 1;
            do { // итерируемся по подматчам, пока они все матчатся
                var id = m[0].id,
                    value = submatches[id] || (submatches[id] = m[0](o, c)); // запоминаем результаты подматчей
                matched = value == m[1];

                // на основании выполненных подматчей и неподошедших подматчей строим ключ,
                // по которому будем хранить отфильтрованные шаблоны
                var newSubmatchesId = objectId(submatches);

                // фильтруем шаблоны по подматчу
                if (ts.length > 1) ts = templates.bySubmatches[newSubmatchesId] ||
                    (templates.bySubmatches[newSubmatchesId] = filterTemplatesBySubmatch(ts, id, value));

                // накапливаем и используем статистику неподошедших матчей
                updateSubmatchStat(t, m, j, matched);

            } while (matched && (m = t.match[j++]));

            // если ключ для шаблонов не изменился, значит мы не сузили количество шаблонов
            // и надо начинать их перебирать
            if (submatchesId == newSubmatchesId) i++;
            submatchesId = newSubmatchesId;

            if (matched) res = t;
        }
        console.log('viewTemplatesCount', viewTemplatesCount, 'from total', templates.length);
        return res;
    }

    console.time('compileTemplates');
    var ts = compileTemplates(templates1);
    console.timeEnd('compileTemplates');
    $.each(input1, function(i, ii){
            console.time('time for input #' + i);
            console.log('input #', i, ii, 'template', match(ii, {}, ts));
            console.timeEnd('time for input #' + i);
            console.log('  ');
        }
    );
    console.log('templates.bySubmatches', ts.bySubmatches);

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
