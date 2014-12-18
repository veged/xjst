     ___ ___    _____  _______  _______
    |   |   | _|     ||     __||_     _|
    |-     -||       ||__     |  |   |
    |___|___||_______||_______|  |___|

## Extensible JavaScript Transformations [![Build Status](https://secure.travis-ci.org/veged/xjst.png)](http://travis-ci.org/veged/xjst)

XJST is a DSL for universal data transformations with compiler written on top of
the [Node.js][1] and [Ometa/JS][2] and output code working in any browser or on
server-side.

## Data transformations?

Yes, traverse any data in specific flow using matching against conditions set
to generate any output (see [binary tree prefixer][6]).

For example, XJST can be used as:

* HTTP request router
* template engine
* AST transformator
* parser

## Extensible

XJST makes possible to extend your previous transformation by overriding or
specializing some of it's parts (example below is extending
`this.url === '/login'` condition with redirection for logged in users).

XJST is a superset of JavaScript so you can use any popular libraries (that is
jquery or underscore) within your transformation and write condition bodies in
JavaScript.

Creating your own DSL based on XJST is also possible, because it's syntax parser
is powered by [ometajs][2].

## Basic example

Input:

```javascript
template(this.url === '/')(function() {
  return render('home page')
});

template(this.url === '/login')(function() {
  return render('login form')
});

template(this.url === '/login', this.cookie.is_logined)(function() {
  return redirect('user page')
});
```

Output (simplified):

```javascript
switch (this.url) {
  case '/login':
    switch (this.cookie.is_logined) {
      case true:
        return redirect('user page')
      default:
        return render('login form')
    }
  case '/':
    return render('home page')
}
```

[More examples][5]

## Installation

```bash
npm install xjst
```

## Public API

```javascript
var xjst = require('xjst'),

    fn = xjst.compile('template string', 'filename.xjst', options);

fn({ your: 'data' });
```

## Syntax

XJST extends JavaScript syntax with a following keywords: `template`, `local`,
`apply`, `applyNext`.

### Template

```javascript
template(expression1 === value1, ... , expressionN === valueN)(function() {
  // will be run if condition above equals to true
})
```

Multiple `template` statements will be grouped to construct optimal conditions
graph. Order of the `template` statements matters, the priority decreases from
the bottom to the top.

There're few restrictions for templates:

*   Expressions in template predicate should have no side-effects
    (that is should not change transformation context).

*   It's preferred to use function calls or equality comparisons joined by
    logical `&&` operator for expressions, as it can be better optimized at
    compilation time.

### Local

```javascript
var obj = { x: 1 };

console.log(local(obj)({ x: 2 })(obj.x)); // 2
console.log(obj.x); // 1
```

`local` allows you to make temporary changes to a visible variables scope. Every
assignment put inside parens will be reverted immediately after the expression
execution.

You can make multiple assignments in the one statement:

```javascript
local({ x: 2, y: 3 })(/* your code */)
```

Or use `local` with a block:

```javascript
local({ ... })(function() { var a = 1; return a * 2; });
```

Or as an expression:

```javascript
var newX = local(this)({ x: 2 })(this.x);
```

### Apply

```javascript
template(true)(function() {
  return apply({ type: 'first' });
});

template(this.type === 'first')(function() {
  return apply({ type: 'second' });
});

template(this.type === 'second')(function() {
  return 'here am I';
});
```

XJST is intended to be applied recursively to the same data, while making small
temporary changes to it (all changes will be reverted back after operation).
`apply` keyword works exactly like a `local` (applying changes in the parens and
reverting them after the execution), but with small distinction - `apply`
doesn't have a body, so it's just doing some changes to the data and applying
template recursively (the context will be preserved).

### Apply next

```javascript
template(this.page === 'home' && this.action === 'login')(function() {
  // match here
});

template(this.page === 'home')(function() {
  applyNext();
});
```

`applyNext()` call will reapply all templates, except one where it was called,
to the inputs data.

## CLI interface

```bash
$ bin/xjst --help

Usage:
  xjst [OPTIONS] [ARGS]


Options:
  -h, --help : Help
  -i INPUT, --input=INPUT : Input file (default: stdin)
  -o OUTPUT, --output=OUTPUT : Output file (default: stdout)

$ bin/xjst -i template.xjst

.... some code ...
```

## Optimizations

![Optimized graph][7]

XJST takes all the `template` statements and produces a tree with comparisons in
nodes and `template` bodies in leafs. `apply` are handled and replaced by
direct calls to the tree nodes (some of comparisons can be skipped, using
known context state).

Input:

```javascript
template(this.type === 'a')(function() {
  // body 1
});
template(this.type === 'b')(function() {
  // body 2
});
```

Output (simplified):

```javascript
switch (this.type) {
  case 'a':
    // body 1
    break;
  case 'b':
    // body 2
    break;
}
```

## Documentation

Here is the [documented source][3].

Some technical details (in Russian) can be found in [doc/tech.ru.md][4].

#### Contributors

* [Sergey Berezhnoy](https://github.com/veged)
* [Andrey Mischenko](https://github.com/druxa)
* [Fedor Indutny](https://github.com/indutny)

[1]: http://nodejs.org/
[2]: https://github.com/veged/ometa-js
[3]: http://veged.github.com/xjst/
[4]: https://github.com/veged/xjst/blob/master/doc/tech.ru.md
[5]: https://github.com/veged/xjst/tree/master/examples
[6]: https://github.com/veged/xjst/blob/master/examples/prefixer/source.xjst
[7]: https://github.com/veged/xjst/raw/master/graph.jpg "Optimized graph"


<!-- Yandex.Metrika counter -->
<img src="//mc.yandex.ru/watch/12831025" style="position:absolute; left:-9999px;" alt="" />
<!-- /Yandex.Metrika counter -->
