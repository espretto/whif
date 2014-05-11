
// Promises A+ Version 1.1 Tests
// =============================

var promises_aplus_adapter = require( './promises-aplus-adapter.js' )
var promises_aplus_tests = require( 'promises-aplus-tests' );

promises_aplus_tests( promises_aplus_adapter, function( err ) {
  console.log( err );
} );