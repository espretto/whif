
var whif = require('../src/whif.js')


var adapter = {

  resolved: function (value) {
    return new whif()._resolve(value)
  },

  rejected: function (reason) {
    return new whif()._reject(reason)
  },

  deferred: function() {
    var promise = new whif();
    
    return {
      promise: promise,

      resolve: function (value) {
        promise._resolve(value)
      },
      
      reject: function (value) {
        promise._reject(value)
      }
    }
  }
}


describe("Promises/A+ Tests", function () {
  require("promises-aplus-tests").mocha(adapter)
})
