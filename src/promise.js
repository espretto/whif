( function( root ) {

  // baseline setup
  // ==============

  var // one to var them all

  object, array = [],

    is = object = {},

    // promise states
    // --------------

    PENDING = -1,
    REJECTED = 0,
    FULFILLED = 1,

    // quick access to natives
    // -----------------------

    object_toString = object.toString,

    array_forEach = array.forEach || function( iterator ) {
      for ( var array = this, i = array.length; i--; iterator( array[ i ] ) );
    },

    next;

  // type checks
  // -----------
  // the inner module `is` holds type checks. this is an excerpt from
  // my [gist](https://gist.github.com/esnippo/9960508) inspired by the
  // [jQuery](http://jquery.com) and [underscore](http://underscorejs.org) libraries.
  // 
  // - provide quick access to precomputed `repr` within _Array#forEach_ closure
  // - early exit on "falsies"
  // - apply native implementations where available
  // - fix old webkit's bug where `typeof regex` yields `'function'` 

  array_forEach.call( [ 'Array', 'Function' ], function( klass ) {

    var repr = '[object ' + klass + ']';
    is[ klass ] = function( any ) {
      return any && object_toString.call( any ) === repr;
    };

  } );

  is.Array = Array.isArray || is.Array;

  if ( typeof regex === 'object' ) {
    is.Function = function( any ) {
      return any && typeof any === 'function';
    };
  }

  // Promise module
  // ==============

  function Promise( then ) {

    var that = this;

    that._state = PENDING;
    that._queue = [];

    if ( is.Function( then ) ) {
      then(
        function( value ) {
          Promise.prototype.fulfill.call( that, value );
        },
        function( reason ) {
          Promise.prototype.reject.call( that, reason );
        }
      );
    }
  };

  Promise.prototype = {

    then: function( onFulfilled, onRejected ) {

      var that = this,
        promise = new Promise();

      that._queue.push( {
        fulfill: is.Function( onFulfilled ) && onFulfilled,
        reject: is.Function( onRejected ) && onRejected,
        promise: promise
      } );

      that._run();

      return promise;
    },

    fulfill: function( value ) {
      resolve( this, value );
    },

    reject: function( reason ) {
      this._transition( REJECTED, reason );
    },

    _transition: function( state, value ) {

      // ### Promise States
      // A promise must be in one of three states: pending, fulfilled, or rejected.
      // 
      // 1. When pending, a promise:
      //    1. may transition to either the fulfilled or rejected state.
      // 1. When fulfilled, a promise:
      //    1. must not transition to any other state.
      //    1. must have a value, which must not change.
      // 1. When rejected, a promise:
      //    1. must not transition to any other state.
      //    1. must have a reason, which must not change.
      // 
      // Here, "must not change" means immutable identity (i.e. `===`),
      // but does not imply deep immutability.

      var that = this,
        _state = that._state;

      if (
        _state === state ||
        _state !== PENDING ||
        state !== FULFILLED && state !== REJECTED ||
        arguments.length < 2
      ) {
        return false;
      }

      that._state = state;
      that._value = value;
      that._run();
    },

    _run: function() {

      if ( this._state == PENDING ) return;

      var that = this

      setTimeout( function() {

        var queue = that._queue,
          object, value;

        while ( queue.length ) {
          object = queue.shift();
          try {
            // resolve returned promise based on return
            value = (
              that._state == FULFILLED ? ( object.fulfill || function( value ) {
                return value
              } ) : ( object.reject || function( exception ) {
                throw exception
              } )
            )( that._value );

            resolve( object.promise, value );

          } catch ( reason ) {
            // reject if an error is thrown
            object.promise._transition( REJECTED, reason );
          }
        }
      }, 0 );
    }
  };

  // ### The Promise Resolution Procedure

  // The __promise resolution procedure__ is an abstract operation
  // taking as input a promise and a value, which we denote as
  // `[[Resolve]](promise, x)`. If `x` is a thenable,
  // it attempts to make `promise` adopt the state of `x`,
  // under the assumption that `x` behaves at least somewhat like a promise.
  // Otherwise, it fulfills `promise` with the value `x`.
  // 
  // This treatment of thenables allows promise implementations to interoperate,
  // as long as they expose a Promises/A+-compliant `then` method.
  // It also allows Promises/A+ implementations to "assimilate" nonconformant
  // implementations with reasonable `then` methods.
  // 
  // To run `[[Resolve]](promise, x)`, perform the following steps:
  // 
  // 1. If `x` is a promise, adopt its state [[3.4](#notes)]:
  //    1. If `x` is pending, `promise` must remain pending until `x` is fulfilled or rejected.
  //    1. If/when `x` is fulfilled, fulfill `promise` with the same value.
  //    1. If/when `x` is rejected, reject `promise` with the same reason.
  // 1. Otherwise, if `x` is an object or function,
  //    1. Let `then` be `x.then`. [[3.5](#notes)]
  //    1. If retrieving the property `x.then` results in a thrown exception `e`, reject `promise` with `e` as the reason.
  //    1. If `then` is a function, call it with `x` as `this`, first argument `resolvePromise`, and second argument `rejectPromise`, where:
  //       1. If/when `resolvePromise` is called with a value `y`, run `[[Resolve]](promise, y)`.
  //       1. If/when `rejectPromise` is called with a reason `r`, reject `promise` with `r`.
  //       1. If both `resolvePromise` and `rejectPromise` are called, or multiple calls to the same argument are made, the first call takes precedence, and any further calls are ignored.
  //       1. If calling `then` throws an exception `e`,
  //          1. If `resolvePromise` or `rejectPromise` have been called, ignore it.
  //          1. Otherwise, reject `promise` with `e` as the reason.
  //    1. If `then` is not a function, fulfill `promise` with `x`.
  // 1. If `x` is not an object or function, fulfill `promise` with `x`.

  // If a promise is resolved with a thenable that participates in a circular thenable chain, such that the recursive nature of `[[Resolve]](promise, thenable)` eventually causes `[[Resolve]](promise, thenable)` to be called again, following the above algorithm will lead to infinite recursion. Implementations are encouraged, but not required, to detect such recursion and reject `promise` with an informative `TypeError` as the reason. [[3.6](#notes)]


  function resolve( promise, x ) {

    // 1. If `promise` and `x` refer to the same object,
    //    reject `promise` with a `TypeError` as the reason.
    if ( promise === x ) {
      promise._transition( REJECTED, new TypeError() );
    } else if ( ( typeof x == 'object' || typeof x == 'function' ) && x != null ) {
      var called = false;
      try {
        var then = x.then;
        if ( typeof then == 'function' ) {
          then.call( x, function( y ) {
            called || resolve( promise, y );
            called = true;
          }, function( r ) {
            called || promise._transition( REJECTED, r );
            called = true;
          } );
        } else {
          promise._transition( FULFILLED, x );
        }
      } catch ( e ) {
        called || promise._transition( REJECTED, e );
      }
    } else {
      promise._transition( FULFILLED, x );
    }
  };

  // export
  // ------

  if ( typeof module !== 'undefined' && module.exports ) {
    // nodejs support
    module.exports = Promise;
  } else if ( typeof define === 'function' && define.amd ) {
    // amd support
    define( function() {
      return Promise
    } );
  } else {
    // browser support
    root.Promise = Promise;

    /**
     * restores the previous value assigned to `window.Promise`
     * and returns the inner reference Promise holds to itself.
     * @function Promise.noConflict
     * @return {Promise}
     */
    var previous_Promise = root.Promise;
    Promise.noConflict = function() {
      root.Promise = previous_Promise;
      return Promise;
    }
  }
}( this ) )


