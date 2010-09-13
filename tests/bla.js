var sys = require('sys'),
    fs = require('fs');

fs.readFile('tests/bla.xjst', 'utf8', function(err, input){
    if (err) throw err;
    console.log(input);
    try {
        var xjst = require('xjst'),
            result = xjst.XJSTParser.matchAll(
                input,
                'topLevel'
            );
        process.stdout.write('--- tree:\n' + JSON.stringify(result) + '\n\n');
        process.stdout.write(
            '--- string:\n' +
            xjst.XJSTBeautifier.matchAll(result, 'topLevel') +
            '\n\n');
        process.stdout.write(
            '--- compile:\n' +
            xjst.XJSTCompiler.matchAll(result.reverse(), 'topLevel') +
            '\n\n');
        process.stdout.write('--- compile2:\n' + (xjst.compile(result)) + '\n\n');
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
