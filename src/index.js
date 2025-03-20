import 'dotenv/config';
import express from 'express';
import { body, validationResult } from 'express-validator';
import Decimal from 'decimal.js';
import { v4 as uuidv4 } from 'uuid';
import { db } from './db.js';

const app = express();
app.use(express.json());

// Middleware for validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Create Account
app.post(
  '/accounts',
  body('name').trim().notEmpty().withMessage('Name is required'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { name } = req.body;
      const id = uuidv4();
      
      const [result] = await db.execute(
        'INSERT INTO accounts (id, name, balance) VALUES (?, ?, ?)',
        [id, name, 0]
      );

      const [account] = await db.execute(
        'SELECT * FROM accounts WHERE id = ?',
        [id]
      );

      res.status(201).json(account[0]);
    } catch (error) {
      console.error('Error creating account:', error);
      res.status(500).json({ error: 'Failed to create account' });
    }
  }
);

// Top-up Account
app.post(
  '/accounts/:id/topup',
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be greater than 0'),
  body('transactionId').notEmpty().withMessage('Transaction ID is required'),
  handleValidationErrors,
  async (req, res) => {
    const connection = await db.getConnection();
    try {
      const { id } = req.params;
      const { amount, transactionId } = req.body;

      await connection.beginTransaction();

      // Check for duplicate transaction
      const [existingTransactions] = await connection.execute(
        'SELECT * FROM transactions WHERE transaction_id = ?',
        [transactionId]
      );

      if (existingTransactions.length > 0) {
        await connection.rollback();
        return res.status(409).json({ error: 'Duplicate transaction' });
      }

      // Get current balance
      const [accounts] = await connection.execute(
        'SELECT * FROM accounts WHERE id = ? FOR UPDATE',
        [id]
      );

      if (accounts.length === 0) {
        await connection.rollback();
        return res.status(404).json({ error: 'Account not found' });
      }

      const account = accounts[0];
      const newBalance = new Decimal(account.balance).plus(amount).toFixed(2);

      // Update balance
      await connection.execute(
        'UPDATE accounts SET balance = ? WHERE id = ?',
        [newBalance, id]
      );

      // Record transaction
      await connection.execute(
        'INSERT INTO transactions (id, account_id, transaction_id, type, amount, balance_after) VALUES (?, ?, ?, ?, ?, ?)',
        [uuidv4(), id, transactionId, 'topup', amount, newBalance]
      );

      await connection.commit();

      const [updatedAccount] = await connection.execute(
        'SELECT * FROM accounts WHERE id = ?',
        [id]
      );

      res.json(updatedAccount[0]);
    } catch (error) {
      await connection.rollback();
      console.error('Error processing top-up:', error);
      res.status(500).json({ error: 'Failed to process top-up' });
    } finally {
      connection.release();
    }
  }
);

// Charge Account
app.post(
  '/accounts/:id/charge',
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be greater than 0'),
  body('transactionId').notEmpty().withMessage('Transaction ID is required'),
  handleValidationErrors,
  async (req, res) => {
    const connection = await db.getConnection();
    try {
      const { id } = req.params;
      const { amount, transactionId } = req.body;

      await connection.beginTransaction();

      // Check for duplicate transaction
      const [existingTransactions] = await connection.execute(
        'SELECT * FROM transactions WHERE transaction_id = ?',
        [transactionId]
      );

      if (existingTransactions.length > 0) {
        await connection.rollback();
        return res.status(409).json({ error: 'Duplicate transaction' });
      }

      // Get current balance
      const [accounts] = await connection.execute(
        'SELECT * FROM accounts WHERE id = ? FOR UPDATE',
        [id]
      );

      if (accounts.length === 0) {
        await connection.rollback();
        return res.status(404).json({ error: 'Account not found' });
      }

      const account = accounts[0];
      const newBalance = new Decimal(account.balance).minus(amount);

      if (newBalance.isNegative()) {
        await connection.rollback();
        return res.status(400).json({ error: 'Insufficient funds' });
      }

      // Update balance
      await connection.execute(
        'UPDATE accounts SET balance = ? WHERE id = ?',
        [newBalance.toFixed(2), id]
      );

      // Record transaction
      await connection.execute(
        'INSERT INTO transactions (id, account_id, transaction_id, type, amount, balance_after) VALUES (?, ?, ?, ?, ?, ?)',
        [uuidv4(), id, transactionId, 'charge', amount, newBalance.toFixed(2)]
      );

      await connection.commit();

      const [updatedAccount] = await connection.execute(
        'SELECT * FROM accounts WHERE id = ?',
        [id]
      );

      res.json(updatedAccount[0]);
    } catch (error) {
      await connection.rollback();
      console.error('Error processing charge:', error);
      res.status(500).json({ error: 'Failed to process charge' });
    } finally {
      connection.release();
    }
  }
);

// Get Account Balance
app.get('/accounts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const [accounts] = await db.execute(
      'SELECT * FROM accounts WHERE id = ?',
      [id]
    );

    if (accounts.length === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }

    res.json(accounts[0]);
  } catch (error) {
    console.error('Error fetching account:', error);
    res.status(500).json({ error: 'Failed to fetch account' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});