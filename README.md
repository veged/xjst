     ___ ___    _____  _______  _______
    |   |   | _|     ||     __||_     _|
    |-     -||       ||__     |  |   |
    |___|___||_______||_______|  |___|

## What is XJST?

XJST is a performance oriented template engine implemented for [node.js][1].
It's partially inspired by XSLT and built on [ometajs][2].

## Installation

```bash
npm install xjst
```

## Public API

```javascript
var xjst = require('xjst');

var fn = xjst.compile('template string', 'filename.xjst', options);

fn({ your: 'data' });
```

## Syntax

XJST extends javascript syntax with following keywords: `template`, `local`,
`apply`.

### Template

```javascript
template(expression1 === value1 && ... && expressionN === valueN) {
  // will be run if condition above equals to true
}
```

Multiple `template` statements will be grouped to construct optimal conditions
graph. Order of `template` statements matters, priority decreases from bottom to
top.

### Local

```javascript
var x = 1;

console.log(local(x = 2) x); // 2
console.log(x); // 1
```

`local` allow you to make temporary changes to visible variable scope. Every
assignment put inside parens will be reverted immediately after expression
execution.

You can make multiple assignments:

```javascript
local(this.x = 2, this.y = 3) ...
```

Use `local` with block:

```javascript
local(...) { var a = 1; return a * 2; }
```

Or as expression:

```javascript
var newX = local(x = 2) x;
```

### Apply

```javascript
template(true) {
  return apply(this.type = 'first');
}

template(this.type === 'first') {
  return apply({ type: 'second' });
}

template(this.type === 'second') {
  return 'here am I';
}
```

XJST is intended to be applied recursively to the same data, while making small
reversible changes to it. `apply` keyword works exactly like local (applying
changes in parens and reverting them after execution), but with small
distinction - `apply` statement doesn't have a body, so it's just doing some
changes to date and applying template to changed data (context will be
preserved).

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

XJST takes all `template` statements and produces a tree with comparisons in
nodes and `template`'s bodies in leafs. `apply` are handled and replaced by
direct calls to tree's nodes (some of comparisons can be skipped, using
context's state).

Input:

```javascript
template(this.type === 'a') {
  // body 1
}
template(this.type === 'b') {
  // body 2
}
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

Documented source is available [here][3]

Some technical details (in Russian) can be found in [doc/tech.ru.md](https://github.com/veged/xjst/blob/master/doc/tech.ru.md).

#### Authors

* [Sergey Berezhnoy](https://github.com/veged),
* [Andrey Mischenko](https://github.com/druxa),
* [Fedor Indutny](https://github.com/indutny).

[1]: http://nodejs.org/
[2]: https://github.com/veged/ometa-js
[3]: http://veged.github.com/xjst/
