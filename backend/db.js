const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'loan-tracker.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// --- Schema ---------------------------------------------------------------

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS loans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,

  -- Borrower information
  borrower_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  id_proof TEXT,              -- e.g. "Aadhar 1234-XXXX", optional reference note

  -- Loan terms
  amount_borrowed REAL NOT NULL,
  interest_rate REAL DEFAULT 0,        -- annual percentage, 0 = no interest
  interest_type TEXT DEFAULT 'none',   -- none | simple | compound
  date_borrowed TEXT NOT NULL,         -- ISO date
  due_date TEXT,                       -- ISO date, optional

  -- Status & tracking
  status TEXT DEFAULT 'pending',       -- pending | partial | paid | overdue | defaulted

  -- Collateral / security (fallback if money isn't returned)
  has_collateral INTEGER DEFAULT 0,    -- 0/1
  collateral_description TEXT,
  collateral_estimated_value REAL,

  -- Free text
  notes TEXT,

  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS repayments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  loan_id INTEGER NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
  amount REAL NOT NULL,
  date TEXT NOT NULL,
  note TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_repayments_loan_id ON repayments(loan_id);
`);

// --- Migration: older single-user databases won't have a user_id column on
// loans yet. Add it and assign any existing (ownerless) loans to the first
// account, so nobody's existing data disappears when upgrading.
const loanColumns = db.prepare('PRAGMA table_info(loans)').all();
const hasUserId = loanColumns.some((col) => col.name === 'user_id');
if (loanColumns.length > 0 && !hasUserId) {
  db.exec('ALTER TABLE loans ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE');
  const firstUser = db.prepare('SELECT id FROM users ORDER BY id ASC LIMIT 1').get();
  if (firstUser) {
    db.prepare('UPDATE loans SET user_id = ? WHERE user_id IS NULL').run(firstUser.id);
  }
}

db.exec('CREATE INDEX IF NOT EXISTS idx_loans_user_id ON loans(user_id)');

module.exports = db;
