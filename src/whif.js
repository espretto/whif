/*!
 * whif javascript library released under MIT licence
 * http://mariusrunge.com/mit-licence.html
 */

(function (root) {

  // baseline setup
  // ==============

  var // one to var them all

  // whif states
  // -----------

  PENDING = -1,
  REJECTED = 0,
  FULFILLED = 1,

  // well known strings
  // ------------------

  typeObject = 'object',
  typeFunction = 'function',
  reprFunction = '[object Function]',

  // helper functions
  // ----------------

  objectToString = ({}).toString,

  arrayForEach = [].forEach || function(iter, ctx){
    var i,
      len,
      array = this;

    if(array == null) throw new TypeError('can\'t convert ' + array + ' to object');

    array = Object(array);
    len = array.length >>> 0;

    for(i = 0; i < len; i++){
      if(i in array){
        if(iter.call(ctx, array[i], i, array) === false){
          break;
        }
      }
    }
  };

  function id(value) {
    return value;
  }

  function cancel(error) {
    throw error;
  }

  function isPrimitive(value) {
    var type = typeof value;
    return value == null || type !== typeObject && type !== typeFunction;
  }

  // avoid old webkit bug where `typeof /re/ === 'function'` yields true.
  function isFunction(value){
    return objectToString.call(value) === reprFunction;
  }

  // whif module
  // ===========

  // __whif#constructor__ (pubic):
  // 
  // - allow to omit the `new` operator
  // - keep private `_state` information
  // - set whether this promise should be resolved (a-)synchronously
  // - keep track of registered call-/errbacks within `_queue`
  // - pass this' `_resolve` and `_reject` functions to the optional initial `then`
  // 
  function whif(then) {

    var that = this;

    if (!(that instanceof whif)) return new whif(then);

    that._state = PENDING;
    that._queue = [];
    that._sync = false;

    if (isFunction(then)) {
      then(
        function (value) { that._resolve(value); },
        function (reason) { adopt(that, REJECTED, reason); }
      );
    }
  }

  whif.prototype = {

    // __whif#then__ (public):
    // 
    // - create a new promise as required to be returned
    // - enqueue the triple
    // - `run()` in case this promise was already resolved/rejected
    // 
    then: function (onResolved, onRejected) {
      var that = this,
        promise = new whif();

      that._queue.push({
        resolve: isFunction(onResolved) ? onResolved : id,
        reject: isFunction(onRejected) ? onRejected : cancel,
        promise: promise
      });

      run(that);

      return promise;
    },

    // __whif#fail__ (public):
    fail: function(onRejected){
      return this.then(null, onRejected);
    },

    // __whif#sync__ (public):
    sync: function(){
      this._sync = true;
      return this;
    },

    // __whif#_resolve__ (public):
    // 
    // - if this is to be resolved with itself - throw an error
    // - if `value` is another one of ours, adopt its `_state` if it
    //   is no longer `PENDING` or else prolong state adoption with `.then()`.
    // - if `value` is _thenable_ i.e. has a `.then()` method assume it's a promise.
    //   register this whif as `value`'s successor.
    // - resolve/reject this whif with `value` value otherwise
    // 
    _resolve: function (value) {

      var that = this,
        called = false,
        then;

      function onResolved(value) {
        if (!called) {
          called = true;
          that._resolve(value);
        }
      }

      function onRejected(reason) {
        if (!called) {
          called = true;
          adopt(that, REJECTED, reason);
        }
      }

      if (that === value) {
        onRejected(new TypeError());
      } else if (isPrimitive(value)) {
        adopt(that, FULFILLED, value);
      } else if (value instanceof whif) {
        if (value._state === PENDING) {
          value.then(onResolved, onRejected);
        } else {
          adopt(that, value._state, value._value);
        }
      } else {
        try {
          then = value.then;
          if (isFunction(then)) {
            then.call(value, onResolved, onRejected);
          } else {
            adopt(that, FULFILLED, value);
          }
        } catch (reason) {
          onRejected(reason);
        }
      }

      return that;
    },

    // __whif#_reject__ (public):
    // provide alternative to initial `then` method
    // 
    _reject: function (reason) {
      adopt(this, REJECTED, reason);
      return this;
    }
  };

  // __adopt__ (private):
  // 
  // - transition this promise from one state to another
  //   and take appropriate actions - delegate to `run()`
  // - allow resolve/reject without value/reason
  // - be confident `_state` will always be one of the defined
  // 
  function adopt(promise, state, value) {

    var _state = promise._state;

    if (_state !== state && _state === PENDING) {
      promise._state = state;
      promise._value = value;
      run(promise);
    }
  }

  // __run__ (private):
  // 
  // - if still `PENDING` return
  // - flush callstack and await next tick
  // - dequeue triples in the order registered, for each:
  //   - call registered resolve/reject handlers dependent on the transition
  //   - reject immediately if an error is thrown
  //   - `._resolve()` the returned value
  //   
  function run(promise) {

    function _run() {
      var queue = promise._queue,
        queue_item, 
        successor,
        value;

      while (queue.length) {
        queue_item = queue.shift();
        successor = queue_item.promise;

        var called = false;
        try {
          value = (
            promise._state === FULFILLED ?
            queue_item.resolve :
            queue_item.reject
          )(promise._value);
        } catch (reason) {
          called = true;
          adopt(successor, REJECTED, reason);
        }
        // exclude resolve procedure from try-catch block since it's got its own
        if(!called){
          successor._resolve(value);
        }
      }
    }

    if (promise._state !== PENDING) {
      if(this._sync){
        _run();
      } else {
        whif.nextTick(_run);
      }
    }
  }

  // __whif.resolve__ (public)
  whif.resolve = function(value){
    return new whif()._resolve(value);
  };

  // __whif.reject__ (public)
  whif.reject = function(reason){
    return new whif()._reject(reason);
  };

  // __whif.nextTick__ (public)
  // inspired by [WebReflection](https://gist.github.com/WebReflection/2953527)
  // 
  // - try `process.nextTick`
  // - fall back on `requestAnimationFrame` and all its vendor prefixes
  // - make sure the above are called in the context of their owner object
  // - fallback on `setImmediate`
  // - fallback on `setTimeout`
  // 
  whif.nextTick = (function () {

    var owner = typeof process === typeObject ? process : root,
      nextTick = owner.nextTick,
      prefixes = 'webkitR-mozR-msR-oR-r'.split('-');

    while (!isFunction(nextTick) && prefixes.length) {
      nextTick = root[prefixes.pop() + 'equestAnimationFrame'];
    }

    nextTick = nextTick || root.setImmediate || setTimeout;

    return function () {
      return nextTick.apply(owner, arguments);
    };
  }());

  // __whif.join__ (public)
  // 
  // - join whifs and resolve when all are resolved,
  //   reject as soon as one is rejected
  // - resolve each passed item and proxy its future value
  //   or the item _as is_ to the master's values array.
  //   
  whif.join = function (args) {

    return new whif(function (resolve, reject) {
      var values,
        len = args.length;

      if(!len) return resolve(args);

      values = new Array(len);

      arrayForEach.call(args, function(value, i){

        whif.resolve(value).sync().then(function(value){
          values[i] = value;
          if (!--len) resolve(values);
        }, reject);
      });
    });
  };

  // export
  // ------
  // 
  // - cjs
  // - amd - anonymous
  // - browser - opt to rename
  
  /* global define */

  if (typeof module === typeObject && module.exports) {
    module.exports = whif;
  } else if (typeof define === typeFunction && define.amd) {
    define(function () {
      return whif;
    });
  } else {

    // __whif.noConflict__ (public):
    // 
    // restores the previous value assigned to `window.whif`
    // and returns the inner reference whif holds to itself.
    // 
    var previous_whif = root.whif;

    whif.noConflict = function () {
      root.whif = previous_whif;
      return whif;
    };

    root.whif = whif;
  }
}(this));