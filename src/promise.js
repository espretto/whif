( function( root ) {

  // baseline setup
  // ==============

  var // one to var them all

  // promise states
  // --------------

  PENDING = -1,
  REJECTED = 0,
  FULFILLED = 1,

  // regular expressions
  // -------------------

  re_type_not_primitive = /object|function/,

  // helper functions
  // ----------------

  isFunction = ( function() {

    var object = {},
      object_toString = object.toString,
      function_str = 'function',
      function_repr = '[object Function]';

    return ( // fix old webkit bug
      typeof re_type_not_primitive === function_str
      ? function( any ) {
        return object_toString.call( any ) === function_repr
      }
      : function( any ) {
        return any && typeof any === function_str
      }
    );
  }() ),

  array_forEach = [].forEach || function( iter ){
    for(var array = this, i = array.length; i-- && iter( array[i], i, array ););
  },

  id = function( value ){ return value },
  cancel = function( error ){ throw error };

  // Promise module
  // ==============

  // Promise#__constructor__ ( pubic ):
  // 
  // - allow to omit the `new` operator
  // - keep private `_state` information
  // - keep track of registered call-/errbacks within `_queue`
  // - pass this' `fulfill` and `reject` functions to the optional initial `then`
  // 
  function Promise( then ) {

    var that = this;

    if ( !( that instanceof Promise ) ) return new Promise( then );

    that._state = PENDING;
    that._queue = [];

    if ( isFunction( then ) ) {
      then(
        function( value ) {
          that._resolve( value );
        },
        function( reason ) {
          that._transition( REJECTED, reason );
        }
      );
    }
  };

  Promise.prototype = {

    // Promise#__then__ ( public ):
    // 
    // - create a new promise as required to be returned
    // - enqueue the triple
    // - `_run()` in case this promise was already fulfilled/rejected
    // 
    then: function( onFulfilled, onRejected ) {

      var that = this,
        promise = new Promise();

      that._queue.push( {
        fulfill: isFunction( onFulfilled ) ? onFulfilled : id,
        reject: isFunction( onRejected ) ? onRejected : cancel,
        promise: promise
      } );

      that._run();

      return promise;
    },

    // Promise#__fulfill__ ( public ):
    // provide alternative to initial `then` method
    // 
    fulfill: function( value ) {
      this._resolve( value );
    },

    // Promise#__reject__ ( public ):
    // provide alternative to initial `then` method
    // 
    reject: function( reason ) {
      this._transition( REJECTED, reason );
    },

    // Promise#__transition__ ( private ):
    // 
    // - transition this promise from one state to another
    //   and take appropriate actions - delegate to `_run()`
    // - allow fulfill/reject without value/reason
    // - be confident `state` will always be one of the defined
    // 
    _transition: function( state, value ) {

      var that = this,
        _state = that._state;

      if ( _state !== state && _state === PENDING ) {
        that._state = state;
        that._value = value;
        that._run();
      }
    },

    // Promise#__run__ ( private ):
    // 
    // - if still `PENDING` return
    // - flush callstack and await next tick
    // - dequeue triples in the order registered, for each:
    //   - call registered fulfill/reject handlers dependent on the transition
    //   - reject immediately if an erro is thrown
    //   - `._resolve()` the returned value
    //   
    _run: function() {

      var that = this;

      if ( that._state === PENDING ) return;

      setTimeout( function() {

        var queue = that._queue,
          object, promise, value, fn;

        while ( queue.length ) {
          object = queue.shift();
          promise = object.promise;

          try {
            fn = that._state === FULFILLED ? object.fulfill : object.reject;
            value = fn( that._value );
            promise._resolve( value );

          } catch ( reason ) {
            promise._transition( REJECTED, reason );
          }
        }
      }, 0 );
    },

    // Promise#__resolve__ ( private ):
    // 
    // - if this is to be resolved with itself - throw
    // - if `x` is another one of ours adopt its `_state` if it
    //   is no longer `PENDING` or else prolong state adoption with `.then()`.
    // - if `x` is neither none nor primitive and is
    //   _thenable_ i.e. has a `.then()` method assume it's a promise.
    //   register this promise as `x`'s successor.
    // - fulfill/reject this promise with `x` any otherwise
    // 
    _resolve: function( x ) {

      var that = this;

      if ( that === x ) {
        that._transition( REJECTED, new TypeError() );

      } else if ( x instanceof Promise ) {
        if ( x._state === PENDING ) {
          x.then(
            function( value ) {
              that._resolve( value );
            },
            function( reason ) {
              that._transition( REJECTED, reason );
            }
          );
        } else {
          that._transition( x._state, x._value );
        }

      } else if ( x != null && re_type_not_primitive.test( typeof x ) ) {

        var called = false,
          then;

        try {
          then = x.then;
          if ( isFunction( then ) ) {
            then.call( x, function( y ) {
              called || that._resolve( y );
              called = true;
            }, function( r ) {
              called || that._transition( REJECTED, r );
              called = true;
            } );
          } else {
            that._transition( FULFILLED, x );
          }
        } catch ( reason ) {
          called || that._transition( REJECTED, reason );
        }
      } else {
        that._transition( FULFILLED, x );
      }
    }
  };

  Promise.when = function( xs ) {

    return new Promise( function( fulfill, reject ) {

      var xs_len = xs.length,
        values = Array( xs_len );

      // the index `i` needs be closured
      array_forEach.call( xs, function( x, i ) {
        var proxy = new Promise();
        proxy.then(
          function( value ) {
            values[ i ] = value;
            if ( !--xs_len ) {
              fulfill( values );
            }
          },
          function( reason ) {
            values[ i ] = reason;
            reject( values );
          }
        );
        proxy._resolve( x );
      } )
    } );
  }

  // export
  // ------
  // 
  // - nodejs
  // - amd
  // - browser

  if ( typeof module !== 'undefined' && module.exports ) {
    module.exports = Promise;
  } else if ( typeof define === 'function' && define.amd ) {
    define( function() {
      return Promise
    } );
  } else {
    root.Promise = Promise;

    // Promise.__noConflict__ ( public ):
    // 
    // restores the previous value assigned to `window.Promise`
    // and returns the inner reference Promise holds to itself.

    var previous_Promise = root.Promise;
    Promise.noConflict = function() {
      root.Promise = previous_Promise;
      return Promise;
    }
  }
}( this ) )