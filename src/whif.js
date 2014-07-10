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

  str_object = 'object',
  str_function = 'function',
  repr_function = '[object Function]',

  // helper functions
  // ----------------

  object_toString = ({}).toString,

  array_forEach = [].forEach || function(iter, ctx){
    var array = this, len, i;
    if(array == null){
      throw new TypeError('can\'t convert ' + array + ' to object');
    }
    array = Object(array);
    len = array.length >>> 0;
    for(; i < len; i++){
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

  function is_primitive(value) {
    var type = typeof value;
    return value == null || type !== str_object && type !== str_function;
  }

  // avoid old webkit bug where `typeof /re/ === 'function'` yields true.
  function is_function(value){
    return object_toString.call(value) === repr_function;
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

    if (is_function(then)) {
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
    then: function (on_fulfilled, on_rejected) {

      var that = this,
        promise = new whif();

      that._queue.push({
        resolve: is_function(on_fulfilled) ? on_fulfilled : id,
        reject: is_function(on_rejected) ? on_rejected : cancel,
        promise: promise
      });

      run(that);

      return promise;
    },

    // __whif#catch__ (public):
    catch: function(on_rejected){
      return this.then(null, on_rejected);
    },

    sync: function(){
      this._sync = true;
      return this;
    },

    // __whif#_resolve__ (public):
    // 
    // - if this is to be resolved with itself - throw an error
    // - if `value` is another one of ours adopt its `_state` if it
    //   is no longer `PENDING` or else prolong state adoption with `.then()`.
    // - if `value` is neither none nor primitive and is
    //   _thenable_ i.e. has a `.then()` method assume it's a promise.
    //   register this whif as `value`'s successor.
    // - resolve/reject this whif with `value` value otherwise
    // 
    _resolve: function (value) {

      var that = this,
        called = false,
        then;

      function on_fulfilled(value) {
        if (!called) {
          called = true;
          that._resolve(value);
        }
      }

      function on_rejected(reason) {
        if (!called) {
          called = true;
          adopt(that, REJECTED, reason);
        }
      }

      if (that === value) {
        on_rejected(new TypeError());
      } else if (is_primitive(value)) {
        adopt(that, FULFILLED, value);
      } else if (value instanceof whif) {
        if (value._state === PENDING) {
          value.then(on_fulfilled, on_rejected);
        } else {
          adopt(that, value._state, value._value);
        }
      } else {
        try {
          then = value.then;
          if (is_function(then)) {
            then.call(value, on_fulfilled, on_rejected);
          } else {
            adopt(that, FULFILLED, value);
          }
        } catch (reason) {
          on_rejected(reason);
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
        queue_item, successor, value;

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

  whif.resolve = function(value){
    return new whif()._resolve(value);
  };

  whif.reject = function(reason){
    return new whif()._reject(reason);
  };

  // __whif.nextTick__ (public)
  // 
  // inspired by [WebReflection](https://gist.github.com/WebReflection/2953527)
  // - try `process.nextTick`
  // - fall back on `requestAnimationFrame` and all its vendor prefixes
  // - make sure the above are called in the context of their owner object
  // - fallback on `setImmediate`
  // - fallback on `setTimeout`
  // 
  whif.nextTick = (function () {

    var owner = typeof process === str_object ? process : root,
      nextTick = owner.nextTick,
      prefixes = 'webkitR-mozR-msR-oR-r'.split('-');

    while (!is_function(nextTick) && prefixes.length) {
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
      var args_len = args.length, values;

      if(!args_len) return resolve(args);

      values = new Array(args_len);

      array_forEach.call(args, function (value, i) {

        function on_fulfilled(value) {
          values[i] = value;
          if (!--args_len) {
            resolve(values);
          }
        }

        function on_rejected(reason) {
          reject(reason);
        }

        if (is_primitive(value)) {
          on_fulfilled(value);
        } else if(value instanceof whif){
          if(value._state === PENDING){
            value.then(on_fulfilled, on_rejected);
          } else {
            (value._state === FULFILLED ? on_fulfilled : on_rejected)(value._value);
          }
        } else {
          try {
            var then = value.then;
            if (is_function(then)) {
              then.call(value, on_fulfilled, on_rejected);
            } else {
              on_fulfilled(value);
            }
          } catch (reason) {
            on_rejected(reason);
          }
        }
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

  if (typeof module === str_object && module.exports) {
    module.exports = whif;
  } else if (typeof define === str_function && define.amd) {
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