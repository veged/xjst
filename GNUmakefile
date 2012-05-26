all:
	# nothing to do

clean:
	# nothing to do

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
