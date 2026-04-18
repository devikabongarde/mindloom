import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/api/auth/login', form);
      login(data.token, data.user);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="theme-shell min-h-screen flex items-center justify-center px-4 py-10">
      <div className="theme-card w-full max-w-[420px] mx-4 p-10 rounded-[24px] shadow-[0_20px_40px_rgba(26,26,46,0.1)]">
        <div className="theme-card-content">
        <div className="flex items-center gap-2 mb-6">
          <img
            src="/logo-white.png"
            alt="ShelfLife logo"
            className="w-7 h-7 rounded-full object-cover shadow-sm shadow-slate-400/30"
          />
          <span className="font-bold text-lg bg-gradient-to-r from-[#F4845F] to-[#E8617A] bg-clip-text text-transparent font-['Sora']">
            SHELFLIFE
          </span>
        </div>

        <h1 className="theme-hero-title text-2xl font-bold mb-1">Welcome back</h1>
        <p className="theme-muted text-sm mb-6">Pick up where you left off</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            name="email"
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
            required
            className="theme-input w-full px-4 py-3 rounded-xl text-sm"
          />
          <input
            name="password"
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            required
            className="theme-input w-full px-4 py-3 rounded-xl text-sm"
          />

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 theme-muted cursor-pointer">
              <input type="checkbox" className="accent-[#F4845F]" />
              Remember me
            </label>
            <a href="#" className="text-[#F4845F] hover:text-[#E8617A] font-medium">Forgot password?</a>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="theme-button w-full py-3 rounded-xl font-semibold transition-opacity disabled:opacity-60"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="text-sm text-center mt-5 theme-muted">
          Don't have an account?{' '}
          <Link to="/register" className="text-[#F4845F] font-medium hover:text-[#E8617A]">Register</Link>
        </p>
        </div>
      </div>
    </div>
  );
}
