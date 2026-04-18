import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function Layout({ children }) {
  return (
    <div className="theme-shell min-h-screen">
      <Sidebar />
      <div className="ml-[260px] flex flex-col min-h-screen">
        <Topbar />
        <main className="flex-1 px-6 pb-8 pt-10">
          {children}
        </main>
      </div>
    </div>
  );
}
