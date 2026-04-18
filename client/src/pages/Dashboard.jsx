import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <Layout>
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <h1 className="text-4xl font-bold text-[#1A1A2E] mb-3">
          Welcome to SHELFLIFE{user?.name ? `, ${user.name.split(' ')[0]}` : ''} 👋
        </h1>
        <p className="text-[#6B7280] text-lg">Your digital sanctuary awaits. More coming in Step 3.</p>
      </div>
    </Layout>
  );
}
