import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

export default function Login() {
  const navigate = useNavigate();
  const { login, register } = useAuthStore();
  const [isLogin, setIsLogin] = useState(true);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(username, email, password);
      }
      navigate('/dashboard');
    } catch (err) {
      alert("Error: " + (err.response?.data?.msg || err.message));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-background">
      <div className="glass-panel p-8 max-w-md w-full">
        <h1 className="text-3xl font-bold font-sans text-vibe-HighSignal mb-6 text-center">
          {isLogin ? 'Enter Archive' : 'Begin Collection'}
        </h1>
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {!isLogin && (
            <input 
              type="text" 
              placeholder="Username" 
              className="input-field"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
            />
          )}
          <input 
            type="email" 
            placeholder="Email" 
            className="input-field"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <input 
            type="password" 
            placeholder="Password" 
            className="input-field"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          
          <button type="submit" className="w-full bg-vibe-HighSignal/20 hover:bg-vibe-HighSignal/30 text-vibe-HighSignal font-bold uppercase py-3 mt-4 rounded transition-colors">
            {isLogin ? 'Login' : 'Register'}
          </button>
        </form>

        <p className="text-center text-white/50 text-sm mt-6">
          {isLogin ? "Don't have an archive? " : "Already archiving? "}
          <button onClick={() => setIsLogin(!isLogin)} className="text-white hover:underline">
            {isLogin ? 'Register' : 'Login'}
          </button>
        </p>
      </div>
    </div>
  );
}
