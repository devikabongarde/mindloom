import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      <Sidebar />
      <div className="ml-[220px] flex flex-col min-h-screen">
        <Topbar />
        <main className="flex-1 px-6 pb-8">
          {children}
        </main>
      </div>
    </div>
  );
}
