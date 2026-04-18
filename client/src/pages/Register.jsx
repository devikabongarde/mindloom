import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

export default function Register() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/api/auth/register', form);
      login(data.token, data.user);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#FFD6E0] via-[#C9B8FF] to-[#B8F0E0]">
      <div
        className="w-full max-w-[420px] mx-4 p-10 rounded-[20px] shadow-[0_20px_40px_rgba(26,26,46,0.1)]"
        style={{ backdropFilter: 'blur(20px)', background: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.6)' }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2 mb-6">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#F4845F] to-[#E8617A] shadow-lg shadow-[#F4845F]/40" />
          <span className="font-bold text-lg bg-gradient-to-r from-[#F4845F] to-[#E8617A] bg-clip-text text-transparent">
            SHELFLIFE
          </span>
        </div>

        <h1 className="text-2xl font-bold text-[#1A1A2E] mb-1">Create your archive</h1>
        <p className="text-sm text-[#6B7280] mb-6">Start curating what matters</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            name="name"
            type="text"
            placeholder="Your name"
            value={form.name}
            onChange={handleChange}
            required
            className="w-full px-4 py-3 rounded-xl border border-[#E5E7EB] bg-white/70 text-[#1A1A2E] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#F4845F]/40 text-sm"
          />
          <input
            name="email"
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
            required
            className="w-full px-4 py-3 rounded-xl border border-[#E5E7EB] bg-white/70 text-[#1A1A2E] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#F4845F]/40 text-sm"
          />
          <input
            name="password"
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            required
            className="w-full px-4 py-3 rounded-xl border border-[#E5E7EB] bg-white/70 text-[#1A1A2E] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#F4845F]/40 text-sm"
          />

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-[#F4845F] to-[#E8617A] hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="text-sm text-[#6B7280] text-center mt-5">
          Already have an account?{' '}
          <Link to="/login" className="text-[#F4845F] font-medium hover:text-[#E8617A]">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
