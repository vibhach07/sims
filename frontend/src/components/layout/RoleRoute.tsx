import React, { useState, useEffect } from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Loader2, AlertTriangle, X } from 'lucide-react';

interface RoleRouteProps {
  allowedRoles: ('student' | 'educator' | 'admin' | 'staff' | 'superadmin')[];
  children?: React.ReactNode;
}

export const RoleRoute: React.FC<RoleRouteProps> = ({ allowedRoles, children }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  useEffect(() => {
    const msg = sessionStorage.getItem('sims_role_notice');
    if (msg) {
      setToastMsg(msg);
      sessionStorage.removeItem('sims_role_notice');
      const timer = setTimeout(() => setToastMsg(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [location.pathname]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FFF9ED] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#D9A52E]" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    // If trying to access /educator/*, redirect to /educator/login, otherwise /login
    const redirectPath = location.pathname.startsWith('/educator')
      ? '/educator/login'
      : '/login';
    return <Navigate to={redirectPath} state={{ from: location }} replace />;
  }

  const role = (user.role || 'student').toLowerCase().trim();
  const isStaffOrAdmin = Boolean(user.isStaff || user.isSuperuser || role === 'admin' || role === 'superadmin' || role === 'staff');

  // Check if role is allowed
  const hasAccess =
    allowedRoles.includes(role as any) ||
    (isStaffOrAdmin && (allowedRoles.includes('admin') || allowedRoles.includes('educator')));

  if (!hasAccess) {
    sessionStorage.setItem('sims_role_notice', 'Access restricted. Redirected to your authorized workspace.');
    // Redirect to the appropriate home according to their role
    if (isStaffOrAdmin) {
      return <Navigate to="/admin/dashboard" replace />;
    } else if (role === 'educator') {
      return <Navigate to="/educator/dashboard" replace />;
    } else {
      return <Navigate to="/student/dashboard" replace />;
    }
  }

  return (
    <>
      {toastMsg && (
        <div className="fixed top-20 right-6 z-50 bg-[#061426] text-white border-2 border-[#D9A52E] shadow-2xl rounded-xl p-3.5 flex items-center gap-3 animate-slideDown max-w-sm">
          <AlertTriangle className="w-5 h-5 text-[#F0C45B] flex-shrink-0" />
          <span className="text-xs font-semibold">{toastMsg}</span>
          <button onClick={() => setToastMsg(null)} className="p-1 hover:text-[#F0C45B]">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {children ?? <Outlet />}
    </>
  );
};

export default RoleRoute;
