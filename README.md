
Promises A+
===========

this is a promises A+ implementation compliant with version 1.1 passing the [tests][2].
many thanks to this lib's originator Rhys Brett-Bowen's and his great article on [Promises/A+ - understanding the spec through implementation][1].

[![browser support](https://ci.testling.com/espretto/promise.png)](https://ci.testling.com/espretto/promise)

[1]: http://modernjavascript.blogspot.de/2013/08/promisesa-understanding-by-doing.html
[2]: https://github.com/promises-aplus/promises-tests

tests & docs
------------

to generate the annotated source, clone this repo and issue the following from its root directory.
this assumes you have python's _pygments_ and _grunt-cli_ installed globally.
```
$ npm install
$ grunt docker
```
to generate the browser test script issue
```
$ node_modules/.bin/browserify test/promise.test.js -o test/promise.test.bundle.js
```
at last start a simple server, fire up your favorite browser and point it to `localhost:8000/docs/src/promise.js.html` and `localhost:8000/test` respectively.
```
$ python -m SimpleHTTPServer
```
to run the tests on _nodejs_ issue
```
$ npm test
```