// # Promises/A+

// **An open standard for sound, interoperable JavaScript promises&mdash;by implementers, for implementers.**

// A *promise* represents the eventual result of an asynchronous operation. The primary way of interacting with a promise is through its `then` method, which registers callbacks to receive either a promise's eventual value or the reason why the promise cannot be fulfilled.

// This specification details the behavior of the `then` method, providing an interoperable base which all Promises/A+ conformant promise implementations can be depended on to provide. As such, the specification should be considered very stable. Although the Promises/A+ organization may occasionally revise this specification with minor backward-compatible changes to address newly-discovered corner cases, we will integrate large or backward-incompatible only after careful consideration, discussion, and testing.

// Historically, Promises/A+ clarifies the behavioral clauses of the earlier [Promises/A proposal](http://wiki.commonjs.org/wiki/Promises/A), extending it to cover *de facto* behaviors and omitting parts that are underspecified or problematic.

// Finally, the core Promises/A+ specification does not deal with how to create, fulfill, or reject promises, choosing instead to focus on providing an interoperable `then` method. Future work in companion specifications may touch on these subjects.

// ## Terminology

// 1. "promise" is an object or function with a `then` method whose behavior conforms to this specification.
// 1. "thenable" is an object or function that defines a `then` method.
// 1. "value" is any legal JavaScript value (including `undefined`, a thenable, or a promise).
// 1. "exception" is a value that is thrown using the `throw` statement.
// 1. "reason" is a value that indicates why a promise was rejected.

