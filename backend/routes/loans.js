const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// --- Helpers ---------------------------------------------------------------

function daysBetween(dateA, dateB) {
  const a = new Date(dateA);
  const b = new Date(dateB);
  return Math.max(0, (b - a) / (1000 * 60 * 60 * 24));
}

// Calculates interest owed as of today, plus totals & derived status.
function withComputedFields(loan) {
  const repayments = db
    .prepare('SELECT * FROM repayments WHERE loan_id = ? ORDER BY date ASC, id ASC')
    .all(loan.id);

  const totalRepaid = repayments.reduce((sum, r) => sum + r.amount, 0);

  let interestAccrued = 0;
  if (loan.interest_type !== 'none' && loan.interest_rate > 0) {
    const years = daysBetween(loan.date_borrowed, new Date().toISOString()) / 365;
    if (loan.interest_type === 'simple') {
      interestAccrued = loan.amount_borrowed * (loan.interest_rate / 100) * years;
    } else if (loan.interest_type === 'compound') {
      interestAccrued =
        loan.amount_borrowed * Math.pow(1 + loan.interest_rate / 100, years) -
        loan.amount_borrowed;
    }
  }

  const totalOwed = loan.amount_borrowed + interestAccrued;
  const outstandingBalance = Math.max(0, totalOwed - totalRepaid);

  // Auto-derive a display status without overriding an explicit "defaulted" flag
  let derivedStatus = loan.status;
  if (loan.status !== 'defaulted') {
    if (outstandingBalance <= 0.01) {
      derivedStatus = 'paid';
    } else if (totalRepaid > 0) {
      derivedStatus = 'partial';
    } else if (loan.due_date && new Date(loan.due_date) < new Date()) {
      derivedStatus = 'overdue';
    } else {
      derivedStatus = 'pending';
    }
  }

  return {
    ...loan,
    has_collateral: !!loan.has_collateral,
    repayments,
    totalRepaid: round2(totalRepaid),
    interestAccrued: round2(interestAccrued),
    totalOwed: round2(totalOwed),
    outstandingBalance: round2(outstandingBalance),
    derivedStatus,
  };
}

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

// --- Routes ------------------------------------------------------------

// List all loans belonging to the logged-in user (optionally filter by status or search borrower name)
router.get('/', (req, res) => {
  const { search, status } = req.query;
  let sql = 'SELECT * FROM loans WHERE user_id = ?';
  const params = [req.user.userId];

  if (search) {
    sql += ' AND borrower_name LIKE ?';
    params.push(`%${search}%`);
  }

  const loans = db.prepare(sql + ' ORDER BY date_borrowed DESC').all(...params);
  let computed = loans.map(withComputedFields);

  if (status) {
    computed = computed.filter((l) => l.derivedStatus === status);
  }

  res.json(computed);
});

