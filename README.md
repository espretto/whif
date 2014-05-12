
Promises A+
===========

this is a promises A+ implementation compliant with version 1.1 passing the [tests][2].
many thanks to this lib's originator Rhys Brett-Bowen and his great article on [Promises/A+ - understanding the spec through implementation][1].

[![browser support](https://ci.testling.com/espretto/promise.png)](https://ci.testling.com/espretto/promise)

[1]: http://modernjavascript.blogspot.de/2013/08/promisesa-understanding-by-doing.html
[2]: https://github.com/promises-aplus/promises-tests

usage
-----

pass a function to the constructor to receive the promise's `fulfill` and `reject` functions as arguments. this style is recommended because the methods are scoped.
```js
var promise = new Promise( function( fulfill, reject ){

  if( she.likes( him ) ){
    fulfill( she.number );
  } else {
    reject( she.random() );
  }
})
```
fulfill callbacks may return promises ( or any other A+ compliant thenables! ) which's state and `value`/`reason` will be adopted by the newly created one returned by `then`. the deferred api is available for convenience, usually `fulfill` and `reject` are not exposed by promises. however, calling `fulfill` or `reject` on a once fulfilled or rejected promise will have no effect. both `callback` and `errback` are optional arguments to `then`. their default behavior is to proxy the `value`/`reason` to the next promise.
```js
.then( function( number ){ // callback

  var call = new Promise();

  setTimeout( function hesitate(){
    var date = him.call( number );
    call.fulfill( date );
  }, him.random() );

  setTimeout( function wait(){
    call.reject( she.busy );
  }, she.patience );

  return call;
}) 
```
returning the inital `promise` will lead to an endless recursive chain of callbacks which is the right behaviour - following the spec. the errback here will receive its `reason` argument from either the rejection above or the `slap` exception rethrown within the callback i.e. he will go after her slap or her being busy.
```js
.then( function( date ){ // callback

  if( typeof date === 'undefined' )
    return promise;
  }

  try {
    date.kiss.call( him, she );
  } catch( slap ){
    throw slap;
  }
}, function( reason ){ // errback
  him.goAfter( reason );
});
```
another very usefull feature is to group promises to a single one which will only be resolved if every sub-promise is resolved and rejected as soon as one of them fails.
```js
var requirements = [
  // if is not thenable, a promise is created to be resolved with the value
  'non-thenable',
  // any A+ 1.1 compliant thenable, jQuery works in this case
  jQuery.get('http://url.to/some/resource.json'),
  // own promises
  new Promise( function( fulfill, reject ){
    var n = Math.random();
    if( n < 0.5 ) fulfill( 'lucky' );
    else reject( 'unlucky' );
  })
];

Promise.group( requirements ).then(
  function( values ){
    // in case every promise was resolved
    values[ 0 ]; // 'non-thenable'
    values[ 1 ]; // some json data
    values[ 2 ]; // 'lucky'
  },
  function( tuple ){
    // in case we're unlucky
    var reason = tuple[ 0 ]; // 'unlucky', reason
    var index  = tuple[ 1 ]; // 2  , index of the promise that was rejected
  }
);
```

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

### build
- generates the annotated source to the `./docs` folder
- uglifys source to `./dist/promise.min.js` for production environments ( ~1.8 kb )
- browserifys test bundle to `./test/promise.test.bundle.js`
```sh
$ grunt build
```
for convenience there is a ready-made gzip command to further compress the minified version to `./dist/promise.min.js.gz` ( ~0.8 kb )
```sh
$ npm run-script gzip
```

### run tests
in nodejs
```sh
$ npm test
```
in your browser ( requires _build_ )
```sh
$ python -m SimpleHTTPServer
```
then fire up your favorite browser and point it to [localhost:8000/test](http://localhost:8000/test) to run the tests or [localhost:8000/docs](localhost:8000/docs/src/promise.js.html) to read Promise's story - the annotated source.