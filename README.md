
whif
====

this is a [Promises A+][3] implementation compliant with version 1.1 passing the [tests][2].
many thanks to this lib's originator Rhys Brett-Bowen and his great article on [Promises/A+ - understanding the spec through implementation][1].

[![browser support](https://ci.testling.com/espretto/whif.png)](https://ci.testling.com/espretto/whif)

[1]: http://modernjavascript.blogspot.de/2013/08/promisesa-understanding-by-doing.html
[2]: https://github.com/promises-aplus/promises-tests
[3]: http://promises-aplus.github.io/promises-spec/

quick reference
---------------

method | type | signature | description
--- | --- | --- | ---
whif | static | `whif(init)` | constructor/factory with optional `init`
resolve | static | `whif.resolve(value)` | wrap `value` in a resolved promise
_resolve | instance | `deferred._resolve(value)` | resolve a yet pending deferred
reject | static | `whif.reject(reason)` | wrap `reason` in a rejected promise
_reject | instance | `deferred._reject(value)` | reject a yet pending deferred
then | instance | `promise.then(res, rej)` | returns the succeeding promise
done | instance | `promise.done(res)` | `promise.then(res, cancel)`
catch | instance | `promise.catch(rej)` | `promise.then(id, rej)`
sync | instance | `promise.sync()` | make promise's resolution synchronous
nextTick | static | `whif.nextTick(callback)` | shim for `process.nextTick`
group | static | `whif.group(thenables)` | returns promise that resolves when all child promises resolve or proxies the earliest rejection.
_init_ | argument | `function(res, rej){..}`
_cancel_ | argument | `function(e){ throw e; }` | rethrow first argument
_id_ | argument | `function(v){ return v; }` | return first argument
_callback_ | argument | `function(){..}`| function to be deferred until the next run-loop
_thenables_ | argument | `[whif(..), $.ajax(..), 'pass-on']` | array of usually objects with a `then` method, primitives are simply passed on.

usage
-----

the `new` operator may be omitted
```js
var deferred = new whif();
```
private deferred api
```js
deferred._resolve(value);
deferred._reject(reason);
```
scoped handlers
```js
var promise = whif(function(resolve, reject){
  if(condition) resolve(value);
  else reject(reason);
})
```
the usual suspect (chained to the above)
```
.then(function(value){
  // success
}, function(reason){
  // failure
});
```
convenience shortcuts
```js
promise.done(function(value){ /* ... */ });
promise.catch(function(reason){ /* ... */ });
var resolvedPromise = whif.resolve(value);
var rejectedPromise = whif.reject(reason);
```
grouping promises/concurrent processes
```js
whif.group([p, q, true])
  .done(function(values){
    var p_value = values[0];
    var q_value = values[1];
    var boolean = values[2];
    throw new Error();
  })
  .catch(function(reason){
    // handler for whichever was rejected first,
    // not necessarily the error thrown above!
  });
```
whif ships with a [shim for cross-platform/-browser `process.nextTick`](https://gist.github.com/espretto/ec79d6d0fc7a898b92b1) which falls back to (vendor specific) `requestAnimationFrame`, `setImmediate` or `setTimeout`. 
```js
whif.nextTick(function(){
  // executed in the next run-loop
});
```
promises usually resolve/reject their successors asynchronously to ensure consistent behaviour/order of execution since code wrapped in promises may or may not involve asynchronous actions.
```js
var promise = whif.resolve('foo');
promise.done(console.log);
console.log('bar');
```
the above logs `bar` first and then `foo` because the done-handler is wrapped by `process.nextTick` internally. however, if a promise wraps an asynchronous action anyway it's actually not necessary to defer the resolution until the _next tick_ and thereby twice. for this and other edge cases you may call whif's `sync` method on the promise before you bind successors.
```js
var promise = whif
  .resolve($.ajax(request_settings))
  .sync()
  .done( /* ... */ )
  .catch( /* ... */ );
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
jshint checks, uglifys source to `./dist/whif.min.js` for production environments (~2.3 kb) and browserifys test bundle to `./test/whif.test.bundle.js`
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