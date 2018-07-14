'use strict'

const INTERNAL_ERROR_RESPONSE = {code: 'INTERNAL_ERROR'}

class BaseApp {
  constructor (options) {
    if (!options) {
      throw new Error('APP_OPTIONS_REQUIRED')
    }
    if (!options.router) {
      throw new Error('APP_ROUTER_REQUIRED')
    }
    this.router = options.router
    this.headers = []
    this.proxify()
  }

  build () {
    this.router.build(this.proxy)
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
      return this.error(err, req, res, 'empty')
    }
    res.status(204).end()
  }

  // Used only for uncaught errors.
  // Error details should be logged, but not exposed.
  error (err, req, res, source) {
    if (err.message === 'UNAUTHORIZED') {
      return res.status(401).end()
    }
    console.error(source, err)
    res.status(500).json(INTERNAL_ERROR_RESPONSE)
  }

  final (_req, res) {
    if (!res.headerSent) {
      res.status(404).end()
    }
  }

  setHeaders (_req, res) {
    var header
    for (header of this.headers) {
      res.header(header[0], header[1])
    }
  }

  // Create a "proxy" object with function copies bound to this instance.
  // This avoids allocating new functions during callback chains.
  proxify () {
    this.proxy = {
      setHeaders: this.setHeaders.bind(this),
      options: this.options.bind(this),
      empty: this.empty.bind(this),
      error: this.error.bind(this),
      final: this.final.bind(this)
    }
  }
}

exports.BaseApp = BaseApp