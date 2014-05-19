var whif = require( '../src/whif.js' );

module.exports = {
  resolved: function( value ) {
    // return whif( function( resolve ) {
    //   resolve( value );
    // } );
    return ( new whif )._resolve( value );
  },
  rejected: function( reason ) {
    // return whif( function( _, reject ) {
    //   reject( reason );
    // } );
    return ( new whif )._reject( reason );
  },
  deferred: function() {
    // var resolve, reject;
    var promise = new whif;
    return {
      // promise: whif( function( res, rej ) {
      //   resolve = res;
      //   reject = rej;
      // } ),
      // resolve: resolve,
      // reject: reject
      promise: promise,
      resolve: function( value ){ promise._resolve( value ) },
      reject: function( value ){ promise._reject( value ) }
    };
  }
};