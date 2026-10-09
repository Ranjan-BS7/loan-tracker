import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { api } from '../api.js';

const EMPTY_LOAN = {
  borrower_name: '',
  phone: '',
  email: '',
  address: '',
  id_proof: '',
  amount_borrowed: '',
  interest_rate: '0',
  interest_type: 'none',
  date_borrowed: new Date().toISOString().slice(0, 10),
  due_date: '',
  status: 'pending',
  has_collateral: false,
  collateral_description: '',
  collateral_estimated_value: '',
  notes: '',
};

export default function LoanForm({ mode }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY_LOAN);
  const [loading, setLoading] = useState(mode === 'edit');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (mode === 'edit') {
      api
        .getLoan(id)
        .then((loan) =>
          setForm({
            ...loan,
            amount_borrowed: String(loan.amount_borrowed),
            interest_rate: String(loan.interest_rate),
            collateral_estimated_value: loan.collateral_estimated_value
              ? String(loan.collateral_estimated_value)
              : '',
          })
        )
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    }
  }, [id, mode]);

  const update = (field) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      if (mode === 'create') {
        const created = await api.createLoan(form);
        navigate(`/loans/${created.id}`);
      } else {
        await api.updateLoan(id, form);
        navigate(`/loans/${id}`);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="page">Loading…</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>{mode === 'create' ? 'Add New Loan Record' : 'Edit Loan Record'}</h1>
        <Link to={mode === 'create' ? '/' : `/loans/${id}`} className="btn btn-ghost">
          Cancel
        </Link>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <form className="card form-card" onSubmit={handleSubmit}>
        <h2>Borrower Information</h2>
        <div className="form-grid">
          <label>
            Full Name *
            <input value={form.borrower_name} onChange={update('borrower_name')} required />
          </label>
          <label>
            Phone
            <input value={form.phone} onChange={update('phone')} />
          </label>
          <label>
            Email
            <input type="email" value={form.email} onChange={update('email')} />
          </label>
          <label>
            ID Proof / Reference
            <input
              value={form.id_proof}
              onChange={update('id_proof')}
              placeholder="e.g. Aadhar / Passport ref"
            />
          </label>
          <label className="span-2">
            Address
            <textarea value={form.address} onChange={update('address')} rows={2} />
          </label>
        </div>

        <h2>Loan Terms</h2>
        <div className="form-grid">
          <label>
            Amount Borrowed (₹) *
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.amount_borrowed}
              onChange={update('amount_borrowed')}
              required
            />
          </label>
          <label>
            Interest Type
            <select value={form.interest_type} onChange={update('interest_type')}>
              <option value="none">No Interest</option>
              <option value="simple">Simple Interest</option>
              <option value="compound">Compound Interest</option>
            </select>
          </label>
          <label>
            Interest Rate (% per year)
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.interest_rate}
              onChange={update('interest_rate')}
              disabled={form.interest_type === 'none'}
            />
          </label>
          <label>
            Date Borrowed *
            <input type="date" value={form.date_borrowed} onChange={update('date_borrowed')} required />
          </label>
          <label>
            Expected Return Date
            <input type="date" value={form.due_date} onChange={update('due_date')} />
          </label>
          <label>
            Status
            <select value={form.status} onChange={update('status')}>
              <option value="pending">Pending</option>
              <option value="partial">Partially Paid</option>
              <option value="paid">Fully Paid</option>
              <option value="overdue">Overdue</option>
              <option value="defaulted">Defaulted</option>
            </select>
          </label>
        </div>

        <h2>Collateral / Fallback Security</h2>
        <p className="hint">
          If they're unable to repay, note any property or asset you've agreed can be claimed
          instead.
        </p>
        <div className="form-grid">
          <label className="checkbox-row span-2">
            <input
              type="checkbox"
              checked={form.has_collateral}
              onChange={update('has_collateral')}
            />
            Collateral / security was agreed for this loan
          </label>
          {form.has_collateral && (
            <>
              <label className="span-2">
                Collateral Description
                <textarea
                  value={form.collateral_description}
                  onChange={update('collateral_description')}
                  rows={2}
                  placeholder="e.g. Gold jewelry, vehicle registration, land document details"
                />
              </label>
              <label>
                Estimated Value (₹)
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.collateral_estimated_value}
                  onChange={update('collateral_estimated_value')}
                />
              </label>
            </>
          )}
        </div>

        <h2>Notes</h2>
        <label className="span-2">
          Additional Notes
          <textarea
            value={form.notes}
            onChange={update('notes')}
            rows={3}
            placeholder="Any other details worth remembering"
          />
        </label>

        <div className="form-actions">
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? 'Saving…' : mode === 'create' ? 'Save Record' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
