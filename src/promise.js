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
    for(var array = this, i = array.length; i--; iter( array[i], i, array ));
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
          that._adopt( REJECTED, reason );
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
      return this;
    },

    // Promise#__reject__ ( public ):
    // provide alternative to initial `then` method
    // 
    reject: function( reason ) {
      this._adopt( REJECTED, reason );
      return this;
    },

    // Promise#__adopt__ ( private ):
    // 
    // - transition this promise from one state to another
    //   and take appropriate actions - delegate to `_run()`
    // - allow fulfill/reject without value/reason
    // - be confident `state` will always be one of the defined
    // 
    _adopt: function( state, value ) {

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
            promise._adopt( REJECTED, reason );
          }
        }
      }, 0 );
    },

    // Promise#__resolve__ ( private ):
    // 
    // - if this is to be resolved with itself - throw
    // - if `any` is another one of ours adopt its `_state` if it
    //   is no longer `PENDING` or else prolong state adoption with `.then()`.
    // - if `any` is neither none nor primitive and is
    //   _thenable_ i.e. has a `.then()` method assume it's a promise.
    //   register this promise as `any`'s successor.
    // - fulfill/reject this promise with `any` any otherwise
    // 
    _resolve: function( any ) {

      var that = this;

      if ( that === any ) {
        that._adopt( REJECTED, new TypeError() );

      } else if ( any instanceof Promise ) {
        if ( any._state === PENDING ) {
          any.then(
            function( value ) {
              that._resolve( value );
            },
            function( reason ) {
              that._adopt( REJECTED, reason );
            }
          );
        } else {
          that._adopt( any._state, any._value );
        }

      } else if ( any != null && re_type_not_primitive.test( typeof any ) ) {

        var called = false,
          then;

        try {
          then = any.then;
          if ( isFunction( then ) ) {
            then.call( any, function( value ) {
              called || that._resolve( value );
              called = true;
            }, function( reason ) {
              called || that._adopt( REJECTED, reason );
              called = true;
            } );
          } else {
            that._adopt( FULFILLED, any );
          }
        } catch ( reason ) {
          called || that._adopt( REJECTED, reason );
        }
      } else {
        that._adopt( FULFILLED, any );
      }
    }
  };

  // Promise.__when__ ( public )
  // 
  // - group promises and fulfill when all are fulfilled,
  //   reject as soon as one is rejected
  // - expects an array-ish object, e.g. strings work, too.
  // - `._resolve()` each passed item and proxy its future value
  //   or the item _as is_ to a newly created Promise which in turn
  //   fulfills/rejects the master Promise
  //   
  Promise.group = function( anys ) {

    return new Promise( function( fulfill, reject ) {

      var anys_len = anys.length,
        values = Array( anys_len );

      // the index `i` needs be closured
      array_forEach.call( anys, function( any, i ) {
        var proxy = new Promise();
        proxy.then(
          function( value ) {
            values[ i ] = value;
            if ( !--anys_len ) {
              fulfill( values );
            }
          },
          function( reason ) {
            reject( [ reason, i ] );
          }
        );
        proxy._resolve( any );
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