
all: lib

lib: lib/xjst/ometa/xjst.ometajs
	ometajs2js -i lib/xjst/ometa/xjst.ometajs -o lib/xjst/ometa/xjst.js

tests: $(subst .xjst,,$(wildcard tests/*.xjst))

tests/%:
	node tests/tests.js tests/$*.xjst

benchmark:
	node tests/benchmark.js

.PHONY: all FORCE
