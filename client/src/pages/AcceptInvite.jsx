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
    <div className="theme-shell min-h-screen flex items-center justify-center px-6">
      <div className="theme-card rounded-3xl p-8 text-center shadow-xl max-w-sm w-full">
        <p className="text-4xl mb-4">{error ? '💀' : '📚'}</p>
        <p className={`theme-card-content text-sm font-medium ${error ? 'text-red-500' : ''}`}>
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
