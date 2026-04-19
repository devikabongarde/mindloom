import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import api from './utils/api';
import Login from './pages/Login';
import Register from './pages/Register';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Shelf from './pages/Shelf';
import Social from './pages/Social';
import Notifications from './pages/Notifications';
import CompostHeap from './pages/CompostHeap';
import KnowledgeGraph from './pages/KnowledgeGraph';
import Profile from './pages/Profile';
import AcceptInvite from './pages/AcceptInvite';
import Discover from './pages/Discover';
import Study from './pages/Study';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center text-[#6B7280]">
      Loading...
    </div>
  );
  return user ? children : <Navigate to="/login" replace />;
}

function ShelfRedirect() {
  const { user, login, loading } = useAuth();
  const [resolving, setResolving] = useState(false);
  const [shelfId, setShelfId] = useState(user?.defaultShelfId || null);

  useEffect(() => {
    // If we already have a shelfId, nothing to do
    if (shelfId || !user || resolving) return;

    setResolving(true);
    // Try to find an existing shelf first, otherwise create one
    api.get('/api/shelves/mine')
      .then(({ data: shelves }) => {
        if (shelves.length > 0) return shelves[0];
        return api.post('/api/shelves', {
          name: `${user.name}'s Shelf`,
          isPublic: false,
          weather: 'Foggy',
        }).then((r) => r.data);
      })
      .then((shelf) => {
        // Patch the backend user so future logins won't need to repeat this
        return api.patch('/api/auth/me', { defaultShelfId: shelf._id })
          .catch(() => null) // non-fatal if endpoint doesn't exist yet
          .then(() => shelf);
      })
      .then((shelf) => {
        // Update local auth state so user.defaultShelfId is set
        login(localStorage.getItem('shelflife_token'), {
          ...user,
          defaultShelfId: shelf._id,
        });
        setShelfId(shelf._id);
      })
      .catch(console.error)
      .finally(() => setResolving(false));
  }, [user, shelfId, resolving, login]);

  if (loading || resolving) return (
    <div className="min-h-screen bg-[#FAF8F5] flex flex-col items-center justify-center gap-3 text-[#6B7280]">
      <div className="w-6 h-6 rounded-full border-2 border-[#F4845F] border-t-transparent animate-spin" />
      <span>Setting up your shelf…</span>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (!shelfId) return (
    <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center text-[#6B7280]">
      Could not find your shelf. Please log out and back in.
    </div>
  );
  return <Navigate to={`/shelf/${shelfId}`} replace />;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/"               element={user ? <Navigate to="/dashboard" replace /> : <Landing />} />
      <Route path="/login"          element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/register"       element={user ? <Navigate to="/dashboard" replace /> : <Register />} />
      <Route path="/dashboard"      element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/shelf"          element={<ProtectedRoute><ShelfRedirect /></ProtectedRoute>} />
      <Route path="/shelf/:id"      element={<ProtectedRoute><Shelf /></ProtectedRoute>} />
      <Route path="/social"         element={<Navigate to="/discover" replace />} />
      <Route path="/notifications"  element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
      <Route path="/compost"        element={<ProtectedRoute><CompostHeap /></ProtectedRoute>} />
      <Route path="/knowledge-graph" element={<ProtectedRoute><KnowledgeGraph /></ProtectedRoute>} />
      <Route path="/discover"       element={<ProtectedRoute><Social /></ProtectedRoute>} />
      <Route path="/study"          element={<ProtectedRoute><Study /></ProtectedRoute>} />
      <Route path="/profile/:userId" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="/profile"        element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="/invite/:token"  element={<ProtectedRoute><AcceptInvite /></ProtectedRoute>} />
      <Route path="*"               element={<Navigate to={user ? '/dashboard' : '/'} replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
