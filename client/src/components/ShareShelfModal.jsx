import { useEffect, useState } from 'react';
import api from '../utils/api';

export default function ShareShelfModal({ shelfId, onClose }) {
  const [email, setEmail] = useState('');
  const [inviteUrl, setInviteUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [friends, setFriends] = useState([]);
  const [friendsLoading, setFriendsLoading] = useState(true);
  const [sendStatus, setSendStatus] = useState('');
  const [sendingToFriendId, setSendingToFriendId] = useState('');

  useEffect(() => {
    let cancelled = false;

    api.get('/api/social/friends')
      .then(({ data }) => {
        if (cancelled) return;
        setFriends(Array.isArray(data?.friends) ? data.friends : []);
      })
      .catch(() => {
        if (!cancelled) setFriends([]);
      })
      .finally(() => {
        if (!cancelled) setFriendsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const createInviteForEmail = async (targetEmail) => {
    const { data } = await api.post('/api/shelves/invite', { shelfId, email: targetEmail });
    return data?.inviteUrl || '';
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError('');
    try {
      const url = await createInviteForEmail(email);
      setInviteUrl(url);
      setSendStatus('');
    } catch {
      setError('Failed to create invite. Only the shelf owner can invite.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendToFriendChat = async (friend) => {
    const friendId = String(friend?._id || '');
    const friendEmail = String(friend?.email || '').trim();
    if (!friendId || !friendEmail) return;

    setSendingToFriendId(friendId);
    setError('');
    setSendStatus('');

    try {
      const url = await createInviteForEmail(friendEmail);
      if (!url) throw new Error('No invite link returned');

      setInviteUrl(url);

      const text = `Join my shelf using this invite link: ${url}`;
      await api.post(`/api/chat/${friendId}/messages`, { text });
      setSendStatus(`Invite sent to ${friend.name} in chat.`);
    } catch {
      setError('Could not send invite to chat. Please make sure this person is your friend and try again.');
    } finally {
      setSendingToFriendId('');
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
        className="theme-modal rounded-3xl p-6 w-full max-w-md shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="theme-modal-content">
        <h2 className="text-lg font-bold mb-1">Share this Shelf</h2>
        <p className="text-xs theme-muted mb-4 leading-relaxed">
          Invite a teammate by email. We'll generate a magic link you can paste in chat.
        </p>

        <form onSubmit={handleInvite} className="flex flex-col gap-3">
          <input
            type="email"
            className="theme-input w-full rounded-2xl px-4 py-2.5 text-sm"
            placeholder="teammate@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="theme-button text-sm font-semibold px-4 py-2.5 rounded-2xl hover:opacity-90 transition disabled:opacity-60"
          >
            {loading ? 'Generating…' : 'Generate invite link'}
          </button>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </form>

        {inviteUrl && (
          <div className="mt-4">
            <p className="text-xs theme-muted mb-1 font-medium">Invite link (share this):</p>
            <div className="flex items-center gap-2 bg-white/75 rounded-2xl px-3 py-2 border border-white/60">
              <p className="text-xs break-all flex-1">{inviteUrl}</p>
              <button
                onClick={handleCopy}
                className="text-xs font-semibold text-[#F4845F] whitespace-nowrap hover:underline flex-shrink-0"
              >
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            </div>
          </div>
        )}

        <div className="mt-4 rounded-2xl bg-white/45 border border-white/60 p-3">
          <p className="text-xs theme-muted mb-2 font-medium">Send directly to a friend chat</p>
          {friendsLoading ? (
            <p className="text-xs theme-muted">Loading friends...</p>
          ) : friends.length === 0 ? (
            <p className="text-xs theme-muted">No friends found. Add friends first to send invite links directly.</p>
          ) : (
            <div className="max-h-44 overflow-y-auto flex flex-col gap-2 pr-1">
              {friends.map((friend) => {
                const isSending = String(sendingToFriendId) === String(friend._id);
                return (
                  <div key={friend._id} className="flex items-center justify-between gap-2 rounded-xl bg-white/70 border border-white/70 px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[#20314d] truncate">{friend.name}</p>
                      <p className="text-[11px] theme-muted truncate">{friend.email}</p>
                    </div>
                    <button
                      onClick={() => handleSendToFriendChat(friend)}
                      disabled={isSending}
                      className="theme-button-secondary rounded-full px-3 py-1.5 text-[11px] font-semibold whitespace-nowrap disabled:opacity-70"
                    >
                      {isSending ? 'Sending...' : 'Send in chat'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
          {sendStatus && <p className="text-xs text-green-600 mt-2">{sendStatus}</p>}
        </div>

        <button
          onClick={onClose}
          className="mt-4 text-xs theme-muted hover:text-[#1A1A2E] transition"
        >
          ← Close
        </button>
        </div>
      </div>
    </div>
  );
}
