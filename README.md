     ___ ___    _____  _______  _______
    |   |   | _|     ||     __||_     _|
    |-     -||       ||__     |  |   |
    |___|___||_______||_______|  |___|

## What is XJST?

XJST is a performance oriented data matcher implemented for [node.js][1].
It's partially inspired by the XSLT and built on top of the [ometajs][2].

## Data Matcher?

Yes, match data recursively over a conditions' set to generate any output (see
[prefixer][6] for example).

XJST can be used as url router or as a template engine, more info below.

## Example

Input:

```javascript
template(this.elem === 'a') {
  return '<a href="' + this.href + '">' + this.text + '</a>';
}

template(this.elem === 'div') {
  return '<div>' + this.body + '</div>';
}

template(this.elem === 'div' && this.colour === 'blue') {
  return '<div class="blue">' + this.body + '</div>';
}
```

Output (simplified):

```javascript
switch (this.elem) {
  case 'div':
    switch (this.colour) {
      case 'blue':
        return '<div class="blue">' + this.body + '</div>';
      default:
        return '<div>' + this.body + '</div>';
    }
  case 'a':
    return '<a href="' + this.href + '">' + this.text + '</a>';
}
```

[More examples][5]

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

XJST extends javascript syntax with a following keywords: `template`, `local`,
`apply`.

### Template

```javascript
template(expression1 === value1 && ... && expressionN === valueN) {
  // will be run if condition above equals to true
}
```

Multiple `template` statements will be grouped to construct optimal conditions
graph. Order of the `template` statements matters, the priority decreases from
the bottom to the top.

### Local

```javascript
var x = 1;

console.log(local(x = 2) x); // 2
console.log(x); // 1
```

`local` allows you to make temporary changes to a visible variables scope. Every
assignment put inside parens will be reverted immediately after the expression
execution.

You can make multiple assignments in the one statement:

```javascript
local(this.x = 2, this.y = 3) ...
```

Or use `local` with a block:

```javascript
local(...) { var a = 1; return a * 2; }
```

Or as an expression:

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
temporary changes to it (all changes will be reverted back after operation).
`apply` keyword works exactly like a `local` (applying changes in the parens and
reverting them after the execution), but with small distinction - `apply`
doesn't have a body, so it's just doing some changes to the data and applying
template recursively (the context will be preserved).

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

XJST takes all the `template` statements and produces a tree with comparisons in
nodes and `template`'s bodies in leafs. `apply` are handled and replaced by
direct calls to the tree's nodes (some of comparisons can be skipped, using
known context's state).

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

Here is the [documented source][3].

Some technical details (in Russian) can be found in [doc/tech.ru.md][4].

#### Authors

* [Sergey Berezhnoy](https://github.com/veged),
* [Andrey Mischenko](https://github.com/druxa),
* [Fedor Indutny](https://github.com/indutny).

[1]: http://nodejs.org/
[2]: https://github.com/veged/ometa-js
[3]: http://veged.github.com/xjst/
[4]: https://github.com/veged/xjst/blob/master/doc/tech.ru.md
[5]: https://github.com/veged/xjst/tree/master/examples
[6]: https://github.com/veged/xjst/blob/master/examples/prefixer/source.xjst
