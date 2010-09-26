var sys = require('sys'),
    fs = require('fs');

fs.readFile(process.argv[2], 'utf8', function(err, input){
    if (err) throw err;
    console.log(input);
    try {
        var xjst = require('xjst'),
            result = xjst.XJSTParser.matchAll(
                input,
                'topLevel'
            );
        process.stdout.write('--- tree:\n' + JSON.stringify(result) + '\n\n');
        process.stdout.write('--- string:\n' + xjst.XJSTBeautifier.matchAll(result, 'topLevel') + '\n\n');

        var compileFn = xjst.XJSTCompiler.matchAll(result.reverse(), 'topLevel');
        process.stdout.write('--- compile:\n' + compileFn + '\n\n');
        compileFn = process.compile(compileFn, 'compile');

        var compileFn2 = xjst.compile(result.reverse());
        process.stdout.write('--- compile2:\n' + compileFn2 + '\n\n');
        compileFn2 = process.compile(compileFn2, 'compile2');

        process.stdout.write('\n-=-=-=-=-=-=-=-=-=-=-\n\n');
        fs.readFile(process.argv[2] + '.json', 'utf8', function(err, input){
            if (err) throw err;
            process.stdout.write(
                compileFn({
                    apply: compileFn,
                    name: 'page',
                    val: JSON.parse(input) }) +
                '\n\n');
        });

    } catch (e) {
        e.errorPos != undefined &&
            sys.error(
                input.slice(0, e.errorPos) +
                "\n--- Parse error ->" +
                input.slice(e.errorPos) + '\n');
        console.log('error: ' + e);
        throw e
    }
});