// Get single loan with full repayment history (must belong to the logged-in user)
router.get('/:id', (req, res) => {
  const loan = db
    .prepare('SELECT * FROM loans WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.user.userId);
  if (!loan) return res.status(404).json({ error: 'Loan not found.' });
  res.json(withComputedFields(loan));
});

// Create a new loan record, owned by the logged-in user
router.post('/', (req, res) => {
  const b = req.body;
  if (!b.borrower_name || !b.amount_borrowed || !b.date_borrowed) {
    return res
      .status(400)
      .json({ error: 'Borrower name, amount borrowed, and date borrowed are required.' });
  }

  const info = db
    .prepare(
      `INSERT INTO loans (
        user_id, borrower_name, phone, email, address, id_proof,
        amount_borrowed, interest_rate, interest_type, date_borrowed, due_date,
        status, has_collateral, collateral_description, collateral_estimated_value, notes
      ) VALUES (@user_id, @borrower_name, @phone, @email, @address, @id_proof,
        @amount_borrowed, @interest_rate, @interest_type, @date_borrowed, @due_date,
        @status, @has_collateral, @collateral_description, @collateral_estimated_value, @notes)`
    )
    .run({ ...normalizeLoanInput(b), user_id: req.user.userId });

  const loan = db.prepare('SELECT * FROM loans WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(withComputedFields(loan));
});

// Update an existing loan record (must belong to the logged-in user)
router.put('/:id', (req, res) => {
  const existing = db
    .prepare('SELECT * FROM loans WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.user.userId);
  if (!existing) return res.status(404).json({ error: 'Loan not found.' });

  const merged = { ...existing, ...req.body, id: existing.id };

  db.prepare(
    `UPDATE loans SET
      borrower_name=@borrower_name, phone=@phone, email=@email, address=@address, id_proof=@id_proof,
      amount_borrowed=@amount_borrowed, interest_rate=@interest_rate, interest_type=@interest_type,
      date_borrowed=@date_borrowed, due_date=@due_date, status=@status,
      has_collateral=@has_collateral, collateral_description=@collateral_description,
      collateral_estimated_value=@collateral_estimated_value, notes=@notes,
      updated_at=datetime('now')
    WHERE id=@id AND user_id=@user_id`
  ).run({ ...normalizeLoanInput(merged), id: existing.id, user_id: req.user.userId });

  const loan = db.prepare('SELECT * FROM loans WHERE id = ?').get(existing.id);
  res.json(withComputedFields(loan));
});

// Delete a loan record (must belong to the logged-in user; repayments cascade)
router.delete('/:id', (req, res) => {
  const info = db
    .prepare('DELETE FROM loans WHERE id = ? AND user_id = ?')
    .run(req.params.id, req.user.userId);
  if (info.changes === 0) return res.status(404).json({ error: 'Loan not found.' });
  res.json({ success: true });
});

// Add a repayment entry to a loan (must belong to the logged-in user)
router.post('/:id/repayments', (req, res) => {
  const loan = db
    .prepare('SELECT * FROM loans WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.user.userId);
  if (!loan) return res.status(404).json({ error: 'Loan not found.' });

  const { amount, date, note } = req.body;
  if (!amount || !date) {
    return res.status(400).json({ error: 'Repayment amount and date are required.' });
  }

  db.prepare('INSERT INTO repayments (loan_id, amount, date, note) VALUES (?, ?, ?, ?)').run(
    loan.id,
    amount,
    date,
    note || null
  );

  const updated = db.prepare('SELECT * FROM loans WHERE id = ?').get(loan.id);
  res.status(201).json(withComputedFields(updated));
});

// Remove a repayment entry (only if the parent loan belongs to the logged-in user)
router.delete('/repayments/:repaymentId', (req, res) => {
  const repayment = db
    .prepare(
      `SELECT r.id FROM repayments r
       JOIN loans l ON l.id = r.loan_id
       WHERE r.id = ? AND l.user_id = ?`
    )
    .get(req.params.repaymentId, req.user.userId);
  if (!repayment) return res.status(404).json({ error: 'Repayment not found.' });

  db.prepare('DELETE FROM repayments WHERE id = ?').run(req.params.repaymentId);
  res.json({ success: true });
});

function normalizeLoanInput(b) {
  return {
    borrower_name: b.borrower_name,
    phone: b.phone || null,
    email: b.email || null,
    address: b.address || null,
    id_proof: b.id_proof || null,
    amount_borrowed: Number(b.amount_borrowed) || 0,
    interest_rate: Number(b.interest_rate) || 0,
    interest_type: b.interest_type || 'none',
    date_borrowed: b.date_borrowed,
    due_date: b.due_date || null,
    status: b.status || 'pending',
    has_collateral: b.has_collateral ? 1 : 0,
    collateral_description: b.collateral_description || null,
    collateral_estimated_value: b.collateral_estimated_value
      ? Number(b.collateral_estimated_value)
      : null,
    notes: b.notes || null,
  };
}

module.exports = router;
