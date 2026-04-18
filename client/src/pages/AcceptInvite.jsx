import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';

export default function AcceptInvite() {
  const { token } = useParams();
  const [status, setStatus] = useState('Joining shelf…');
  const [error, setError] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api.post('/api/shelves/invite/accept', { token })
      .then(({ data }) => {
        setStatus(`Joined "${data.shelfName}"! Redirecting…`);
        setTimeout(() => navigate(`/shelf/${data.shelfId}`), 1500);
      })
      .catch(() => {
        setStatus('This invite link is invalid or has already been used.');
        setError(true);
      });
  }, [token, navigate]);

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center px-6">
      <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-8 text-center shadow-xl border border-white/60 max-w-sm w-full">
        <p className="text-4xl mb-4">{error ? '💀' : '📚'}</p>
        <p className={`text-sm font-medium ${error ? 'text-red-500' : 'text-[#1A1A2E]'}`}>
          {status}
        </p>
        {error && (
          <button
            onClick={() => navigate('/dashboard')}
            className="mt-4 text-xs text-[#F4845F] hover:underline"
          >
            Go to Dashboard
          </button>
        )}
      </div>
    </div>
  );
}
