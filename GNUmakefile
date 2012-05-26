all:
	# nothing to do

clean:
	# nothing to do

test:
	nodeunit test/unit/*-test.js

benchmark: *
	bin/benchmark --details

docs:
	docco lib/xjst/*.js lib/xjst/engines/*.js

.PHONY: all test clean FORCE
