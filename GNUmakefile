all:
	# nothing to do

clean:
	# nothing to do

test:
	npm test

benchmark: *
	bin/benchmark --details

docs:
	docco lib/xjst/*.js lib/xjst/engines/*.js lib/xjst/helpers/*.js \
		lib/xjst/transforms/*.js

.PHONY: all test clean FORCE
