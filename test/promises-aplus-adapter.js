var Promise = require( '../src/promise.js' );

module.exports = {
  resolved: function( value ) {
    return new Promise( function( fulfill ) {
      fulfill( value );
    } );
    // return new Promise().fulfill( value );
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
      promise: new Promise( function( ful, rej ) {
        resolve = ful;
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