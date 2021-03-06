'use strict'

const { SessionAdapter } = require('../../adapters/SessionAdapter')

// This mock loads base64-encoded tokens
//   as session objects for testing purposes.
class MockSessionAdapter extends SessionAdapter {
  load (req, res, callback) {
    var token = req.header('authorization')
    if (!token) {
      callback(null, req, res) // ignored as bad token
      return
    }
    try {
      var decode = JSON.parse(Buffer.from(req.header('authorization'), 'base64').toString('ascii'))
    } catch (err) {
      callback(null, req, res) // ignored as bad token
      return
    }
    if (decode.secret !== this.secret) {
      callback(null, req, res) // ignored as bad token
      return
    }
    res.locals.session = decode.data
    callback(null, req, res)
  }

  create (req, res, userRecord, callback) {
    var session = {}
    var field
    for (field of this.expose) {
      session[field] = userRecord[field]
    }
    res.locals.session = session
    var encode = { data: session, secret: this.secret }
    res.header('x-token', Buffer.from(JSON.stringify(encode)).toString('base64'))
    callback(null, req, res)
  }

  destroy (req, res, callback) {
    // Nothing to do
    callback(null, req, res)
  }
}

exports.MockSessionAdapter = MockSessionAdapter
