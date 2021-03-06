'use strict'

const chai = require('chai')
const expect = chai.expect

const { ResourceApp } = require('../../apps/ResourceApp')
const { MockDatabaseAdapter } = require('../mocks/MockDatabaseAdapter')
const { MockSessionAdapter } = require('../mocks/MockSessionAdapter')
const { ResourceRouter } = require('../../routers/ResourceRouter')
const { emulator, setApp } = require('../support/emulator')

class TestApp extends ResourceApp {
  parseRecord (record) {
    delete record.password
    return record
  }
}

describe('ResourceApp', function () {
  let record
  let persistentRecord
  let database = new MockDatabaseAdapter()

  context('without session', function () {
    before(function () {
      this.app = new TestApp({
        database,
        router: new ResourceRouter(),
        table: 'Tasks',
        timestamps: {
          created: 'createdAt',
          updated: 'updatedAt'
        }
      })
      setApp(this.app)
      // creates persistentRecord
      let data = { description: 'Persistent Record' }
      return chai.request(emulator).post('/').send(data).then(res => {
        persistentRecord = res.body
      })
    })

    describe('create', function () {
      context('valid record', function () {
        let response

        before(function () {
          let data = { a: '1', b: 2, c: '3', password: '123', metadata: { a: 4, b: [5, '6'] } }
          return chai.request(emulator).post('/').send(data).then(res => {
            response = res
            record = response.body
          })
        })

        it('is successful', function () {
          expect(response).to.have.status(201)
        })

        it('responds with created record', function () {
          expect(response.body.a).to.equal('1')
          expect(response.body.b).to.equal(2)
          expect(response.body.c).to.equal('3')
          expect(response.body.metadata.a).to.equal(4)
          expect(response.body.metadata.b[0]).to.equal(5)
          expect(response.body.metadata.b[1]).to.equal('6')
          expect(response.body.id).to.exist()
        })

        it('parses output', function () {
          expect(response.body.password).to.not.exist()
        })

        it('timestamps record', function () {
          expect(response.body.createdAt).to.exist()
          expect(response.body.updatedAt).to.exist()
        })
      })

      context('with unique fields', function () {
        before(function () {
          this.app.unique = ['username']
          return chai.request(emulator).post('/').send({ username: 'abc', a: 1 })
        })

        after(function () {
          this.app.unique = []
        })

        it('fails with conflict when trying to create record with the same unique field', function () {
          return chai.request(emulator).post('/').send({ username: 'abc', a: 2 }).then(response => {
            expect(response).to.have.status(409)
          })
        })

        context('with update flag', function () {
          before(function () {
            this.app.updateOnConflict = true
          })

          after(function () {
            this.app.updateOnConflict = false
          })

          it('updates the existing record instead of returning conflict error', function () {
            return chai.request(emulator).post('/').send({ username: 'abc', a: 2 }).then(response => {
              expect(response).to.have.status(200)
              expect(response.body.a).to.equal(2)
            })
          })
        })
      })
    })

    describe('show', function () {
      let response

      before(function () {
        return chai.request(emulator).get(`/${record.id}`).then(res => {
          response = res
        })
      })

      it('is successful', function () {
        expect(response).to.have.status(200)
      })

      it('returns record data', function () {
        expect(response.body.a).to.equal('1')
        expect(response.body.b).to.equal(2)
        expect(response.body.c).to.equal('3')
        expect(response.body.metadata.a).to.equal(4)
        expect(response.body.metadata.b[0]).to.equal(5)
        expect(response.body.metadata.b[1]).to.equal('6')
        expect(response.body.id).to.exist()
      })
    })

    describe('list', function () {
      let response

      before(function () {
        return chai.request(emulator).get('/').then(res => {
          response = res
        })
      })

      it('is successful', function () {
        expect(response).to.have.status(200)
      })

      it('returns a list', function () {
        expect(response.body).to.be.an('array')
      })

      it('returns record data', function () {
        // record 0 is persistentRecord
        expect(response.body[1].a).to.equal('1')
        expect(response.body[1].b).to.equal(2)
        expect(response.body[1].c).to.equal('3')
        expect(response.body[1].metadata.a).to.equal(4)
        expect(response.body[1].metadata.b[0]).to.equal(5)
        expect(response.body[1].metadata.b[1]).to.equal('6')
        expect(response.body[1].id).to.exist()
      })
    })

    describe('update', function () {
      context('valid record', function () {
        let response

        before(function () {
          let data = { b: 1 }
          return chai.request(emulator).patch(`/${record.id}`).send(data).then(res => {
            response = res
          })
        })

        it('is successful', function () {
          expect(response).to.have.status(200)
        })

        it('changes the given property', function () {
          expect(response.body.b).to.equal(1)
        })

        it('keeps other properties unchanged', function () {
          expect(response.body.a).to.equal('1')
          expect(response.body.c).to.equal('3')
          expect(response.body.metadata.a).to.equal(4)
          expect(response.body.metadata.b[0]).to.equal(5)
          expect(response.body.metadata.b[1]).to.equal('6')
          expect(response.body.id).to.exist()
        })

        it('keeps createdAt', function () {
          expect(response.body.createdAt).to.equal(record.createdAt)
        })

        it('modifies updatedAt', function () {
          expect(response.body.updatedAt).to.not.equal(record.updatedAt)
        })
      })
    })

    describe('replace', function () {
      context('valid record', function () {
        let response

        before(function () {
          let data = { b: 3 }
          return chai.request(emulator).put(`/${record.id}`).send(data).then(res => {
            response = res
          })
        })

        it('is successful', function () {
          expect(response).to.have.status(200)
        })

        it('replaces the record', function () {
          expect(response.body.a).to.not.exist()
          expect(response.body.b).to.equal(3)
          expect(response.body.c).to.not.exist()
          expect(response.body.metadata).to.not.exist()
          expect(response.body.password).to.not.exist()
        })

        it('keeps createdAt', function () {
          expect(response.body.createdAt).to.equal(record.createdAt)
        })

        it('modifies updatedAt', function () {
          expect(response.body.updatedAt).to.not.equal(record.updatedAt)
        })
      })
    })

    describe('delete', function () {
      context('on existing record', function () {
        let response

        before(function () {
          return chai.request(emulator).delete(`/${record.id}`).then(res => {
            response = res
          })
        })

        it('is successful with empty response', function () {
          expect(response).to.have.status(204)
        })

        it('deletes the record', function () {
          return chai.request(emulator).get(`/${record.id}`).then(res => {
            expect(res).to.have.status(404)
          })
        })
      })

      context('on non-existing record', function () {
        it('returns 404', function () {
          return chai.request(emulator).delete(`/${record.id}`).then(response => {
            expect(response).to.have.status(404)
          })
        })
      })
    })
  })

  context('with session', function () {
    before(function () {
      this.app = new TestApp({
        database,
        router: new ResourceRouter(),
        session: new MockSessionAdapter({ secret: 'abc' }),
        table: 'Tasks',
        timestamps: {
          created: 'createdAt',
          updated: 'updatedAt'
        }
      })

      setApp(this.app)
    })

    context('without token', function () {
      describe('create', function () {
        it('returns unauthorized', function () {
          let data = { a: '1', b: 2, c: '3' }
          return chai.request(emulator).post('/').send(data).then(response => {
            expect(response.status).to.equal(401)
          })
        })
      })

      describe('update', function () {
        it('returns unauthorized', function () {
          let data = { a: '1', b: 2, c: '3' }
          return chai.request(emulator).put(`/${persistentRecord.id}`).send(data).then(response => {
            expect(response.status).to.equal(401)
          })
        })
      })

      describe('show', function () {
        it('returns unauthorized', function () {
          return chai.request(emulator).get(`/${persistentRecord.id}`).then(response => {
            expect(response.status).to.equal(401)
          })
        })
      })

      describe('list', function () {
        it('returns unauthorized', function () {
          return chai.request(emulator).get('/').then(response => {
            expect(response.status).to.equal(401)
          })
        })
      })

      describe('delete', function () {
        it('returns unauthorized', function () {
          return chai.request(emulator).delete(`/${persistentRecord.id}`).then(response => {
            expect(response.status).to.equal(401)
          })
        })
      })
    })
  })
})
