import { useEffect, useState } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';

export default function ShelfSwitcher() {
  const { user } = useAuth();
  const [shelves, setShelves] = useState([]);
  const navigate = useNavigate();
  const { id: currentShelfId } = useParams();

  useEffect(() => {
    if (!user) return;
    api.get('/api/shelves/mine').then(({ data }) => setShelves(data)).catch(console.error);
  }, [user]);

  if (shelves.length <= 1) return null;

  return (
    <select
      className="text-xs bg-white/60 border border-white/80 rounded-full px-3 py-1.5 text-[#6B7280] outline-none cursor-pointer backdrop-blur"
      value={currentShelfId || user?.defaultShelfId || ''}
      onChange={(e) => e.target.value && navigate(`/shelf/${e.target.value}`)}
    >
      {shelves.map((shelf) => (
        <option key={shelf._id} value={shelf._id}>
          {shelf.type === 'team' ? '👥 ' : '👤 '}
          {shelf.name}
        </option>
      ))}
    </select>
  );
}
