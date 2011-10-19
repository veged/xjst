
all: lib

src: $(patsubst %.ometajs,%.ometajs.js,$(wildcard src/*.ometajs))

%.ometajs.js: %.ometajs
	ometajs2js -i $< -o $@

lib: lib/xjst.js

lib/xjst.js: src
	-rm $@
	for i in \
			xjst.js \
			xjst.ometajs.js \
		; do \
			cat $</$$i >> $@ \
		; done

tests: $(subst .xjst,,$(wildcard tests/*.xjst))

tests/%:
	node tests/tests.js tests/$*.xjst

benchmark:
	node tests/benchmark.js

.PHONY: all FORCE
