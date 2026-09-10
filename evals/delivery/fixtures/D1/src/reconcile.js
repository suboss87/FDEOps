'use strict'

// Deterministic order/payment matching. Unmatched rows enter a review queue.
const queue = []

function matchOrders(orders, payments) {
  const byId = new Map(payments.map(p => [p.orderId, p]))
  const matched = []
  const unmatched = []
  for (const order of orders) {
    const payment = byId.get(order.id)
    if (payment && payment.amount === order.amount) matched.push({ order, payment })
    else unmatched.push(order)
  }
  return { matched, unmatched }
}

function enqueueReview(orders) {
  for (const order of orders) queue.push({ orderId: order.id, reason: 'unmatched', at: Date.now() })
  return queue.slice()
}

module.exports = { matchOrders, enqueueReview, queue }
