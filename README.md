
whif
====

this is a [Promises A+][3] implementation compliant with version 1.1 passing the [tests][2].
many thanks to this lib's originator Rhys Brett-Bowen and his great article on [Promises/A+ - understanding the spec through implementation][1].

[1]: http://modernjavascript.blogspot.de/2013/08/promisesa-understanding-by-doing.html
[2]: https://github.com/promises-aplus/promises-tests
[3]: http://promises-aplus.github.io/promises-spec/

quick reference
---------------

signature | description
--- | ---
`[new] whif([init])` | constructor/factory with optional `init = function(res, rej){/*...*/}`
`whif.resolve(value)` | perform the resolve procedure on `value`
`whif.reject(reason)` | wrap `reason` in a rejected promise
`whif.join(thenables)` | returns promise that resolves when all child promises resolve or proxies the earliest rejection.
`whif.nextTick(callback)` | shim for `process.nextTick`
`promise._resolve(value)` | resolve a yet pending deferred
`promise._reject(value)` | reject a yet pending deferred
`promise.then(res, rej)` | returns the succeeding promise
`promise.fail(rej)` | `promise.then(id, rej)`
`promise.sync()` | make promise's resolution synchronous

usage
-----

use `whif` as a factory method or prepend the `new` operator and pass
a function to it for scoped behaviour shut off from the surrounding code.
```js
var promise = whif(function(resolve, reject){
  if(condition) resolve(value);
  else reject(reason);
})
```
the above's equivalent using whif's _private_ deferred api:
```js
var promise = (function(){
  var deferred = whif();
  if(condition) deferred._resolve(value);
  else deferred._reject(reason);
  return deferred;
}())
```
the usual suspect (chained to the above)
```js
.then(function(value){
  // success
}, function(reason){
  // failure
});
```
convenience shortcuts
```js
promise.fail(function(reason){/*...*/});
var resolvedPromise = whif.resolve(value); // not necessarily fulfilled!
var rejectedPromise = whif.reject(reason);
```
grouping promises/concurrent processes
```js
whif.join([p, q, true])
  .then(function(values){
    var p_value = values[0];
    var q_value = values[1];
    var boolean = values[2];
    throw new Error();
  })
  .fail(function(reason){
    // handler for whichever was rejected first,
    // not necessarily the error thrown above!
  });
```
whif ships with a [shim for cross-platform/-browser `process.nextTick`](https://gist.github.com/espretto/ec79d6d0fc7a898b92b1) which falls back to (vendor specific) `requestAnimationFrame`, `setImmediate` or `setTimeout`. 
```js
whif.nextTick(function(){
  // executed in the next run-loop-cycle
});
```
promises usually resolve/reject their successors asynchronously to ensure consistent behaviour/order of execution since code wrapped in promises may or may not involve asynchronous actions.
```js
var promise = whif.resolve('foo');
promise.then(console.log);
console.log('bar');
```
the above logs `bar` first and then `foo` because the then-handler is wrapped by `process.nextTick` internally. however, if a promise wraps an asynchronous action anyway it's actually not necessary to defer the resolution until the _next tick_ and thereby twice. for this and other edge cases you may call whif's `sync` method on the promise before you bind successors.
```js
var promise = whif
  .resolve($.ajax(request_settings))
  .sync()
  .then( /* ... */ )
  .fail( /* ... */ );
```
be careful with this option since success may be yielded asynchronously but failure synchronously depending on your implementation. remember that promises were normalized by prolonging the resolution because of these potential differences in the first place.

tests & docs
------------

### prerequisites
- python pygments for generating the annotated source
- grunt-cli for use of grunt build commands
- gzip for further compression of minified version

### setup
```sh
$ git clone <this-repo> <target-folder>
$ cd path/to/<target-folder>
$ npm install
```

### generate docs
generates the annotated source to the `./docs` folder
```sh
$ grunt docs
```

### build
jshint checks, uglifys source to `./dist/whif.min.js` for production environments (~2.4 kb) and browserifys test bundle to `./test/whif.test.bundle.js`
```sh
$ grunt
```
for convenience there is a ready-made gzip command to further compress the minified version to `./dist/whif.min.js.gz` (~1.1 kb)
```sh
$ npm run-script gzip
```

### run tests
in nodejs
```sh
$ npm test
```
in your browser (requires `grunt build`)
```sh
$ python -m SimpleHTTPServer
```
then fire up your favorite browser and point it to [localhost:8000/test](http://localhost:8000/test) to run the tests or [localhost:8000/docs](http://localhost:8000/docs/src/whif.js.html) to read whif's story - the annotated source.

licence
-------
[MIT](http://mariusrunge.com/mit-licence.html)