all: lib

lib: lib/xjst/ometa/xjst.ometajs
	ometajs2js -i lib/xjst/ometa/xjst.ometajs -o lib/xjst/ometa/xjst.js

clean:
	@-[ -f lib/xjst/ometa/xjst.js ] && rm lib/xjst/ometa/xjst.js

test:
	# Note that --ignore-leaks is a temporary flag and should be removed in future
	mocha --ignore-leaks --slow 600 --ui tdd --growl \
		--reporter spec test/unit/*-test.js

benchmark: *
	bin/benchmark --details

docs:
	docco lib/xjst/*.js lib/xjst/engines/*.js lib/xjst/helpers/*.js \
		lib/xjst/transforms/*.js

.PHONY: all test clean FORCE
