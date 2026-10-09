import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { api } from '../api.js';

export default function Login({ onAuth, token }) {
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  if (token) return <Navigate to="/" replace />;

  const isSignup = mode === 'signup';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (isSignup && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const result = isSignup
        ? await api.register(username, password)
        : await api.login(username, password);
      onAuth(result.token, result.username);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setMode(isSignup ? 'login' : 'signup');
    setError('');
    setPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="centered-page">
      <form className="card auth-card" onSubmit={handleSubmit}>
        <h1>💰 Loan Tracker</h1>
        <p className="subtitle">
          {isSignup
            ? 'Create your own account. Your loan records are private to your login.'
            : 'Log in to view and manage your lending records.'}
        </p>

        {error && <div className="alert alert-error">{error}</div>}

        <label>
          Username
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            minLength={3}
            autoFocus
          />
        </label>

        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
        </label>

        {isSignup && (
          <label>
            Confirm Password
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
            />
          </label>
        )}

        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? 'Please wait…' : isSignup ? 'Create Account' : 'Log In'}
        </button>

        <button type="button" className="btn btn-ghost auth-switch" onClick={switchMode}>
          {isSignup ? 'Already have an account? Log in' : "Don't have an account? Sign up"}
        </button>
      </form>
    </div>
  );
}
