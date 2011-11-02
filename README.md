# XJST

## What is XJST?

XJST is a performance oriented template engine implemented for [node.js](1).
It's partially inspired by XSLT and built on [ometajs](2).

## Installation

``bash
npm install xjst
``

## Public API

``javascript
var xjst = require('xjst');

var fn = xjst.compile('template string', 'filename.xjst', options);

fn({ your: 'data' });
``

## Syntax

XJST extends javascript syntax with following keywords: `template`, `local`,
`apply`.

### Template

``javascript
template(expression1 === value1 && ... && expressionN === valueN) {
  // will be run if condition above equals to true
}
``

Multiple `template` statements will be grouped to construct optimal conditions
graph. Order of `template` statements matters, priority decreases from bottom to
top.

### Local

``javascript
var x = 1;

console.log(local(x = 2) x); // 2
console.log(x); // 1
``

`local` allow you to make temporary changes to visible variable scope. Every
assignment put inside parens will be reverted immediately after expression
execution.

You can make multiple assignments:

``javascript
local(this.x = 2, this.y = 3) ...
``

Use `local` with block:

``javascript
local(...) { var a = 1; return a * 2; }
``

Or as expression:

``javascript
var newX = local(x = 2) x;
``

### Apply

``javascript
template(true) {
  return apply(this.type = 'first');
}

template(this.type === 'first') {
  return apply({ type: 'second' });
}

template(this.type === 'second') {
  return 'here am I';
}
``

XJST is intended to be applied recursively to the same data, while making small
reversible changes to it. `apply` keyword works exactly like local (applying
changes in parens and reverting them after execution), but with small
distinction - `apply` statement doesn't have a body, so it's just doing some
changes to date and applying template to changed data (context will be
preserved).

## Documentation

Some technical details (in Russian) can be found in [doc/tech.ru.md](https://github.com/veged/xjst/blob/master/doc/tech.ru.md).

[1] http://nodejs.org/
[2] https://github.com/veged/ometa-js
