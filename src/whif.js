( function( root ) {

  // baseline setup
  // ==============

  var // one to var them all

  // whif states
  // -----------

  PENDING = -1,
  REJECTED = 0,
  RESOLVED = 1,

  // well known strings
  // ------------------

  str_object = 'object',
  str_function = 'function',

  // helper functions
  // ----------------

  isFunction = ( function() {

    var object = {},
      object_toString = object.toString,
      repr_function = '[object Function]';

    return ( // fix old webkit bug
      typeof /re/ === str_function
      ? function( value ) {
        return value && object_toString.call( value ) === repr_function
      }
      : function( value ) {
        return value && typeof value === str_function
      }
    );
  }() ),

  // inspired by [WebReflection](https://gist.github.com/WebReflection/2953527)
  nextTick = ( function(){
    
    var nextTick = typeof process === str_object && process.nextTick,
      prefixes = 'webkitR-mozR-msR-oR-r'.split( '-' ),
      i = prefixes.length;

    while( i-- && !isFunction( nextTick ) ){
      nextTick = root[ prefixes[ i ] + 'equestAnimationFrame' ];
    }

    return nextTick || root.setImmediate || setTimeout;

  }() ),
  
  array_forEach = [].forEach || function( iter ) {
    for ( var array = this, i = array.length; i--; iter( array[ i ], i, array ) );
  };

  function id( value ) { return value }
  function cancel( error ) { throw error }
  function isPrimitve( value ){
    var type = typeof value;
    return value == null || type !== str_object && type !== str_function;
  }

  // whif module
  // ===========

  // __whif#constructor__ ( pubic ):
  // 
  // - allow to omit the `new` operator
  // - keep private `_state` information
  // - set whether this promise should be resolved (a-)synchronously
  // - keep track of registered call-/errbacks within `_queue`
  // - pass this' `_resolve` and `_reject` functions to the optional initial `then`
  // 
  function whif( then, sync ) {

    var that = this;

    if ( !( that instanceof whif ) ) return new whif( then );

    that._state = PENDING;
    that._queue = [];
    that._sync = !!sync;

    if ( isFunction( then ) ) {
      then(
        function( value ) {
          that._resolve( value );
        },
        function( reason ) {
          adopt( that, REJECTED, reason );
        }
      );
    }
  };

  whif.prototype = {

    // __whif#then__ ( public ):
    // 
    // - create a new promise as required to be returned
    // - enqueue the triple
    // - `run()` in case this promise was already resolved/rejected
    // 
    then: function( onResolved, onRejected, sync ) {

      var that = this,
        promise = new whif( null, sync );

      that._queue.push( {
        resolve: isFunction( onResolved ) ? onResolved : id,
        reject: isFunction( onRejected ) ? onRejected : cancel,
        promise: promise
      } );

      run( that );

      return promise;
    },

    // __whif#_resolve__ ( public ):
    // 
    // - if this is to be resolved with itself - throw
    // - if `value` is another one of ours adopt its `_state` if it
    //   is no longer `PENDING` or else prolong state adoption with `.then()`.
    // - if `value` is neither none nor primitive and is
    //   _thenable_ i.e. has a `.then()` method assume it's a promise.
    //   register this whif as `value`'s successor.
    // - resolve/reject this whif with `value` value otherwise
    // 
    _resolve: function( value ) {

      var that = this;

      if ( that === value ) {
        adopt( that, REJECTED, new TypeError() );

      } else if ( value instanceof whif ) {
        if ( value._state === PENDING ) {
          value.then(
            function( value ) {
              that._resolve( value );
            },
            function( reason ) {
              adopt( that, REJECTED, reason );
            }
          );
        } else {
          adopt( that, value._state, value._value );
        }

      } else if ( !isPrimitve( value ) ) {

        var called = false, then;

        try {
          then = value.then;
          if ( isFunction( then ) ) {
            then.call( value, function( value ) {
              called || that._resolve( value );
              called = true;
            }, function( reason ) {
              called || adopt( that, REJECTED, reason );
              called = true;
            } );
          } else {
            adopt( that, RESOLVED, value );
          }
        } catch ( reason ) {
          called || adopt( that, REJECTED, reason );
        }
      } else {
        adopt( that, RESOLVED, value );
      }
      return that;
    },

    // __whif#_reject__ ( public ):
    // provide alternative to initial `then` method
    // 
    _reject: function( reason ) {
      var that = this;
      adopt( that, REJECTED, reason );
      return that;
    }
  };

  // __adopt__ ( private ):
  // 
  // - transition this promise from one state to another
  //   and take appropriate actions - delegate to `run()`
  // - allow resolve/reject without value/reason
  // - be confident `_state` will always be one of the defined
  // 
  function adopt( promise, state, value ) {

    var _state = promise._state;

    if ( _state !== state && _state === PENDING ) {
      promise._state = state;
      promise._value = value;
      run( promise );
    }
  }

  // __run__ ( private ):
  // 
  // - if still `PENDING` return
  // - flush callstack and await next tick
  // - dequeue triples in the order registered, for each:
  //   - call registered resolve/reject handlers dependent on the transition
  //   - reject immediately if an erro is thrown
  //   - `._resolve()` the returned value
  //   
  function run( promise ) {

    if ( promise._state === PENDING ) return;

    function _run() {

      var queue = promise._queue,
        object, successor, value, fn;

      while ( queue.length ) {
        object = queue.shift();
        successor = object.promise;

        try {
          fn = promise._state === RESOLVED ? object.resolve : object.reject;
          value = fn( promise._value );
          successor._resolve( value );

        } catch ( reason ) {
          adopt( successor, REJECTED, reason );
        }
      }
    }

    if( promise._sync ){
      _run();
    } else {
      nextTick( _run );
    }
  }

  // whif.__when__ ( public )
  // 
  // - group whifs and resolve when all are resolved,
  //   reject as soon as one is rejected
  // - `._resolve()` each passed item and proxy its future value
  //   or the item _as is_ to a newly created whif which in turn
  //   resolves/rejects the master whif
  //   
  whif.group = function() {
    
    var args = arguments;

    return new whif( function( resolve, reject ) {

      var args_len = args.length,
        values = Array( args_len );

      // the index `i` needs be closured
      array_forEach.call( args, function( value, i ) {
        var proxy = new whif();
        proxy.then(
          function( value ) {
            values[ i ] = value;
            if ( !--args_len ) {
              resolve( values );
            }
          },
          function( reason ) {
            reject( [ reason, i ] );
          }
        );
        proxy._resolve( value );
      } )
    } );
  }

  // export
  // ------
  // 
  // - nodejs
  // - amd - anonymous
  // - browser - opt to rename

  if ( typeof module === str_object && module.exports ) {
    module.exports = whif;
  } else if ( typeof define === str_function && define.amd ) {
    define( function() {
      return whif
    } );
  } else {

    // __whif.noConflict__ ( public ):
    // 
    // restores the previous value assigned to `window.whif`
    // and returns the inner reference whif holds to itself.
    // 
    var previous_whif = root.whif;

    whif.noConflict = function() {
      root.whif = previous_whif;
      return whif;
    }

    root.whif = whif;
  }
}( this ) )