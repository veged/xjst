all: lib

lib: lib/xjst/ometa/xjst.ometajs
	ometajs2js -i lib/xjst/ometa/xjst.ometajs -o lib/xjst/ometa/xjst.js

clean:
	@-[ -f lib/xjst/ometa/xjst.js ] && rm lib/xjst/ometa/xjst.js

test:
	nodeunit test/unit/*-test.js

benchmark: *
	bin/benchmark --details

docs:
	docco lib/xjst/*.js lib/xjst/engines/*.js

.PHONY: all test clean FORCE
