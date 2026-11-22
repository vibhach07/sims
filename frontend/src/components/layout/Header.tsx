import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, ChevronDown, Phone, User, ShoppingBag, Power } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { ThemeToggle } from '../common/ThemeToggle';
import { PasswordConfirmModal } from '../auth/PasswordConfirmModal';

export const Header: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [moreDropdownOpen, setMoreDropdownOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();
  const [pendingPortal, setPendingPortal] = useState<'admin' | 'educator' | null>(null);

  const handlePortalClick = (portal: 'admin' | 'educator') => {
    if (user?.role === 'student') return;
    setPendingPortal(portal);
  };

  const handlePasswordSuccess = () => {
    const portal = pendingPortal;
    setPendingPortal(null);
    if (portal === 'admin') {
      navigate('/admin/dashboard');
    } else if (portal === 'educator') {
      navigate('/educator/dashboard');
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setProfileDropdownOpen(false);
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const displayName = user?.name ? user.name.split(' ')[0] : 'Student';
  const isCustomAvatar = Boolean(user?.avatar && !user.avatar.includes('unsplash'));

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Courses', path: '/courses' },
    { name: 'Video Lectures', path: '/lectures' },
    { name: 'Faculty', path: '/faculty' },
    { name: 'Test Series', path: '/test-series' },
    { name: 'Study Material', path: '/study-material' },
    { name: 'About', path: '/about' },
    { name: 'Contact', path: '/contact' },
  ];

  const categories = [
    { name: 'After MSc / B.Tech', path: '/categories/after-msc-btech', desc: 'GATE, NET, SET, AP (PSC), PhD' },
    { name: 'Post Graduate Entrance', path: '/categories/post-graduate-entrance', desc: 'IIT-JAM, NIMCET, CAT, Banking' },
    { name: 'Career & Foundation', path: '/categories/career-foundation', desc: 'CA Foundation, JEE, NEET, AIIMS, X-XII' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 bg-[#061426] text-white border-b border-[#D9A52E]/20 shadow-md">
      {/* Main navigation bar - Full width with padding */}
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-24 gap-2">
          
          {/* Official Brand Unit: Logo matching emblem reference */}
          <Link 
            to="/" 
            className="brand-logo-link flex items-center shrink-0 whitespace-nowrap mr-2 lg:mr-3 xl:mr-5 group outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 active:outline-none active:ring-0 select-none p-1 border-0 ring-0"
            style={{ outline: 'none', border: 'none', boxShadow: 'none' }}
          >
            <img 
              src="/assets/sims-logo-clean-full.png" 
              alt="SIMS Raipur Logo" 
              className="h-16 sm:h-20 md:h-22 w-auto object-contain shrink-0 transition-transform duration-200 group-hover:scale-[1.03] filter drop-shadow-[0_2px_8px_rgba(217,165,46,0.3)]"
            />
            <span className="sr-only">SIMS Raipur</span>
          </Link>

          {/* Desktop Navigation Links — auto responsive spacing */}
          <nav className="hidden lg:flex items-center space-x-0.5 xl:space-x-1 flex-1 justify-center min-w-0">
            <Link
              to="/"
              className={`px-2 xl:px-2.5 py-1.5 rounded-md text-xs xl:text-sm font-medium transition whitespace-nowrap ${
                isActive('/') ? 'text-[#D9A52E] font-semibold bg-white/5' : 'text-[#FFF9ED]/90 hover:text-[#F0C45B] hover:bg-white/5'
              }`}
            >
              Home
            </Link>

            <Link
              to="/courses"
              className={`px-2 xl:px-2.5 py-1.5 rounded-md text-xs xl:text-sm font-medium transition whitespace-nowrap ${
                isActive('/courses') ? 'text-[#D9A52E] font-semibold bg-white/5' : 'text-[#FFF9ED]/90 hover:text-[#F0C45B] hover:bg-white/5'
              }`}
            >
              Courses
            </Link>

            <Link
              to="/lectures"
              className={`px-2 xl:px-2.5 py-1.5 rounded-md text-xs xl:text-sm font-medium transition whitespace-nowrap ${
                isActive('/lectures') ? 'text-[#D9A52E] font-semibold bg-white/5' : 'text-[#FFF9ED]/90 hover:text-[#F0C45B] hover:bg-white/5'
              }`}
            >
              Video Lectures
            </Link>

            {/* Exam Categories Dropdown */}
            <div 
              className="relative shrink-0"
              onMouseEnter={() => setDropdownOpen(true)}
              onMouseLeave={() => setDropdownOpen(false)}
            >
              <button
                type="button"
                className="flex items-center gap-1 px-2 xl:px-2.5 py-1.5 rounded-md text-xs xl:text-sm font-medium text-[#FFF9ED]/90 hover:text-[#F0C45B] hover:bg-white/5 transition focus:outline-none focus:ring-1 focus:ring-[#D9A52E] whitespace-nowrap"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                aria-expanded={dropdownOpen}
              >
                <span>Exam Categories</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {dropdownOpen && (
                <div className="absolute left-0 mt-1 w-80 rounded-xl shadow-2xl bg-[#091B31] border border-[#D9A52E]/30 py-3 z-50 animate-fadeIn">
                  <div className="px-4 py-2 border-b border-white/10 text-xs font-semibold tracking-wider text-[#D9A52E] uppercase">
                    Programs Offered
                  </div>
                  {categories.map((cat) => (
                    <Link
                      key={cat.path}
                      to={cat.path}
                      className="block px-4 py-2.5 hover:bg-[#102846] transition group"
                      onClick={() => setDropdownOpen(false)}
                    >
                      <div className="text-sm font-medium text-white group-hover:text-[#F0C45B]">
                        {cat.name}
                      </div>
                      <div className="text-xs text-[#E3D8BE]/70 group-hover:text-[#FFF9ED]">
                        {cat.desc}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <Link
              to="/faculty"
              className={`px-2 xl:px-2.5 py-1.5 rounded-md text-xs xl:text-sm font-medium transition whitespace-nowrap ${
                isActive('/faculty') ? 'text-[#D9A52E] font-semibold bg-white/5' : 'text-[#FFF9ED]/90 hover:text-[#F0C45B] hover:bg-white/5'
              }`}
            >
              Faculty
            </Link>

            <Link
              to="/test-series"
              className={`px-2 xl:px-2.5 py-1.5 rounded-md text-xs xl:text-sm font-medium transition whitespace-nowrap ${
                isActive('/test-series') ? 'text-[#D9A52E] font-semibold bg-white/5' : 'text-[#FFF9ED]/90 hover:text-[#F0C45B] hover:bg-white/5'
              }`}
            >
              Test Series
            </Link>

            {/* At 1280px+ (xl), show full links inline */}
            <Link
              to="/study-material"
              className={`hidden xl:inline-flex px-2 xl:px-2.5 py-1.5 rounded-md text-xs xl:text-sm font-medium transition whitespace-nowrap ${
                isActive('/study-material') ? 'text-[#D9A52E] font-semibold bg-white/5' : 'text-[#FFF9ED]/90 hover:text-[#F0C45B] hover:bg-white/5'
              }`}
            >
              Study Material
            </Link>

            <Link
              to="/about"
              className={`hidden xl:inline-flex px-2 xl:px-2.5 py-1.5 rounded-md text-xs xl:text-sm font-medium transition whitespace-nowrap ${
                isActive('/about') ? 'text-[#D9A52E] font-semibold bg-white/5' : 'text-[#FFF9ED]/90 hover:text-[#F0C45B] hover:bg-white/5'
              }`}
            >
              About
            </Link>

            <Link
              to="/contact"
              className={`hidden xl:inline-flex px-2 xl:px-2.5 py-1.5 rounded-md text-xs xl:text-sm font-medium transition whitespace-nowrap ${
                isActive('/contact') ? 'text-[#D9A52E] font-semibold bg-white/5' : 'text-[#FFF9ED]/90 hover:text-[#F0C45B] hover:bg-white/5'
              }`}
            >
              Contact
            </Link>

            {/* "More" dropdown visible strictly between 1024px and 1279px (lg only) */}
            <div 
              className="relative hidden lg:flex xl:hidden shrink-0"
              onMouseEnter={() => setMoreDropdownOpen(true)}
              onMouseLeave={() => setMoreDropdownOpen(false)}
            >
              <button
                type="button"
                className="flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium text-[#FFF9ED]/90 hover:text-[#F0C45B] hover:bg-white/5 transition focus:outline-none focus:ring-1 focus:ring-[#D9A52E] whitespace-nowrap"
                onClick={() => setMoreDropdownOpen(!moreDropdownOpen)}
                aria-expanded={moreDropdownOpen}
              >
                <span>More</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${moreDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {moreDropdownOpen && (
                <div className="absolute right-0 mt-1 w-44 rounded-xl shadow-2xl bg-[#091B31] border border-[#D9A52E]/30 py-2 z-50 animate-fadeIn">
                  <Link
                    to="/study-material"
                    className={`block px-3 py-2 text-xs font-medium hover:bg-[#102846] transition ${
                      isActive('/study-material') ? 'text-[#D9A52E] font-semibold' : 'text-[#FFF9ED]/90 hover:text-[#F0C45B]'
                    }`}
                    onClick={() => setMoreDropdownOpen(false)}
                  >
                    Study Material
                  </Link>
                  <Link
                    to="/about"
                    className={`block px-3 py-2 text-xs font-medium hover:bg-[#102846] transition ${
                      isActive('/about') ? 'text-[#D9A52E] font-semibold' : 'text-[#FFF9ED]/90 hover:text-[#F0C45B]'
                    }`}
                    onClick={() => setMoreDropdownOpen(false)}
                  >
                    About
                  </Link>
                  <Link
                    to="/contact"
                    className={`block px-3 py-2 text-xs font-medium hover:bg-[#102846] transition ${
                      isActive('/contact') ? 'text-[#D9A52E] font-semibold' : 'text-[#FFF9ED]/90 hover:text-[#F0C45B]'
                    }`}
                    onClick={() => setMoreDropdownOpen(false)}
                  >
                    Contact
                  </Link>
                </div>
              )}
            </div>
          </nav>

          {/* Right Action Buttons with ThemeToggle */}
          <div className="hidden lg:flex items-center space-x-1.5 xl:space-x-2.5 shrink-0 ml-2 whitespace-nowrap">
            {/* Theme Toggle Button */}
            <ThemeToggle />

            {isAuthenticated ? (
              <div className="relative" ref={profileDropdownRef}>
                <button
                  type="button"
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="flex items-center gap-2 pl-2.5 pr-2 py-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition group text-left cursor-pointer focus:outline-none"
                  aria-label="User menu"
                  aria-expanded={profileDropdownOpen}
                >
                  <span className="text-xs sm:text-sm font-semibold text-[#FFF9ED] max-w-[8rem] truncate">
                    Hi, {displayName}
                  </span>
                  <div className="w-8 h-8 rounded-full border border-[#D9A52E] overflow-hidden bg-[#D9A52E]/20 text-[#F0C45B] font-bold text-xs sm:text-sm flex items-center justify-center shrink-0">
                    {isCustomAvatar ? (
                      <img
                        src={user!.avatar}
                        alt={user?.name || 'User'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span>{(user?.name || 'S').charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <ChevronDown className={`w-3.5 h-3.5 text-[#FFF9ED]/70 group-hover:text-[#F0C45B] transition-transform duration-200 ${profileDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {profileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-60 rounded-2xl bg-white dark:bg-[#0c1f36] border border-slate-200/90 dark:border-white/10 shadow-2xl py-2 z-50">
                    <div className="px-4 py-2 border-b border-slate-100 dark:border-white/10">
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">Signed in as</div>
                      <div className="text-xs font-bold text-slate-800 dark:text-white truncate">{user?.name}</div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{user?.email}</div>
                    </div>

                    <div className="p-1 space-y-0.5">
                      <Link
                        to="/student/profile"
                        onClick={() => setProfileDropdownOpen(false)}
                        className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-semibold text-xs sm:text-sm hover:bg-indigo-100/80 dark:hover:bg-indigo-950/60 transition group"
                      >
                        <User className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 dark:text-indigo-300 shrink-0" />
                        <span>My Profile</span>
                      </Link>

                      <Link
                        to="/student/my-courses"
                        onClick={() => setProfileDropdownOpen(false)}
                        className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 font-medium text-xs sm:text-sm transition group"
                      >
                        <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500 dark:text-slate-400 shrink-0" />
                        <span>My Purchases</span>
                      </Link>

                      {user?.role !== 'student' && (user?.role === 'admin' || user?.role === 'superadmin' || user?.isSuperuser) && (
                        <button
                          type="button"
                          onClick={() => {
                            setProfileDropdownOpen(false);
                            handlePortalClick('admin');
                          }}
                          className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-[#A87519] dark:text-[#F0C45B] hover:bg-amber-50 dark:hover:bg-amber-950/30 font-medium text-xs sm:text-sm transition text-left cursor-pointer"
                        >
                          <span className="w-4 h-4 rounded-md bg-[#D9A52E]/20 text-[#A87519] dark:text-[#F0C45B] text-[10px] font-bold flex items-center justify-center shrink-0">A</span>
                          <span>Admin Panel</span>
                        </button>
                      )}

                      {user?.role !== 'student' && user?.role === 'educator' && (
                        <button
                          type="button"
                          onClick={() => {
                            setProfileDropdownOpen(false);
                            handlePortalClick('educator');
                          }}
                          className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 font-medium text-xs sm:text-sm transition text-left cursor-pointer"
                        >
                          <span className="w-4 h-4 rounded-md bg-white/10 text-slate-600 dark:text-slate-300 text-[10px] font-bold flex items-center justify-center shrink-0">E</span>
                          <span>Educator Workspace</span>
                        </button>
                      )}
                    </div>

                    <div className="my-1 border-t border-slate-200/80 dark:border-white/10" />

                    <div className="p-1">
                      <button
                        type="button"
                        onClick={() => {
                          setProfileDropdownOpen(false);
                          logout();
                        }}
                        className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 dark:hover:text-red-400 font-medium text-xs sm:text-sm transition group text-left cursor-pointer"
                      >
                        <Power className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500 dark:text-slate-400 group-hover:text-red-600 dark:group-hover:text-red-400 shrink-0" />
                        <span>Logout</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className="px-2.5 xl:px-3.5 py-1.5 text-xs xl:text-sm font-medium text-white hover:text-[#F0C45B] transition rounded-md hover:bg-white/5 whitespace-nowrap shrink-0"
              >
                Login
              </Link>
            )}

            <Link
              to="/courses"
              className="btn-sims-primary px-3.5 xl:px-5 py-1.5 xl:py-2 text-xs xl:text-sm font-semibold whitespace-nowrap shrink-0"
            >
              Enroll Now
            </Link>
          </div>

          {/* Mobile Menu Actions & Hamburger */}
          <div className="flex items-center lg:hidden gap-1 sm:gap-2 shrink-0">
            <ThemeToggle />
            <Link
              to="/courses"
              className="btn-sims-primary px-3 py-1.5 text-xs font-semibold whitespace-nowrap"
            >
              Enroll
            </Link>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-[#FFF9ED] hover:text-[#F0C45B] hover:bg-[#102846] focus:outline-none focus:ring-2 focus:ring-[#D9A52E]"
              aria-label={mobileMenuOpen ? "Close Navigation Menu" : "Open Navigation Menu"}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#091B31] border-b border-[#D9A52E]/30 px-4 pt-3 pb-6 space-y-2 animate-slideDown">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                isActive(link.path)
                  ? 'bg-[#102846] text-[#D9A52E]'
                  : 'text-[#FFF9ED] hover:bg-[#102846] hover:text-[#F0C45B]'
              }`}
            >
              {link.name}
            </Link>
          ))}

          {/* Categories Submenu in Mobile */}
          <div className="pt-2 pb-1 border-t border-white/10">
            <div className="text-xs font-semibold tracking-wider text-[#D9A52E] uppercase px-3 py-1">
              Exam Categories
            </div>
            {categories.map((c) => (
              <Link
                key={c.path}
                to={c.path}
                onClick={() => setMobileMenuOpen(false)}
                className="block px-4 py-1.5 text-sm text-[#E3D8BE] hover:text-[#F0C45B]"
              >
                • {c.name}
              </Link>
            ))}
          </div>

          <div className="pt-3 border-t border-white/10 flex flex-col gap-2">
            {isAuthenticated ? (
              <>
                {user?.role !== 'student' && (user?.isStaff || user?.role === 'admin' || user?.role === 'superadmin') && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        handlePortalClick('admin');
                      }}
                      className="w-full text-center py-2.5 rounded-lg bg-[#102846] text-[#F0C45B] font-medium"
                    >
                      Admin Panel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        handlePortalClick('educator');
                      }}
                      className="w-full text-center py-2.5 rounded-lg bg-[#102846] text-[#E3D8BE] font-medium"
                    >
                      Educator Workspace
                    </button>
                  </>
                )}
                {user?.role !== 'student' && !user?.isStaff && user?.role === 'educator' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handlePortalClick('educator');
                    }}
                    className="w-full text-center py-2.5 rounded-lg bg-[#102846] text-[#F0C45B] font-medium"
                  >
                    Educator Workspace
                  </button>
                )}
                <Link
                  to="/student/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2.5 rounded-lg bg-indigo-950/60 text-indigo-300 font-semibold border border-indigo-800/40"
                >
                  My Profile
                </Link>
                <Link
                  to="/student/my-courses"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2.5 rounded-lg bg-[#102846] text-[#FFF9ED] font-medium"
                >
                  My Purchases
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                  }}
                  className="w-full text-center py-2.5 rounded-lg bg-red-950/40 text-red-300 font-medium border border-red-800/40"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2.5 rounded-lg bg-[#102846] text-white font-medium hover:bg-[#102846]/80"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      )}
      {pendingPortal && (
        <PasswordConfirmModal
          isOpen={pendingPortal !== null}
          onClose={() => setPendingPortal(null)}
          onSuccess={handlePasswordSuccess}
          title={pendingPortal === 'admin' ? 'Admin Panel Access' : 'Educator Workspace Access'}
          targetPortal={pendingPortal}
          email={user?.email || ''}
        />
      )}
    </header>
  );
};
export default Header;