// ## Requirements



// ### The `then` Method

// A promise must provide a `then` method to access its current or eventual value or reason.

// A promise's `then` method accepts two arguments:

// ```js
// promise.then(onFulfilled, onRejected)
// ```

// 1. Both `onFulfilled` and `onRejected` are optional arguments:
//     1. If `onFulfilled` is not a function, it must be ignored.
//     1. If `onRejected` is not a function, it must be ignored.
// 1. If `onFulfilled` is a function:
//     1. it must be called after `promise` is fulfilled, with `promise`'s value as its first argument.
//     1. it must not be called before `promise` is fulfilled.
//     1. it must not be called more than once.
// 1. If `onRejected` is a function,
//     1. it must be called after `promise` is rejected, with `promise`'s reason as its first argument.
//     1. it must not be called before `promise` is rejected.
//     1. it must not be called more than once.
// 1. `onFulfilled` or `onRejected` must not be called until the [execution context](http://es5.github.io/#x10.3) stack contains only platform code. [[3.1](#notes)].
// 1. `onFulfilled` and `onRejected` must be called as functions (i.e. with no `this` value). [[3.2](#notes)]
// 1. `then` may be called multiple times on the same promise.
//     1. If/when `promise` is fulfilled, all respective `onFulfilled` callbacks must execute in the order of their originating calls to `then`.
//     1. If/when `promise` is rejected, all respective `onRejected` callbacks must execute in the order of their originating calls to `then`.
// 1. `then` must return a promise [[3.3](#notes)].

//     ```js
//     promise2 = promise1.then(onFulfilled, onRejected);
//     ```

//     1. If either `onFulfilled` or `onRejected` returns a value `x`, run the Promise Resolution Procedure `[[Resolve]](promise2, x)`.
//     1. If either `onFulfilled` or `onRejected` throws an exception `e`, `promise2` must be rejected with `e` as the reason.
//     1. If `onFulfilled` is not a function and `promise1` is fulfilled, `promise2` must be fulfilled with the same value as `promise1`.
//     1. If `onRejected` is not a function and `promise1` is rejected, `promise2` must be rejected with the same reason as `promise1`.

// ## Notes

// 1. Here "platform code" means engine, environment, and promise implementation code. In practice, this requirement ensures that `onFulfilled` and `onRejected` execute asynchronously, after the event loop turn in which `then` is called, and with a fresh stack. This can be implemented with either a "macro-task" mechanism such as [`setTimeout`](http://www.whatwg.org/specs/web-apps/current-work/multipage/timers.html#timers) or [`setImmediate`](https://dvcs.w3.org/hg/webperf/raw-file/tip/specs/setImmediate/Overview.html#processingmodel), or with a "micro-task" mechanism such as [`MutationObserver`](http://dom.spec.whatwg.org/#interface-mutationobserver) or [`process.nextTick`](http://nodejs.org/api/process.html#process_process_nexttick_callback). Since the promise implementation is considered platform code, it may itself contain a task-scheduling queue or "trampoline" in which the handlers are called.

// 1. That is, in strict mode `this` will be `undefined` inside of them; in sloppy mode, it will be the global object.

// 1. Implementations may allow `promise2 === promise1`, provided the implementation meets all requirements. Each implementation should document whether it can produce `promise2 === promise1` and under what conditions.

// 1. Generally, it will only be known that `x` is a true promise if it comes from the current implementation. This clause allows the use of implementation-specific means to adopt the state of known-conformant promises.

// 1. This procedure of first storing a reference to `x.then`, then testing that reference, and then calling that reference, avoids multiple accesses to the `x.then` property. Such precautions are important for ensuring consistency in the face of an accessor property, whose value could change between retrievals.

// 1. Implementations should *not* set arbitrary limits on the depth of thenable chains, and assume that beyond that arbitrary limit the recursion will be infinite. Only true cycles should lead to a `TypeError`; if an infinite chain of distinct thenables is encountered, recursing forever is the correct behavior.