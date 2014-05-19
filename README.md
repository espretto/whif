
whif
====

this is a [Promises A+][3] implementation compliant with version 1.1 passing the [tests][2].
many thanks to this lib's originator Rhys Brett-Bowen and his great article on [Promises/A+ - understanding the spec through implementation][1].

[![browser support](https://ci.testling.com/espretto/whif.png)](https://ci.testling.com/espretto/whif)

[1]: http://modernjavascript.blogspot.de/2013/08/promisesa-understanding-by-doing.html
[2]: https://github.com/promises-aplus/promises-tests
[3]: http://promises-aplus.github.io/promises-spec/

usage
-----

call `whif` as a constructor with the `new` operator or use it as a factory method to create a promise. pass in a function to receive the promise's `resolve` and `reject` functions as arguments. this style is recommended because the methods are scoped.
```js
var condition = whif( function( resolve, reject ){

  if( she.likes( him ) ){
    resolve( she.number );
  } else {
    reject( she.random() );
  }
}) // chained
```
success callbacks may return promises ( or any other A+ compliant thenables! ) which's internal state and `value`/`reason` will be adopted by the newly created one returned by `then`. the deferred api is exposed for convenience with both methods prefixed by an underscore to indicate privacy. however, calling `_resolve` or `_reject` on a once resolved or rejected promise will have no effect. both `callback` and `errback` are optional arguments to `then`. their default behavior is to proxy the `value`/`reason` from the previous to the next promise in the chain.
```js
.then( function( number ){ // callback

  var call = new whif();

  setTimeout( function hesitate(){
    var date = him.call( number );
    call._resolve( date );
  }, him.random() );

  setTimeout( function wait(){
    call._reject( she.busy );
  }, she.patience );

  return call;
}
// default errback passes rejection to the next promise in the chain
// , function( reason ){ throw reason }
) // chained
```
returning the inital `condition` will lead to an endless recursive chain of callbacks which is the right behaviour - following the spec. the _errback_ here will receive its `reason` argument from either the rejection above or the `rebuff` exception rethrown within the callback i.e. he will go after her being busy or the rebuff.
```js
.then( function( date ){ // callback

  if( typeof date === 'undefined' )
    return condition;
  }

  try {
    date.kiss.call( him, she );
  } catch( rebuff ){
    throw rebuff;
  }
}, function( reason ){ // errback
  him.goAfter( reason );
});
```
one rather special yet easy implemented feature is to not resolve promises asynchronously as requried by the spec. if synchronous resolution is an option at all, this will improve performance, especially on the server-side. [read more][4]
```js
var syncPromise = whif( function( resolve, reject ){
  resolve( 123 );
  console.log( 456 )
}, true ) // `sync` as 2nd argument
.then( function( number ){
  console.log( number );
}, null, false ) // `sync` as 3rd argument (  2nd arugment errback defaults )
```
the second argument passed to `whif` ( or thrid to `then` ) decides whether to resolve the returned promise synchronously or not ( defaults to false - asynchronously ). in the above example `123` would be logged first, followed by `456`. by default resolution is prolonged until the next runloop hence `123` would be logged last, preceded by `456`.
[read more][4].

[4]: http://thanpol.as/javascript/promises-a-performance-hits-you-should-be-aware-of

another very usefull feature is to group promises to a single one which will only be resolved if every sub-promise is resolved and rejected as soon as one of them fails.
```js
var requirements = [
  
  // if is not thenable, a promise is created to be resolved with the value
  'non-thenable',
  
  // any A+ 1.1 compliant thenable, jQuery works in this case
  jQuery.get('http://url.to/some/resource.json'),
  
  // own promises
  new whif( function( resolve, reject ){
    var n = Math.random();
    if( n < 0.5 ) resolve( 'lucky' );
    else reject( 'unlucky' );
  })
];

whif.group( requirements ).then(
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
- uglifys source to `./dist/whif.min.js` for production environments ( ~1.9 kb )
- browserifys test bundle to `./test/whif.test.bundle.js`
```sh
$ grunt build
```
for convenience there is a ready-made gzip command to further compress the minified version to `./dist/whif.min.js.gz` ( ~0.9 kb )
```sh
$ npm run-script gzip
```

### run tests
in nodejs
```sh
$ npm test
```
in your browser ( requires `grunt build` )
```sh
$ python -m SimpleHTTPServer
```
then fire up your favorite browser and point it to [localhost:8000/test](http://localhost:8000/test) to run the tests or [localhost:8000/docs](localhost:8000/docs/src/whif.js.html) to read Promise's story - the annotated source.