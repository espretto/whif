/* global describe, it*/

var whif = require('../src/whif.js')
var expect = require('expect.js')


describe('whif extras', function () {

  describe('.nextTick()', function () {

    it('should defer the execution of the passed function until the next run-loop cycle', function(done) {
      var x = 1
      whif.nextTick(function () { x++; })
      x *= 2

      // after all (possible race condition)
      setTimeout(function () {
        expect(x).to.equal(3); // instead of 4
        done();  
      }, 1000)
    })

  })

  describe('.sync()', function () {

    it('should resolve chained promises without deferring', function () {
      var x = 1
      whif.resolve().sync().then(function () { x++; })
      x *= 2
      expect(x).to.equal(4)
    })

    it('should reject chained promises without deferring', function () {
      var x = 1
      whif.reject().sync().fail(function () { x++; })
      x *= 2
      expect(x).to.equal(4)
    })

  })

  describe('.join()', function () {

    it('should fail without input', function () {
      expect(whif.join).to.throwError()
    })

    it('should resolve with the empty array if passed the empty array', function (done) {
      whif.join([])
          .then(function () {
            expect(Array.prototype.slice.call(arguments)).to.eql([[]])
            done()
          })
          .fail(done)
    })

    it('should resolve with the array of non-thenables passed in', function (done) {
      var values = [1, 'str', [], {}, /re/, Function]
      whif.join(values)
          .then(function (args) {
            expect(args).to.eql(values)
            done()
          })
          .fail(done)
    })

    it('should resolve with whatever the passed thenable resolves with', function (done) {
      whif.join([whif.resolve('value')])
          .then(function (values) {
            expect(values).to.eql(['value'])
            done()
          })
          .fail(done)
    })

    it('should resolve only after all passed thenables have resolved', function (done) {
      // this probably is subject to a race condition
      
      function delay (n) { 
        return whif(function (res) {
          setTimeout(res, n)
        })
      }

      var hasResolved = false

      setTimeout(function () {
        if (hasResolved) done('resolved too early')
      }, 500)

      whif.join([delay(0), delay(1500)])
          .then(function () { done() })
    })

    it('should proxy the first rejection without waiting for the others', function (done) {
      // this probably is subject to a race condition

      function delay (n) {
        return whif(function (res) {
          setTimeout(res, n)
        })
      }

      var wasRejected = false

      setTimeout(function () {
        if (!wasRejected) done('rejected too late')
      }, 500)

      whif.join([whif.reject(), delay(1000)])
          .then(function () {
            done('resolved instead of rejected')
          })
          .fail(function () {
            wasRejected = true
            done()
          })

    })
  })
})
