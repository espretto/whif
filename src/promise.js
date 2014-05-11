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

  // fix old webkit bug
  // ------------------

  isFunction = ( function() {

    var object = {},
      object_toString = object.toString,
      function_str = 'function',
      function_repr = '[object Function]';

    return (
      typeof re_type_not_primitive === function_str
      ? function( any ) {
        return object_toString.call( any ) === function_repr
      }
      : function( any ) {
        return any && typeof any === function_str
      }
    );
  }() );

  // Promise module
  // ==============

  function Promise( then ) {

    // constructor:
    // 
    // - allow to omit the `new` operator
    // - keep private `_state` information
    // - keep registered call-/errbacks within `_queue`
    // - pass this' `fulfill` and `reject` functions to the optional intial `then`

    var that = this;

    if(!(that instanceof Promise)) return new Promise( then );

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

    then: function( onFulfilled, onRejected ) {

      // __then:__
      // 
      // - create a new promise as required to be returned
      // - enqueue the triple
      // - `_run()` in case this promise was already fulfilled/rejected

      var that = this,
        promise = new Promise();

      that._queue.push( {
        fulfill: isFunction( onFulfilled ) && onFulfilled,
        reject: isFunction( onRejected ) && onRejected,
        promise: promise
      } );

      that._run();

      return promise;
    },

    fulfill: function( value ) {

      // __fulfill:__
      // provide alternative to initial `then` method
      this._resolve( value );
    },

    reject: function( reason ) {

      // __reject:__
      // provide alternative to initial `then` method
      this._transition( REJECTED, reason );
    },

    _transition: function( state, value ) {

      // private __transition__:
      // 
      // - transition this promise from one state to another
      //   and take appropriate actions - delegate to `_run()`
      // - allow fulfill/reject without value/reason
      // - be confident `state` will always be one of the defined

      var that = this,
        _state = that._state;

      if ( _state !== state && _state === PENDING ) {
        that._state = state;
        that._value = value;
        that._run();
      }
    },

    _run: function() {

      // private __run__:
      // 
      // - if still `PENDING` return
      // - flush callstack and await next tick
      // - dequeue triples in the order registered, for each:
      //   - call registered fulfill/reject handlers dependent on the transition
      //   - reject immediately if an erro is thrown
      //   - `._resolve()` the returned value

      var that = this;

      if ( that._state === PENDING ) return;

      setTimeout( function() {

        var queue = that._queue,
          object, promise, value;

        while ( queue.length ) {
          object = queue.shift();
          promise = object.promise;

          try {
            value = (
              that._state === FULFILLED ? ( object.fulfill || function( value ) {
                return value
              } ) : ( object.reject || function( exception ) {
                throw exception
              } )
            )( that._value );

            promise._resolve( value );

          } catch ( reason ) {
            promise._transition( REJECTED, reason );
          }
        }
      }, 0 );
    },

    _resolve: function( x ) {

      // private __resolve__:
      // 
      // - if this is to be resolved with itself - throw
      // - if `x` is another one of ours adopt its `_state`
      //   is no longer `PENDING` or else prolong state adoption with `.then()`.
      // - if `x` is neither none nor primitive and is
      //   _thenable_ i.e. has a `.then()` method assume it's a promise.
      //   register this promise as `x`'s successor.
      // - fulfill/reject this promise with `x` any otherwise

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