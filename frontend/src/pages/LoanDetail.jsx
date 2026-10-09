import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api.js';

const STATUS_LABEL = {
  pending: 'Pending',
  partial: 'Partially Paid',
  paid: 'Fully Paid',
  overdue: 'Overdue',
  defaulted: 'Defaulted',
};

export default function LoanDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loan, setLoan] = useState(null);
  const [error, setError] = useState('');
  const [repayAmount, setRepayAmount] = useState('');
  const [repayDate, setRepayDate] = useState(new Date().toISOString().slice(0, 10));
  const [repayNote, setRepayNote] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => {
    api.getLoan(id).then(setLoan).catch((e) => setError(e.message));
  };

  useEffect(load, [id]);

  const handleAddRepayment = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.addRepayment(id, { amount: Number(repayAmount), date: repayDate, note: repayNote });
      setRepayAmount('');
      setRepayNote('');
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteRepayment = async (repaymentId) => {
    if (!confirm('Remove this repayment entry?')) return;
    await api.deleteRepayment(repaymentId);
    load();
  };

  const handleDeleteLoan = async () => {
    if (!confirm(`Delete the loan record for ${loan.borrower_name}? This cannot be undone.`)) return;
    await api.deleteLoan(id);
    navigate('/');
  };

  if (error) return <div className="page"><div className="alert alert-error">{error}</div></div>;
  if (!loan) return <div className="page">Loading…</div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>{loan.borrower_name}</h1>
          <span className={`badge badge-${loan.derivedStatus}`}>
            {STATUS_LABEL[loan.derivedStatus]}
          </span>
        </div>
        <div className="button-row">
          <Link to={`/loans/${id}/edit`} className="btn btn-secondary">
            Edit
          </Link>
          <button className="btn btn-danger" onClick={handleDeleteLoan}>
            Delete
          </button>
        </div>
      </div>

      <div className="detail-grid">
        <div className="card">
          <h2>Borrower Information</h2>
          <dl className="detail-list">
            <dt>Phone</dt>
            <dd>{loan.phone || '—'}</dd>
            <dt>Email</dt>
            <dd>{loan.email || '—'}</dd>
            <dt>Address</dt>
            <dd>{loan.address || '—'}</dd>
            <dt>ID Proof / Reference</dt>
            <dd>{loan.id_proof || '—'}</dd>
          </dl>
        </div>

        <div className="card">
          <h2>Loan Terms</h2>
          <dl className="detail-list">
            <dt>Amount Borrowed</dt>
            <dd>₹{loan.amount_borrowed.toLocaleString()}</dd>
            <dt>Interest</dt>
            <dd>
              {loan.interest_type === 'none'
                ? 'No interest'
                : `${loan.interest_rate}% / yr (${loan.interest_type})`}
            </dd>
            <dt>Interest Accrued to Date</dt>
            <dd>₹{loan.interestAccrued.toLocaleString()}</dd>
            <dt>Date Borrowed</dt>
            <dd>{loan.date_borrowed}</dd>
            <dt>Expected Return Date</dt>
            <dd>{loan.due_date || '—'}</dd>
          </dl>
        </div>

        <div className="card summary-highlight">
          <h2>Balance</h2>
          <dl className="detail-list">
            <dt>Total Owed (incl. interest)</dt>
            <dd>₹{loan.totalOwed.toLocaleString()}</dd>
            <dt>Total Repaid</dt>
            <dd>₹{loan.totalRepaid.toLocaleString()}</dd>
            <dt>Outstanding Balance</dt>
            <dd className="outstanding-amount">₹{loan.outstandingBalance.toLocaleString()}</dd>
          </dl>
        </div>

        {loan.has_collateral && (
          <div className="card">
            <h2>Collateral / Fallback Security</h2>
            <dl className="detail-list">
              <dt>Description</dt>
              <dd>{loan.collateral_description || '—'}</dd>
              <dt>Estimated Value</dt>
              <dd>
                {loan.collateral_estimated_value
                  ? `₹${loan.collateral_estimated_value.toLocaleString()}`
                  : '—'}
              </dd>
            </dl>
            <p className="hint">
              If this loan defaults, this is the asset you agreed can be claimed toward the debt.
            </p>
          </div>
        )}

        {loan.notes && (
          <div className="card span-2">
            <h2>Notes</h2>
            <p>{loan.notes}</p>
          </div>
        )}
      </div>

      <div className="card">
        <h2>Repayment History</h2>
        {loan.repayments.length === 0 ? (
          <p className="hint">No repayments recorded yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Amount</th>
                <th>Note</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loan.repayments.map((r) => (
                <tr key={r.id}>
                  <td>{r.date}</td>
                  <td>₹{r.amount.toLocaleString()}</td>
                  <td>{r.note || '—'}</td>
                  <td>
                    <button className="btn-link-danger" onClick={() => handleDeleteRepayment(r.id)}>
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <form className="repayment-form" onSubmit={handleAddRepayment}>
          <label>
            Amount
            <input
              type="number"
              step="0.01"
              min="0"
              value={repayAmount}
              onChange={(e) => setRepayAmount(e.target.value)}
              required
            />
          </label>
          <label>
            Date
            <input type="date" value={repayDate} onChange={(e) => setRepayDate(e.target.value)} required />
          </label>
          <label className="grow">
            Note
            <input value={repayNote} onChange={(e) => setRepayNote(e.target.value)} placeholder="optional" />
          </label>
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? 'Adding…' : 'Add Repayment'}
          </button>
        </form>
      </div>
    </div>
  );
}
