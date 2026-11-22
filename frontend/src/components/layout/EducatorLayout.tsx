import React, { useState, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { 
  Briefcase, BookOpen, PlusCircle, Users, ExternalLink, Menu, X, ArrowLeft,
  FileCheck, FileText, UserCheck, Bell, Activity, LogOut, Check, Radio
} from 'lucide-react';
import { ThemeToggle } from '../common/ThemeToggle';
import { useAuth } from '../../contexts/AuthContext';
import { NotificationsAPI, APINotification } from '../../services/api';

export const EducatorLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifs, setNotifs] = useState<APINotification[]>([]);
  const [bellOpen, setBellOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const navItems = [
    { label: 'Dashboard', path: '/educator/dashboard', icon: Briefcase },
    { label: 'Live Classes', path: '/educator/live', icon: Radio },
    { label: 'My Courses', path: '/educator/courses', icon: BookOpen },
    { label: 'Create Course', path: '/educator/courses/new', icon: PlusCircle },
    { label: 'My Tests', path: '/educator/tests', icon: FileCheck },
    { label: 'Study Material', path: '/educator/resources', icon: FileText },
    { label: 'My Students', path: '/educator/students', icon: Users },
    { label: 'My Profile', path: '/educator/profile', icon: UserCheck },
    { label: 'Notifications', path: '/educator/notifications', icon: Bell },
    { label: 'Activity Log', path: '/educator/activity', icon: Activity },
  ];

  const fetchUnread = async () => {
    try {
      const res = await NotificationsAPI.unreadCount();
      setUnreadCount(res.unread_count);
    } catch {
      /* ignore */
    }
  };

  const loadNotifs = async () => {
    try {
      const res = await NotificationsAPI.list();
      setNotifs(res.slice(0, 5));
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    fetchUnread();
    const timer = setInterval(fetchUnread, 30000);
    return () => clearInterval(timer);
  }, []);

  const handleOpenBell = () => {
    if (!bellOpen) loadNotifs();
    setBellOpen(!bellOpen);
  };

  const handleMarkRead = async (id: number, link?: string) => {
    try {
      await NotificationsAPI.markRead(id);
      setUnreadCount((c) => Math.max(0, c - 1));
      setNotifs((list) => list.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
      if (link) {
        setBellOpen(false);
        navigate(link);
      }
    } catch {
      /* ignore */
    }
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#F8F4EA] text-[#263347]">
      {/* Mobile top bar */}
      <div className="md:hidden flex items-center justify-between bg-[#061426] text-white px-4 py-3 border-b border-[#D9A52E]/30">
        <div className="flex items-center gap-2">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1 text-[#E3D8BE]">
            {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
          <img src="/assets/sims-logo.png" alt="SIMS" className="h-8 w-auto object-contain" />
          <span className="font-serif font-extrabold text-base tracking-[0.2em] text-[#F0C45B]">SIMS</span>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link to="/educator/notifications" className="relative text-[#E3D8BE] hover:text-white">
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>
          <Link to="/" className="text-xs text-[#E3D8BE] hover:text-white flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Site
          </Link>
        </div>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-[#091B31] text-[#FFF9ED] transform transition-transform duration-200 ease-in-out md:translate-x-0 md:static md:min-h-screen border-r border-[#D9A52E]/20 flex flex-col justify-between
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div>
          <div className="p-5 border-b border-white/10 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2.5">
              <img src="/assets/sims-logo.png" alt="SIMS" className="h-9 w-auto object-contain" />
              <span className="font-serif font-extrabold text-xl tracking-[0.2em] text-[#F0C45B] leading-none">SIMS</span>
            </Link>
            <button onClick={() => setSidebarOpen(false)} className="md:hidden text-white/60">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-3">
            <div className="bg-[#102846] p-3 rounded-lg border border-[#D9A52E]/20 text-xs text-[#E3D8BE]">
              <span className="font-semibold text-white block mb-0.5">Educator Studio</span>
              Course creator and curriculum editor environment.
            </div>
          </div>

          <nav className="px-3 space-y-1 mt-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              const isNotif = item.path === '/educator/notifications';
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center justify-between px-3.5 py-2 rounded-lg text-sm font-medium transition ${
                    active
                      ? 'bg-[#D9A52E] text-[#061426] font-semibold'
                      : 'text-[#FFF9ED]/80 hover:bg-[#102846] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${active ? 'text-[#061426]' : 'text-[#D9A52E]'}`} />
                    <span>{item.label}</span>
                  </div>
                  {isNotif && unreadCount > 0 && (
                    <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                      {unreadCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-white/10 space-y-2">
          <div className="text-xs text-[#E3D8BE]/80 truncate">
            Signed in as: <span className="font-semibold text-white">{user?.name || user?.email}</span>
          </div>
          <button
            onClick={() => logout()}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-rose-300 hover:text-rose-100 hover:bg-rose-950/40 rounded transition"
          >
            <LogOut className="w-3.5 h-3.5" /> Sign Out
          </button>
          <Link
            to="/"
            className="flex items-center gap-2 px-3 py-1.5 text-xs text-[#E3D8BE]/70 hover:text-white transition"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Return to Website
          </Link>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Desktop Top Bar */}
        <header className="hidden md:flex items-center justify-between bg-white border-b border-[#EADFC7] px-6 py-3.5 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="font-serif font-bold text-[#061426] text-lg">SIMS Educator Studio</span>
          </div>

          <div className="flex items-center gap-4 relative">
            <ThemeToggle className="text-[#061426] hover:bg-slate-100" />
            {/* Bell Dropdown */}
            <div className="relative">
              <button
                onClick={handleOpenBell}
                className="relative p-2 rounded-full hover:bg-slate-100 text-[#061426] transition"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5 text-slate-700" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 bg-rose-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {bellOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
                  <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <span className="font-semibold text-xs text-slate-700">Notifications</span>
                    <Link
                      to="/educator/notifications"
                      onClick={() => setBellOpen(false)}
                      className="text-[11px] text-[#D9A52E] hover:underline font-semibold"
                    >
                      View all
                    </Link>
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                    {notifs.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-500">No recent notifications</div>
                    ) : (
                      notifs.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => handleMarkRead(n.id, n.link)}
                          className={`p-3 text-xs cursor-pointer transition hover:bg-slate-50 ${
                            !n.is_read ? 'bg-amber-50/50' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-slate-900">{n.title}</span>
                            {!n.is_read && (
                              <span className="w-1.5 h-1.5 rounded-full bg-[#D9A52E]"></span>
                            )}
                          </div>
                          <p className="text-slate-600 line-clamp-2">{n.body}</p>
                          <span className="text-[10px] text-slate-400 mt-1 block">
                            {new Date(n.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Avatar / Menu */}
            <Link
              to="/educator/profile"
              className="flex items-center gap-2 p-1.5 hover:bg-slate-100 rounded-lg transition"
            >
              <div className="w-8 h-8 rounded-full bg-[#061426] text-[#F0C45B] font-bold text-xs flex items-center justify-center">
                {(user?.name || user?.email || 'E').slice(0, 1).toUpperCase()}
              </div>
              <div className="text-left hidden lg:block text-xs">
                <div className="font-semibold text-slate-800">{user?.name || 'Educator'}</div>
                <div className="text-slate-400 capitalize">{user?.role || 'Educator'}</div>
              </div>
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

export default EducatorLayout;
