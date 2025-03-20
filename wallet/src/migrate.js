import 'dotenv/config';
import { db } from './db.js';

async function migrate() {
  try {
    // Create accounts table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS accounts (
        id VARCHAR(36) PRIMARY KEY,
        name TEXT NOT NULL,
        balance DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CHECK (balance >= 0)
      )
    `);

    // Create transactions table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS transactions (
        id VARCHAR(36) PRIMARY KEY,
        account_id VARCHAR(36),
        transaction_id VARCHAR(255) UNIQUE NOT NULL,
        type ENUM('topup', 'charge') NOT NULL,
        amount DECIMAL(12,2) NOT NULL,
        balance_after DECIMAL(12,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
        CHECK (amount > 0),
        CHECK (balance_after >= 0)
      )
    `);

    // Check if indexes exist before creating them
    const [rows] = await db.execute(`
      SELECT index_name FROM information_schema.statistics 
      WHERE table_schema = DATABASE() AND table_name = 'transactions' AND index_name = 'idx_transactions_account_id'
    `);

    if (rows.length === 0) {
      await db.execute('CREATE INDEX idx_transactions_account_id ON transactions(account_id)');
    }

    const [rows2] = await db.execute(`
      SELECT index_name FROM information_schema.statistics 
      WHERE table_schema = DATABASE() AND table_name = 'transactions' AND index_name = 'idx_transactions_transaction_id'
    `);

    if (rows2.length === 0) {
      await db.execute('CREATE INDEX idx_transactions_transaction_id ON transactions(transaction_id)');
    }

    console.log('Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
