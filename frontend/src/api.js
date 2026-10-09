const BASE = '/api';

function getToken() {
  return localStorage.getItem('token');
}

async function request(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || 'Something went wrong. Please try again.');
  }
  return data;
}

export const api = {
  register: (username, password) =>
    request('/auth/register', { method: 'POST', body: { username, password } }),
  login: (username, password) =>
    request('/auth/login', { method: 'POST', body: { username, password } }),

  getLoans: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/loans${qs ? `?${qs}` : ''}`);
  },
  getLoan: (id) => request(`/loans/${id}`),
  createLoan: (loan) => request('/loans', { method: 'POST', body: loan }),
  updateLoan: (id, loan) => request(`/loans/${id}`, { method: 'PUT', body: loan }),
  deleteLoan: (id) => request(`/loans/${id}`, { method: 'DELETE' }),

  addRepayment: (loanId, repayment) =>
    request(`/loans/${loanId}/repayments`, { method: 'POST', body: repayment }),
  deleteRepayment: (repaymentId) =>
    request(`/loans/repayments/${repaymentId}`, { method: 'DELETE' }),
};
