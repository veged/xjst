var common = require('../fixtures/common'),
    fs = require('fs'),
    assert = require('assert');

exports['some bem template'] = function(test) {
  var c = {
    "block": "b-page",
    "title": "Pseudo link",
    "head": [
      { "elem": "css", "url": "example.css"},
      { "elem": "css", "url": "example.ie.css", "ie": "lt IE 8" },
      { "block": "i-jquery", "elem": "core" },
      { "elem": "js", "url": "example.js" }
    ],
    "content": [{
      "block": "b-link",
      "mods" : { "pseudo" : "yes", "togcolor" : "yes", "color": "green" },
      "url": "#",
      "target": "_blank",
      "title": "Click me",
      "content": "This pseudo link changes its color after click"
    }]
  };
  var expected = fs.readFileSync(__dirname + '/../templates/bem-bl.html')
                   .toString(),
      rendered = common.render('bem-bl').apply.call(c);

  assert.equal(rendered + '\n', expected);
  test.done();
};
