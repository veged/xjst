
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

tests: FORCE
	#node $@/tests.js $@/bla.xjst
	node $@/tests.js $@/menu.xjst

.PHONY: all FORCE
