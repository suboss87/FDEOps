'use strict'
const test = require('node:test')
const assert = require('node:assert/strict')
const { matchOrders } = require('../src/reconcile')

test('matches orders to payments by id and amount', () => {
  const { matched, unmatched } = matchOrders(
    [{ id: 'A1', amount: 10 }, { id: 'A2', amount: 20 }],
    [{ orderId: 'A1', amount: 10 }]
  )
  assert.equal(matched.length, 1)
  assert.equal(unmatched.length, 1)
  assert.equal(unmatched[0].id, 'A2')
})
