
# whif
whif is a [Promises A+][3] implementation compliant with version 1.1 passing the [tests][2]. many thanks to this lib's originator Rhys Brett-Bowen and his great article on [Promises/A+ - understanding the spec through implementation][1].

[1]: http://modernjavascript.blogspot.de/2013/08/promisesa-understanding-by-doing.html
[2]: https://github.com/promises-aplus/promises-tests
[3]: http://promises-aplus.github.io/promises-spec/

## API reference
signature | description
--- | ---
`new whif([init])` | constructor/factory with optional `init = function(res, rej){/*...*/}`
`whif.resolve(value)` | perform the resolve procedure on `value`
`whif.reject(reason)` | wrap `reason` in a rejected promise
`whif.join(thenables)` | returns promise that resolves when all child promises resolve or proxies the earliest rejection.
`whif.nextTick(callback)` | shim for `process.nextTick`
`promise.then(resolve, reject)` | returns the succeeding promise
`promise.fail(rej)` | same as `promise.then(id, rej)`
`promise.sync()` | make promise's resolution synchronous

## Usage

basic usage
```js
var promise = new whif(function(resolve, reject) {
  if (condition) resolve(value)
  else reject(reason)
})

promise.then(
  function (value) { /* success */ },
  function (reason) { /* failure */ }
)
```

convenience shortcuts
```js
var resolvedPromise = whif.resolve(value); // not necessarily fulfilled!
var rejectedPromise = whif.reject(reason);
```

grouping concurrent processes
```js
whif.join([p, q, true])
  .then(function (values) {
    var p_value = values[0];
    var q_value = values[1];
    var boolean = values[2];
    throw new Error();
  })
  .fail(function (reason) {
    // handler for whichever was rejected first,
    // not necessarily the error thrown above!
  });
```

whif ships with a [shim for cross-platform/-browser `process.nextTick`](https://gist.github.com/espretto/ec79d6d0fc7a898b92b1) 
```js
whif.nextTick(function () {
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
  .sync().then( /* ... */ )
  .sync().fail( /* ... */ );
```
be careful with this option since success may be yielded asynchronously but failure synchronously depending on your implementation. remember that promises were normalized by prolonging the resolution because of these potential differences in the first place.

## Testing
whif is tested against the [A+ testsuite](https://github.com/promises-aplus/promises-tests) which you can execute with `npm test`. In addition you may run the tests in the browser. First launch `npm run testling`, then open the url shown in the commandline http://localhost:8000/__testling?show=true.

## Building
whif targets older environnements by using the [UMD](https://github.com/umdjs/umd) pattern. Use `npm run build` to generate the bundle `./dist/whif.js`. Both the global export as well as the AMD module are named `whif`.