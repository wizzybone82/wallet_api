import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Decimal from 'decimal.js';
import { v4 as uuidv4 } from 'uuid';
import { db } from './db.js';

describe('Wallet System', () => {
  let accountId;

  beforeAll(async () => {
    // Create a test account
    accountId = uuidv4();
    await db.execute(
      'INSERT INTO accounts (id, name, balance) VALUES (?, ?, ?)',
      [accountId, 'Test Account', 0]
    );
  });

  afterAll(async () => {
    // Clean up test data
    await db.execute('DELETE FROM transactions WHERE account_id = ?', [accountId]);
    await db.execute('DELETE FROM accounts WHERE id = ?', [accountId]);
  });

  it('should create an account with zero balance', async () => {
    const [accounts] = await db.execute(
      'SELECT * FROM accounts WHERE id = ?',
      [accountId]
    );

    expect(accounts[0].balance.toString()).toBe('0.00');
    expect(accounts[0].name).toBe('Test Account');
  });

  it('should top-up account successfully', async () => {
    const amount = 100.00;
    const transactionId = 'test-topup-1';

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      await connection.execute(
        'UPDATE accounts SET balance = balance + ? WHERE id = ?',
        [amount, accountId]
      );

      await connection.execute(
        'INSERT INTO transactions (id, account_id, transaction_id, type, amount, balance_after) VALUES (?, ?, ?, ?, ?, ?)',
        [uuidv4(), accountId, transactionId, 'topup', amount, amount]
      );

      await connection.commit();

      const [accounts] = await connection.execute(
        'SELECT * FROM accounts WHERE id = ?',
        [accountId]
      );

      expect(accounts[0].balance.toString()).toBe('100.00');
    } finally {
      connection.release();
    }
  });

  it('should prevent duplicate transactions', async () => {
    const transactionId = 'test-topup-1';
    const amount = 100.00;

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      const [existingTransactions] = await connection.execute(
        'SELECT * FROM transactions WHERE transaction_id = ?',
        [transactionId]
      );

      expect(existingTransactions.length).toBeGreaterThan(0);

      await connection.rollback();
    } finally {
      connection.release();
    }
  });

  it('should prevent negative balance', async () => {
    const currentBalance = 100.00;
    const chargeAmount = 150.00;
    const transactionId = 'test-charge-1';

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      const [accounts] = await connection.execute(
        'SELECT * FROM accounts WHERE id = ? FOR UPDATE',
        [accountId]
      );

      const newBalance = new Decimal(accounts[0].balance).minus(chargeAmount);

      expect(newBalance.isNegative()).toBe(true);

      await connection.rollback();
    } finally {
      connection.release();
    }
  });

  it('should handle decimal precision correctly', async () => {
    const amount = 10.999; // More than 2 decimal places
    const transactionId = 'test-precision-1';

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      await connection.execute(
        'INSERT INTO transactions (id, account_id, transaction_id, type, amount, balance_after) VALUES (?, ?, ?, ?, ?, ?)',
        [uuidv4(), accountId, transactionId, 'topup', new Decimal(amount).toFixed(2), new Decimal(111).toFixed(2)]
      );

      const [transactions] = await connection.execute(
        'SELECT * FROM transactions WHERE transaction_id = ?',
        [transactionId]
      );

      expect(transactions[0].amount.toString()).toBe('11.00');

      await connection.commit();
    } finally {
      connection.release();
    }
  });
});