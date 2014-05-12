
Promises A+
===========

this is a promises A+ implementation compliant with version 1.1 passing the [tests][2].
many thanks to this lib's originator Rhys Brett-Bowen and his great article on [Promises/A+ - understanding the spec through implementation][1].

[![browser support](https://ci.testling.com/espretto/promise.png)](https://ci.testling.com/espretto/promise)

[1]: http://modernjavascript.blogspot.de/2013/08/promisesa-understanding-by-doing.html
[2]: https://github.com/promises-aplus/promises-tests

tests & docs
------------

### prerequisites
- python pygments for generating the annotated source
- grunt-cli for use of grunt build commands

### setup
```
$ git clone <this-repo> <target-folder>
$ cd path/to/<target-folder>
$ npm install
```

### build
- generates the annotated source to the `./docs` folder
- uglifys source to `./dist/promise.min.js` for production environments ( ~1.8 kb )
- browserifys test bundle to `./test/promise.test.bundle.js`
- the latter command further compresses the uglified output ( ~0.8 kb )
```
$ grunt build
$ npm run-script gzip
```

### run tests
in nodejs
```
$ npm test
```
in your browser
```
$ python -m SimpleHTTPServer
```
then fire up your favorite browser and point it to [localhost:8000/test](http://localhost:8000/test) to run the tests or [localhost:8000/docs](localhost:8000/docs/src/promise.js.html) to read Promise's story - the annotated source