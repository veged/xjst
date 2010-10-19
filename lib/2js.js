exports.main = function() {

    var sys = require('sys'),
        fs = require('fs'),
        args = process.argv.slice(2),
        arg,
        options = {};

    while(args.length) {
        arg = args.shift();
        switch (arg) {
            case '-h':
            case '--help':
                sys.puts([
                    'Usage: xjst [options]',
                    '',
                    'Options:',
                    '  -i, --input : pecifies filename to read the input source, if omit use STDIN',
                    '  -o, --output : specifies filename to write the output, if omit use STDOUT',
                    '  -h, --help : Output help information'
                ].join('\n'));
                process.exit(1);
                break;
            case '-i':
            case '--input':
                options.input = args.shift();
                break;
            case '-o':
            case '--output':
                options.output = args.shift();
                break;
        }
    }

    (options.input ?
        // if input file
        function(inputFn) {
            fs.readFile(options.input, 'utf8', function(err, input){
                if (err) throw err;
                inputFn(input);
            });
        } :
        // if STDIN
        function(inputFn) {
            var input = '';
            process.openStdin()
                .on('data', function(s) { input += s })
                .on('end', function() { inputFn(input) });
        })(function(input){
            try {
                var xjst = require('xjst'),
                    error = function(m, i) {
                        throw { errorPos: i, toString: function(){ return "match failed" } }
                    },
                    result = xjst.compile(xjst.XJSTParser.matchAll(input, 'topLevel', undefined, error)) + '\n';
                options.output ?
                    fs.writeFile(options.output, result, function(err) {
                            if (err) throw err;
                            sys.error('  create : ' + options.output);
                        }) :
                    process.stdout.write(result);
            } catch (e) {
                e.errorPos != undefined &&
                    sys.error(
                        Array(30).join('-') + '\n' +
                        input.slice(0, e.errorPos) +
                        "\n--- Parse error ->" +
                        input.slice(e.errorPos) + '\n' +
                        Array(30).join('-'));
                sys.error(e);
                throw e
            }
        });

};
