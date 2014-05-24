
/*!
 * whif javascript library released under MIT licence
 * http://mariusrunge.com/mit-licence.html
 */

( function( root ) {

  // baseline setup
  // ==============

  var // one to var them all

  // whif states
  // -----------

  PENDING = 1,
  REJECTED = 2,
  RESOLVED = 4,

  // well known strings
  // ------------------

  str_object = 'object',
  str_function = 'function',
  str_prototype = 'prototype',

  // helper functions
  // ----------------

  isFunction = ( function() {

    var object_toString = Object[str_prototype].toString,
      repr_function = '[object Function]';

    return ( // fix old webkit bug
      typeof /r/ === str_function
      ? function( value ) {
        return object_toString.call( value ) === repr_function;
      }
      : function( value ) {
        return typeof value === str_function;
      }
    );
  }() );
  
  function id( value ) { return value }
  function cancel( error ) { throw error }

  function isPrimitive( value ){
    return ( // re-/abuse variable `value` as its type
      value == null ||
      ( value = typeof value ) !== str_object &&
      value !== str_function
    );
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

    if ( !( that instanceof whif ) ) return new whif( then, sync );

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

  whif[str_prototype] = {

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

      var that = this,
        called = false;

      function onResolved( value ){
        called || ( called = true, that._resolve( value ) );
      }

      function onRejected( reason ){
        called || ( called = true, adopt( that, REJECTED, reason ) );
      }

      if( that === value ){
        onRejected( new TypeError );
      } else if( isPrimitive( value ) ) {
        adopt( that, RESOLVED, value );
      } else if( value instanceof whif ){
        if( value._state & PENDING ){
          value.then( onResolved, onRejected );
        } else {
          adopt( that, value._state, value._value );  
        }
      } else {
        try{
          var then = value.then;
          if( isFunction( then ) ){
            then.call( value, onResolved, onRejected );
          } else {
            adopt( that, RESOLVED, value );
          }
        } catch ( reason ){
          onRejected( reason );
        }
      }

      return that;
    },

    // __whif#_reject__ ( public ):
    // provide alternative to initial `then` method
    // 
    _reject: function( reason ) {
      adopt( this, REJECTED, reason );
      return this;
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

    if ( _state ^ state && _state & PENDING ) {
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

    function _run() {

      var queue = promise._queue, object, successor, value;

      while ( queue.length ) {
        object = queue.shift();
        successor = object.promise;

        var called = false;
        try {
          value = (
            promise._state & RESOLVED
            ? object.resolve
            : object.reject
          )( promise._value );
        } catch ( reason ) {
          called = true;
          adopt( successor, REJECTED, reason );
        }
        called || successor._resolve( value );
      }
    }

    if ( promise._state ^ PENDING ){
      if( promise._sync ){
        _run();
      } else {
        whif.nextTick( _run );
      }
    }
  }

  // __whif.nextTick__ ( public )
  // 
  // inspired by [WebReflection](https://gist.github.com/WebReflection/2953527)
  // - try `process.nextTick`
  // - fall back on `requestAnimationFrame` and all its vendor prefixes
  // - make sure the above are called in the context of their owner object
  // - fallback on `setImmediate`
  // - fallback on `setTimeout`
  // 
  whif.nextTick = ( function(){
    
    var owner = typeof process === str_object ? process : root,
      nextTick = owner.nextTick,
      prefixes = 'webkitR-mozR-msR-oR-r'.split( '-' );

    while( !isFunction( nextTick ) && prefixes.length ){
      nextTick = root[ prefixes.pop() + 'equestAnimationFrame' ];
    }

    nextTick = nextTick || root.setImmediate || setTimeout;

    return function(){
      return nextTick.apply( owner, arguments )
    }
  }() );

  // __whif.when__ ( public )
  // 
  // - group whifs and resolve when all are resolved,
  //   reject as soon as one is rejected
  // - `._resolve()` each passed item and proxy its future value
  //   or the item _as is_ to a newly created whif which in turn
  //   resolves/rejects the master whif
  //   
  whif.group = function( args, sync ) {
    
    return new whif( function( resolve, reject ) {

      var i = args.length,
        args_len = i,
        values = new Array( args_len );

      while(i--){ // inlined Array#forEach to closure index `i`
        (function(value, i){

          function res( value ) {
            values[ i ] = value;
            if ( !--args_len ) {
              resolve( values );
            }
          }

          function rej( reason ) {
            reject( [ reason, i ] );
          }

          if( isPrimitive( value ) ){
            res( value );
          } else {
            try{
              var then = value.then;
              if( isFunction( then ) ){
                then.call( value, res, rej );
              } else {
                res( value );
              }
            } catch( reason ){
              rej( reason );
            }
          }
          
        }(args[i], i))
      }
    }, sync );
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