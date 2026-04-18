import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/useAuthStore';
import { useSocketStore } from './store/useSocketStore';

import Dashboard from './pages/Dashboard';
import Shelf from './pages/Shelf';
import Compost from './pages/Compost';
import Login from './pages/Login';
import Curator from './pages/Curator';

// A simple Landing placeholder (to be robustified in bonus phase)
const Landing = () => (
  <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center bg-background text-white">
    <h1 className="text-6xl font-black font-sans tracking-tight text-vibe-HighSignal mb-4">ShelfLife</h1>
    <p className="text-xl font-mono text-white/50 mb-8">Your bookmarks are dying. Give them a deadline.</p>
    <a href="/login" className="bg-white text-black px-8 py-3 rounded-full font-bold uppercase tracking-widest hover:bg-white/80 transition-colors">Enter the Archive</a>
  </div>
);

function App() {
  const { loadUser, loading } = useAuthStore();
  const { connect } = useSocketStore();

  useEffect(() => {
    loadUser();
    connect(); // Keep socket running for the session
  }, []);

  if (loading) return <div className="h-screen w-screen flex items-center justify-center bg-background text-white">Loading Synthesis...</div>;

  return (
    <Router>
      <Toaster position="bottom-right" toastOptions={{ style: { background: '#0F0F1A', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' } }} />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/shelf/:id" element={<Shelf />} />
        <Route path="/compost" element={<Compost />} />
        <Route path="/curator/:username" element={<Curator />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;
