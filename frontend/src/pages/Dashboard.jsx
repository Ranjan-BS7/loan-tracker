import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';

const STATUS_LABEL = {
  pending: 'Pending',
  partial: 'Partially Paid',
  paid: 'Fully Paid',
  overdue: 'Overdue',
  defaulted: 'Defaulted',
};

export default function Dashboard() {
  const [loans, setLoans] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    const params = {};
    if (search) params.search = search;
    if (status) params.status = status;
    api
      .getLoans(params)
      .then(setLoans)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const t = setTimeout(load, 250); // debounce search typing
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status]);

  const totals = loans.reduce(
    (acc, l) => {
      acc.lent += l.amount_borrowed;
      acc.outstanding += l.outstandingBalance;
      return acc;
    },
    { lent: 0, outstanding: 0 }
  );

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Your Lending Records</h1>
          <p className="subtitle">Track who owes you money, terms, and repayment status.</p>
        </div>
        <Link to="/loans/new" className="btn btn-primary">
          + Add New Loan
        </Link>
      </div>

      <div className="summary-cards">
        <div className="card summary-card">
          <span className="summary-label">Total Records</span>
          <span className="summary-value">{loans.length}</span>
        </div>
        <div className="card summary-card">
          <span className="summary-label">Total Lent</span>
          <span className="summary-value">₹{totals.lent.toLocaleString()}</span>
        </div>
        <div className="card summary-card">
          <span className="summary-label">Total Outstanding</span>
          <span className="summary-value summary-warn">
            ₹{totals.outstanding.toLocaleString()}
          </span>
        </div>
      </div>

      <div className="toolbar">
        <input
          className="search-input"
          placeholder="Search by borrower name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {loading ? (
        <p>Loading…</p>
      ) : loans.length === 0 ? (
        <div className="empty-state card">
          <p>No loan records yet.</p>
          <Link to="/loans/new" className="btn btn-primary">
            Add your first record
          </Link>
        </div>
      ) : (
        <div className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th>Borrower</th>
                <th>Amount Lent</th>
                <th>Interest</th>
                <th>Date Borrowed</th>
                <th>Due Date</th>
                <th>Outstanding</th>
                <th>Status</th>
                <th>Collateral</th>
              </tr>
            </thead>
            <tbody>
              {loans.map((loan) => (
                <tr key={loan.id}>
                  <td>
                    <Link to={`/loans/${loan.id}`} className="row-link">
                      {loan.borrower_name}
                    </Link>
                  </td>
                  <td>₹{loan.amount_borrowed.toLocaleString()}</td>
                  <td>
                    {loan.interest_type === 'none'
                      ? '—'
                      : `${loan.interest_rate}% / yr (${loan.interest_type})`}
                  </td>
                  <td>{loan.date_borrowed}</td>
                  <td>{loan.due_date || '—'}</td>
                  <td>₹{loan.outstandingBalance.toLocaleString()}</td>
                  <td>
                    <span className={`badge badge-${loan.derivedStatus}`}>
                      {STATUS_LABEL[loan.derivedStatus]}
                    </span>
                  </td>
                  <td>{loan.has_collateral ? '✓' : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
