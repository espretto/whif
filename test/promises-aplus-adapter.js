var Promise = require( '../src/promise.js' );

module.exports = {
  resolved: function( value ) {
    return new Promise( function( resolve ) {
      resolve( value );
    } );
    // return new Promise().resolve( value );
  },
  rejected: function( reason ) {
    return new Promise( function( _, reject ) {
      reject( reason );
    } );
    // return new Promise().reject( reason );
  },
  deferred: function() {
    var resolve, reject;
    // var promise = new Promise();
    return {
      promise: new Promise( function( res, rej ) {
        resolve = res;
        reject = rej;
      } ),
      resolve: resolve,
      reject: reject
      // promise: promise,
      // resolve: function( value ){ promise.fulfill( value ) },
      // reject: function( value ){ promise.reject( value ) }
    };
  }
};