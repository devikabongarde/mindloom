import { useState } from 'react';
import api from '../utils/api';

export default function ShareShelfModal({ shelfId, onClose }) {
  const [email, setEmail] = useState('');
  const [inviteUrl, setInviteUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/api/shelves/invite', { shelfId, email });
      setInviteUrl(data.inviteUrl);
    } catch {
      setError('Failed to create invite. Only the shelf owner can invite.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white/85 backdrop-blur-xl rounded-3xl p-6 w-full max-w-md shadow-2xl border border-white/70"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-[#1A1A2E] mb-1">Share this Shelf</h2>
        <p className="text-xs text-[#6B7280] mb-4 leading-relaxed">
          Invite a teammate by email. We'll generate a magic link you can paste in chat.
        </p>

        <form onSubmit={handleInvite} className="flex flex-col gap-3">
          <input
            type="email"
            className="w-full rounded-2xl border border-white/80 bg-white/60 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#F4845F] placeholder:text-[#6B7280]"
            placeholder="teammate@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-gradient-to-r from-[#F4845F] to-[#E8617A] text-white text-sm font-semibold px-4 py-2.5 rounded-2xl hover:opacity-90 transition disabled:opacity-60"
          >
            {loading ? 'Generating…' : 'Generate invite link'}
          </button>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </form>

        {inviteUrl && (
          <div className="mt-4">
            <p className="text-xs text-[#6B7280] mb-1 font-medium">Invite link (share this):</p>
            <div className="flex items-center gap-2 bg-white/90 rounded-2xl px-3 py-2 border border-white/60">
              <p className="text-xs text-[#1A1A2E] break-all flex-1">{inviteUrl}</p>
              <button
                onClick={handleCopy}
                className="text-xs font-semibold text-[#F4845F] whitespace-nowrap hover:underline flex-shrink-0"
              >
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            </div>
          </div>
        )}

        <button
          onClick={onClose}
          className="mt-4 text-xs text-[#6B7280] hover:text-[#1A1A2E] transition"
        >
          ← Close
        </button>
      </div>
    </div>
  );
}
