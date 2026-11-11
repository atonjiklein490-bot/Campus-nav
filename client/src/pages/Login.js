import React, { useState } from 'react';
import { loginUser } from '../services/api';

const Login = ({ onSwitch }) => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await loginUser(formData);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      setMessage('✅ Login successful!');
      window.location.reload();
    } catch (err) {
      setMessage(err.response?.data?.message || '❌ Login failed.');
    }
    setLoading(false);
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>🏫 Campus Nav</h2>
        <h3 style={styles.subtitle}>Welcome Back</h3>
        {message && <p style={styles.message}>{message}</p>}
        <form onSubmit={handleSubmit}>
          <input style={styles.input} type="email" name="email"
            placeholder="Email Address" value={formData.email} onChange={handleChange} required />
          <input style={styles.input} type="password" name="password"
            placeholder="Password" value={formData.password} onChange={handleChange} required />
          <button style={styles.button} type="submit" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        <p style={styles.switchText}>
          Don't have an account?{' '}
          <span style={styles.link} onClick={onSwitch}>Register here</span>
        </p>
      </div>
    </div>
  );
};

const styles = {
  container: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f0f4f8' },
  card: { backgroundColor: '#fff', padding: '40px', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', width: '100%', maxWidth: '400px' },
  title: { textAlign: 'center', color: '#1A3A6B', marginBottom: '5px' },
  subtitle: { textAlign: 'center', color: '#555', marginBottom: '20px', fontWeight: 'normal' },
  message: { textAlign: 'center', color: '#2E5596', marginBottom: '10px' },
  input: { width: '100%', padding: '12px', marginBottom: '15px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px', boxSizing: 'border-box' },
  button: { width: '100%', padding: '12px', backgroundColor: '#1A3A6B', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '16px', cursor: 'pointer' },
  switchText: { textAlign: 'center', marginTop: '15px', color: '#555', fontSize: '14px' },
  link: { color: '#2E5596', cursor: 'pointer', fontWeight: 'bold' },
};

export default Login;