import React, { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { 
  ShieldAlert, BookOpen, Users, UserCheck, MessageSquare, 
  FileCheck, ExternalLink, Menu, X, ArrowLeft, Sliders, Radio, UploadCloud
} from 'lucide-react';
import { ThemeToggle } from '../common/ThemeToggle';

export const AdminLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const navItems = [
    { label: 'Admin Dashboard', path: '/admin/dashboard', icon: ShieldAlert },
    { label: 'Live Classes Control', path: '/admin/live', icon: Radio },
    { label: 'Educators Control', path: '/admin/educators', icon: UserCheck },
    { label: 'Courses Management', path: '/admin/courses', icon: BookOpen },
    { label: 'Students Roster', path: '/admin/students', icon: Users },
    { label: 'Faculty Directory', path: '/admin/faculty', icon: UserCheck },
    { label: 'Enquiries & Leads', path: '/admin/enquiries', icon: MessageSquare },
    { label: 'Test Series Control', path: '/admin/tests', icon: FileCheck },
    { label: 'Bulk Import (LaTeX)', path: '/admin/tests/import', icon: UploadCloud },
    { label: 'Site & Contact Settings', path: '/admin/settings', icon: Sliders },
  ];

  const isActive = (path: string) => location.pathname === path || (path === '/admin/educators' && location.pathname.startsWith('/admin/educators'));

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
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link to="/" className="text-xs text-[#E3D8BE] hover:text-white flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </Link>
        </div>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-[#061426] text-[#FFF9ED] transform transition-transform duration-200 ease-in-out md:translate-x-0 md:static md:min-h-screen border-r border-[#D9A52E]/20 flex flex-col justify-between
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
            <div className="bg-[#091B31] p-3 rounded-lg border border-[#D9A52E]/30 text-xs text-[#E3D8BE]">
              <span className="font-semibold text-[#F0C45B] block mb-0.5">Central Management</span>
              Full institute administration & enquiry monitor.
            </div>
          </div>

          <nav className="px-3 space-y-1 mt-2">
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
                      ? 'bg-[#D9A52E] text-[#061426] font-semibold'
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

        <div className="p-4 border-t border-white/10">
          <Link
            to="/"
            className="flex items-center gap-2 px-3 py-2 text-xs text-[#E3D8BE]/70 hover:text-white transition"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Return to Website
          </Link>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Desktop Top Bar */}
        <header className="hidden md:flex items-center justify-between bg-white border-b border-[#EADFC7] px-6 py-3.5 shadow-sm">
          <span className="font-serif font-bold text-[#061426] text-lg">Central Administration</span>
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
