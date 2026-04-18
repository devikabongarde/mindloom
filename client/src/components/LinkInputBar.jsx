import { useState } from 'react';
import api from '../utils/api';

export default function LinkInputBar({ shelfId, onLinkCreated }) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!url.trim()) return;
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/api/links', { shelfId, url, mode: 'url' });
      onLinkCreated(data);
      setUrl('');
    } catch {
      setError("Couldn't capture this link. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      <form
        onSubmit={handleSubmit}
        className="theme-panel flex items-center gap-3 rounded-full shadow-md px-5 py-3"
      >
        <span className="theme-muted text-lg select-none">🔗</span>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Drop a link to resurrect it…"
          className="flex-1 bg-transparent outline-none text-sm text-[#20314d] placeholder:text-[#8aa0c1]"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading}
          className="theme-button
            text-sm font-semibold px-5 py-2
            rounded-full hover:opacity-90 transition-opacity
            disabled:opacity-50 min-w-[90px] text-center whitespace-nowrap"
        >
          {loading ? 'Capturing…' : 'Capture'}
        </button>
      </form>
      {error && (
        <p className="text-xs text-red-400 text-center mt-2">{error}</p>
      )}
    </div>
  );
}
