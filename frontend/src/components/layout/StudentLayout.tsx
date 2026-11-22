import React, { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, BookOpen, FileCheck, Bookmark, User, 
  LogOut, ArrowLeft, Menu, X, ShieldCheck, ExternalLink, Radio 
} from 'lucide-react';
import { ThemeToggle } from '../common/ThemeToggle';
import { useAuth } from '../../contexts/AuthContext';

export const StudentLayout: React.FC = () => {
  const { user, logout, isAuthenticated, isLoading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login', { replace: true, state: { from: location.pathname } });
    }
  }, [isLoading, isAuthenticated, navigate, location.pathname]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8F4EA] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D9A52E]" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navItems = [
    { label: 'Dashboard', path: '/student/dashboard', icon: LayoutDashboard },
    { label: 'Live Classes', path: '/student/live', icon: Radio },
    { label: 'My Enrolled Courses', path: '/student/my-courses', icon: BookOpen },
    { label: 'Mock Tests & Quizzes', path: '/student/tests', icon: FileCheck },
    { label: 'Bookmarked Lessons', path: '/student/bookmarks', icon: Bookmark },
    { label: 'Student Profile', path: '/student/profile', icon: User },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#F8F4EA] text-[#263347]">
      
      {/* Mobile Header Bar */}
      <div className="md:hidden flex items-center justify-between bg-[#061426] text-white px-4 py-3 border-b border-[#D9A52E]/30">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1 rounded text-[#E3D8BE] hover:text-white"
          >
            {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
          <img src="/assets/sims-logo.png" alt="SIMS" className="h-8 w-auto object-contain" />
          <div className="flex flex-col justify-center">
            <span className="font-serif font-bold text-base tracking-[0.14em] text-[#F0C45B] leading-none" style={{ fontFamily: "'Cinzel', serif" }}>SIMS</span>
            <span className="font-montserrat font-semibold text-[8px] tracking-[0.28em] text-[#FFF9ED]/90 uppercase mt-0.5 leading-none" style={{ fontFamily: "'Montserrat', sans-serif" }}>RAIPUR</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link to="/" className="text-xs text-[#E3D8BE] hover:text-white flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </Link>
        </div>
      </div>

      {/* Sidebar Navigation */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-[#091B31] text-[#FFF9ED] transform transition-transform duration-200 ease-in-out md:translate-x-0 md:static md:inset-auto md:min-h-screen border-r border-[#D9A52E]/20 flex flex-col justify-between
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div>
          {/* Brand header */}
          <div className="p-5 border-b border-white/10 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2.5">
              <img src="/assets/sims-logo.png" alt="SIMS" className="h-9 w-auto object-contain" />
              <div className="flex flex-col justify-center">
                <span className="font-serif font-bold text-lg tracking-[0.14em] text-[#F0C45B] leading-none" style={{ fontFamily: "'Cinzel', serif" }}>SIMS</span>
                <span className="font-montserrat font-semibold text-[8.5px] tracking-[0.3em] text-[#FFF9ED]/90 uppercase mt-0.5 leading-none" style={{ fontFamily: "'Montserrat', sans-serif" }}>RAIPUR</span>
              </div>
            </Link>
            <button onClick={() => setSidebarOpen(false)} className="md:hidden text-white/60 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* User quick badge */}
          <div className="p-4 mx-3 my-3 rounded-xl bg-[#102846] border border-[#D9A52E]/30 flex items-center gap-3">
            {user?.avatar && !user.avatar.includes('unsplash') ? (
              <img 
                src={user.avatar} 
                alt={user?.name || "Student"} 
                className="w-10 h-10 rounded-full border border-[#D9A52E] object-cover shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-full border border-[#D9A52E] bg-[#D9A52E]/20 text-[#F0C45B] font-bold text-base flex items-center justify-center shrink-0">
                {(user?.name || 'S').charAt(0).toUpperCase()}
              </div>
            )}
            <div className="overflow-hidden">
              <div className="font-medium text-sm text-white truncate">{user?.name || 'Aarav Sharma'}</div>
              <div className="text-xs text-[#F0C45B] truncate">{user?.targetExam || 'GATE Aspirant'}</div>
            </div>
          </div>

          {/* Nav Links */}
          <nav className="px-3 space-y-1 mt-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition ${
                    active
                      ? 'bg-[#D9A52E] text-[#061426] shadow-sm font-semibold'
                      : 'text-[#FFF9ED]/80 hover:bg-[#102846] hover:text-white'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${active ? 'text-[#061426]' : 'text-[#D9A52E]'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-white/10 space-y-2">
          <Link
            to="/"
            className="flex items-center justify-between px-3 py-2 text-xs text-[#E3D8BE]/70 hover:text-white hover:bg-white/5 rounded transition"
          >
            <span className="flex items-center gap-2">
              <ExternalLink className="w-3.5 h-3.5" /> Return to Website
            </span>
          </Link>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-red-300 hover:bg-red-950/30 hover:text-red-200 transition"
          >
            <LogOut className="w-4 h-4" />
            <span>End Demo Session</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Desktop Top Bar */}
        <header className="hidden md:flex items-center justify-between bg-white border-b border-[#EADFC7] px-6 py-3.5 shadow-sm">
          <span className="font-serif font-bold text-[#061426] text-lg">Student Learning Portal</span>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link to="/" className="text-xs text-[#687386] hover:text-[#061426] flex items-center gap-1">
              <ExternalLink className="w-3.5 h-3.5" /> Return to Website
            </Link>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>

    </div>
  );
};
