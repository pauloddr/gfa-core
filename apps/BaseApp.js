'use strict'

const INTERNAL_ERROR_RESPONSE = { code: 'INTERNAL_ERROR' }

const CORS_HEADERS = [
  // ['Access-Control-Allow-Origin', '*'],
  ['Access-Control-Allow-Methods', 'OPTIONS,GET,HEAD,POST,PUT,PATCH,DELETE'],
  ['Access-Control-Allow-Headers', 'X-Requested-With,Content-Type'],
  ['Access-Control-Allow-Credentials', 'true'],
  ['Access-Control-Max-Age', '86400']
]

class BaseApp {
  constructor (options) {
    if (!options) {
      throw new Error('APP_OPTIONS_REQUIRED')
    }
    if (!options.router) {
      throw new Error('APP_ROUTER_REQUIRED')
    }
    this.router = options.router
    this.headers = options.headers || []
    this.cors = options.cors || false
    this.bindMethods()
  }

  build () {
    this.router.build(this)
  }

  handle (req, res) {
    this.setHeaders(req, res)
    this.router.handle(req, res)
  }

  // OPTIONS /endpoint
  options (req, res) {
    this.empty(null, req, res)
  }

  empty (err, req, res) {
    if (err) {
      this.error(err, req, res, 'empty')
      return
    }
    res.status(204).end()
  }

  // Used only for uncaught errors.
  // Error details should be logged, but not exposed.
  error (err, req, res, source) {
    if (err.status) {
      res.status(err.status).end()
      return
    }
    console.error(source, err)
    res.status(500).json(INTERNAL_ERROR_RESPONSE)
  }

  final (_req, res) {
    if (!res.headersSent) {
      res.status(404).end()
    }
  }

  setHeaders (req, res) {
    var header
    if (this.cors === true || this.cors === 'dev') {
      for (header of CORS_HEADERS) {
        res.header(header[0], header[1])
      }
      if (this.cors === 'dev') {
        res.header('Access-Control-Allow-Origin', req.get('origin'))
        res.header('Vary', 'Origin')
      }
    }
    for (header of this.headers) {
      res.header(header[0], header[1])
    }
  }

  bindMethods () {
    this.setHeaders = this.setHeaders.bind(this)
    this.options = this.options.bind(this)
    this.empty = this.empty.bind(this)
    this.error = this.error.bind(this)
    this.final = this.final.bind(this)
  }
}

exports.BaseApp = BaseApp
