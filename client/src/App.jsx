import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Shelf from './pages/Shelf';
import CompostHeap from './pages/CompostHeap';
import Profile from './pages/Profile';
import AcceptInvite from './pages/AcceptInvite';

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
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center text-[#6B7280]">
      Loading...
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (!user.defaultShelfId) return (
    <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center text-[#6B7280]">
      Setting up your shelf…
    </div>
  );
  return <Navigate to={`/shelf/${user.defaultShelfId}`} replace />;
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
      <Route path="/compost"        element={<ProtectedRoute><CompostHeap /></ProtectedRoute>} />
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
