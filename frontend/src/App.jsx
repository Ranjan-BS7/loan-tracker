import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate, Link } from 'react-router-dom';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import LoanForm from './pages/LoanForm.jsx';
import LoanDetail from './pages/LoanDetail.jsx';

function useAuth() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [username, setUsername] = useState(localStorage.getItem('username'));

  const login = (t, u) => {
    localStorage.setItem('token', t);
    localStorage.setItem('username', u);
    setToken(t);
    setUsername(u);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    setToken(null);
    setUsername(null);
  };

  return { token, username, login, logout };
}

function ProtectedRoute({ token, children }) {
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  const auth = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    auth.logout();
    navigate('/login');
  };

  return (
    <div className="app-shell">
      {auth.token && (
        <header className="topbar">
          <Link to="/" className="brand">
            💰 Loan Tracker
          </Link>
          <div className="topbar-right">
            <span className="user-chip">{auth.username}</span>
            <button className="btn btn-ghost" onClick={handleLogout}>
              Log out
            </button>
          </div>
        </header>
      )}

      <main className="content">
        <Routes>
          <Route path="/login" element={<Login onAuth={auth.login} token={auth.token} />} />
          <Route
            path="/"
            element={
              <ProtectedRoute token={auth.token}>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/loans/new"
            element={
              <ProtectedRoute token={auth.token}>
                <LoanForm mode="create" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/loans/:id"
            element={
              <ProtectedRoute token={auth.token}>
                <LoanDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/loans/:id/edit"
            element={
              <ProtectedRoute token={auth.token}>
                <LoanForm mode="edit" />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
