const PaymentTransaction = require('../models/PaymentTransaction');
const paymentGatewayService = require('./PaymentGatewayService');
const logger = require('../utils/logger');

const getTransactionCapturedAmount = (transaction) => {
  if (!transaction) return 0;
  if (typeof transaction.getCapturedAmount === 'function') {
    return Math.max(0, Number(transaction.getCapturedAmount()) || 0);
  }

  return Math.max(0, (Number(transaction.amount) || 0) - (Number(transaction.discount) || 0));
};

const getTransactionRefundedAmount = (transaction) => {
  if (!transaction) return 0;

  const explicitRefundedAmount = Math.max(0, Number(transaction.refundedAmount) || 0);
  if (explicitRefundedAmount > 0) return explicitRefundedAmount;

  if (transaction.status === 'refunded') {
    return getTransactionCapturedAmount(transaction);
  }

  return 0;
};

const getTransactionRefundableAmount = (transaction) => {
  if (!transaction) return 0;

  if (typeof transaction.getRefundableAmount === 'function') {
    return Math.max(0, Number(transaction.getRefundableAmount()) || 0);
  }

  return Math.max(0, getTransactionCapturedAmount(transaction) - getTransactionRefundedAmount(transaction));
};

const getActualRefundedAmountFromTransactions = (transactions = []) => {
  return (Array.isArray(transactions) ? transactions : []).reduce(
    (sum, transaction) => sum + getTransactionRefundedAmount(transaction),
    0
  );
};

const syncInvoiceRefundState = (invoice, targetRefundAmount, actualRefundedAmount, hadGatewayFailure = false) => {
  const targetAmount = Math.max(0, Number(targetRefundAmount) || 0);
  const refundedAmount = Math.max(0, Number(actualRefundedAmount) || 0);

  invoice.refundAmount = Math.max(Number(invoice.refundAmount) || 0, targetAmount, refundedAmount);

  if (refundedAmount <= 0) {
    if (targetAmount > 0 && hadGatewayFailure) {
      invoice.refundStatus = 'failed';
    } else if (targetAmount > 0 && (invoice.refundStatus === 'none' || !invoice.refundStatus)) {
      invoice.refundStatus = 'pending';
    }
    return;
  }

  if (targetAmount <= 0 || refundedAmount >= targetAmount) {
    invoice.refundStatus = 'refunded';
    invoice.refundedAt = invoice.refundedAt || new Date();
    if (invoice.returnStatus === 'received' || invoice.returnStatus === 'approved') {
      invoice.returnStatus = 'refunded';
    }
    return;
  }

  invoice.refundStatus = 'partially_refunded';
  invoice.refundedAt = invoice.refundedAt || new Date();
};

class RefundService {
  async refundInvoicePayments(invoice, { amount = null, reason = '', userId = null, metadata = {} } = {}) {
    const transactions = await PaymentTransaction.find({
      invoice: invoice._id,
      tenant: invoice.tenant,
      status: { $in: ['success', 'refunded'] },
    }).sort({ completedAt: -1, createdAt: -1 });

    const actualRefundedBefore = getActualRefundedAmountFromTransactions(transactions);
    const targetRefundAmount = Math.max(
      0,
      Number(amount == null ? (Number(invoice.refundAmount) || 0) - actualRefundedBefore : amount) || 0
    );

    if (targetRefundAmount <= 0) {
      syncInvoiceRefundState(invoice, Number(invoice.refundAmount) || 0, actualRefundedBefore, false);
      return {
        mode: transactions.length ? 'gateway' : 'manual',
        requestedAmount: 0,
        executedAmount: 0,
        outstandingAmount: 0,
        actualRefundedAmount: actualRefundedBefore,
        transactionRefunds: [],
        errors: [],
      };
    }

    let remaining = targetRefundAmount;
    const transactionRefunds = [];
    const errors = [];
    const manualFallbacks = [];

    for (const transaction of transactions) {
      if (remaining <= 0) break;

      const refundableAmount = getTransactionRefundableAmount(transaction);
      if (refundableAmount <= 0) continue;

      const currentRefundAmount = Math.min(remaining, refundableAmount);

      try {
        const refundResult = await paymentGatewayService.refundTransaction(transaction, {
          amount: currentRefundAmount,
          reason: reason || 'Order refund',
          userId,
          metadata,
        });

        if (!refundResult?.processed) {
          manualFallbacks.push({
            transactionId: transaction._id,
            gateway: transaction.gateway,
            amount: currentRefundAmount,
            reason: refundResult?.reason || 'Manual refund required',
          });
          continue;
        }

        transactionRefunds.push({
          transactionId: transaction._id,
          gateway: transaction.gateway,
          amount: refundResult.amount || currentRefundAmount,
        });

        remaining -= refundResult.amount || currentRefundAmount;
      } catch (error) {
        logger.error('Refund execution failed', {
          transactionId: transaction._id?.toString?.(),
          invoiceId: invoice._id?.toString?.(),
          message: error.message,
        });

        errors.push({
          transactionId: transaction._id,
          message: error.message,
        });
      }
    }

    const actualRefundedAfter = actualRefundedBefore + transactionRefunds.reduce((sum, item) => sum + item.amount, 0);
    const desiredRefundAmount = Math.max(
      Number(invoice.refundAmount) || 0,
      actualRefundedBefore + targetRefundAmount
    );

    syncInvoiceRefundState(
      invoice,
      desiredRefundAmount,
      actualRefundedAfter,
      errors.length > 0 && transactionRefunds.length === 0 && manualFallbacks.length === 0
    );

    return {
      mode: transactionRefunds.length > 0 ? 'gateway' : 'manual',
      requestedAmount: targetRefundAmount,
      executedAmount: transactionRefunds.reduce((sum, item) => sum + item.amount, 0),
      outstandingAmount: Math.max(0, targetRefundAmount - transactionRefunds.reduce((sum, item) => sum + item.amount, 0)),
      actualRefundedAmount: actualRefundedAfter,
      transactionRefunds,
      manualFallbacks,
      errors,
    };
  }
}

module.exports = new RefundService();
module.exports.getActualRefundedAmountFromTransactions = getActualRefundedAmountFromTransactions;
module.exports.getTransactionRefundableAmount = getTransactionRefundableAmount;
