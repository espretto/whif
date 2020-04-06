
# whif [![Build Status](https://travis-ci.org/espretto/whif.svg?branch=master)](https://travis-ci.org/espretto/whif)

whif is a [Promises A+][3] implementation compliant with version 1.1 passing the [tests][2]. many thanks to this lib's originator Rhys Brett-Bowen and his great article on [Promises/A+ - understanding the spec through implementation][1].

[1]: http://modernjavascript.blogspot.de/2013/08/promisesa-understanding-by-doing.html
[2]: https://github.com/promises-aplus/promises-tests
[3]: http://promises-aplus.github.io/promises-spec/

## Table of Contents
<!-- MarkdownTOC -->

- [Usage](#usage)
- [Extras](#extras)
- [Testing](#testing)
- [Building](#building)
- [API reference](#api-reference)
  - [`[new] whif` \(global\)](#new-whif-global)
  - [`whif#then` \(instance\)](#whifthen-instance)
  - [`whif#fail` \(instance\)](#whiffail-instance)
  - [`whif#sync` \(instance\)](#whifsync-instance)
  - [`whif.resolve` \(static\)](#whifresolve-static)
  - [`whif.reject` \(static\)](#whifreject-static)
  - [`whif.nextTick` \(static\)](#whifnexttick-static)
  - [`whif.join` \(static\)](#whifjoin-static)

<!-- /MarkdownTOC -->

<a id="usage"></a>
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

<a id="extras"></a>
## Extras
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

<a id="testing"></a>
## Testing
whif is tested against the [A+ testsuite](https://github.com/promises-aplus/promises-tests) which you can execute with `npm test`. In addition you may run the tests in the browser. First launch `npm run testling`, then open the url shown in the commandline http://localhost:8000/__testling?show=true.

<a id="building"></a>
## Building
whif targets older environnements by using the [UMD](https://github.com/umdjs/umd) pattern. Use `npm run build` to generate the bundle `./dist/whif.js`. Both the global export as well as the AMD module are named `whif`.

<a id="api-reference"></a>
## API reference
<a id="new-whif-global"></a>
##### `[new] whif` (global)
promise class

- `init: function` - factory to construct/fetch the future value,
  will be called with callbacks (resolve, reject) to fulfill or reject
  the promise being constructed


<a id="whifthen-instance"></a>
##### `whif#then` (instance)
register callbacks to access future values

- `resolve: function` - called on fulfillment
- `reject: function` - called on rejection
- `<return>: whif` - successor promise


<a id="whiffail-instance"></a>
##### `whif#fail` (instance)
register a rejection callback, this is equivalent to `.then(null, cb)`

- `reject: function` - called on rejection
- `<return>: whif` - successor promise


<a id="whifsync-instance"></a>
##### `whif#sync` (instance)
marks this promise as synchronous. all registered callbacks will be called
synchronously. this deviates from the spec but allows for a minor speedup
by avoiding duplicate runloop cycles.

- `<return>: whif` - the instance itself


<a id="whifresolve-static"></a>
##### `whif.resolve` (static)
factory to fulfill a promise

- `value: *` - the value to wrap in the promise
- `<return>: whif` - the promise wrapping the input value


<a id="whifreject-static"></a>
##### `whif.reject` (static)
factory to reject a promise

- `reason: *` - the reason why the promise was rejected
- `<return>: whif` - the promise rejected for the given reason


<a id="whifnexttick-static"></a>
##### `whif.nextTick` (static)
schedule a function to be executed on the next runloop cycle

- `fn: function` - the function to execute on the next runloop cycle


<a id="whifjoin-static"></a>
##### `whif.join` (static)
group multiple promises and either resolve when all of them have them been
fulfilled or reject upon the first rejection, not waiting for the others.

- `promises: Array.<whif>` - promises to group
- `<return>: whif` - group promise, resolve handlers are called with an array
  of future values


