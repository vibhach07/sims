import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Lock, Mail, ArrowRight, Loader2, GraduationCap, Briefcase, Eye, EyeOff } from 'lucide-react';
import { GoogleLoginButton } from '../../components/auth/GoogleLoginButton';

export const LoginPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'student' | 'educator'>('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, loginWithGoogle, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = (location.state as any)?.returnTo || (location.state as any)?.from?.pathname;

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      if (user.isStaff || user.role === 'admin' || user.role === 'superadmin') {
        navigate('/admin/dashboard');
      } else if (user.role === 'educator') {
        navigate('/educator/dashboard');
      } else {
        navigate(returnTo || '/student/dashboard');
      }
    }
  }, [user, navigate, returnTo]);

  const handleGoogleSuccess = async (credential: string) => {
    setError('');
    setIsLoading(true);
    try {
      const loggedUser = await loginWithGoogle(credential, activeTab);
      if (loggedUser.isStaff || loggedUser.role === 'admin' || loggedUser.role === 'superadmin') {
        navigate('/admin/dashboard');
      } else if (loggedUser.role === 'educator') {
        navigate('/educator/dashboard');
      } else {
        if (!loggedUser.targetExam || !loggedUser.phone) {
          navigate('/student/profile-setup');
        } else {
          navigate(returnTo || '/student/dashboard');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Google authentication failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide both email and password.');
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      const loggedUser = await login(email, password, activeTab);
      // Role-based redirection
      if (loggedUser.isStaff || loggedUser.role === 'admin' || loggedUser.role === 'superadmin') {
        navigate('/admin/dashboard');
      } else if (loggedUser.role === 'educator') {
        navigate('/educator/dashboard');
      } else {
        if (!loggedUser.targetExam || !loggedUser.phone) {
          navigate('/student/profile-setup');
        } else {
          navigate(returnTo || '/student/dashboard');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Invalid email or password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="py-16 bg-[#FFF9ED] min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl border-2 border-[#E3D8BE] shadow-xl overflow-hidden">
        
        {/* Card Header */}
        <div className="bg-[#061426] p-6 text-center text-white border-b border-[#D9A52E]/30 space-y-2">
          <img 
            src="/assets/sims-logo.png" 
            alt="SIMS Logo" 
            className="w-12 h-12 object-contain mx-auto rounded-lg border border-[#D9A52E]"
          />
          <h2 className="font-serif font-bold text-2xl text-[#F0C45B]">
            {activeTab === 'student' ? 'SIMS Student Portal' : 'SIMS Educator Studio'}
          </h2>
          <p className="text-xs text-[#E3D8BE]">
            {activeTab === 'student' 
              ? 'Access your classroom videos, enrolled modules & test records'
              : 'Sign in to manage your curriculum modules, lectures & assessments'}
          </p>
        </div>

        {/* Portal Switching Tabs */}
        <div className="grid grid-cols-2 border-b border-[#E3D8BE] bg-[#F8F4EA]/60 text-xs font-bold">
          <button
            type="button"
            onClick={() => { setActiveTab('student'); setError(''); }}
            className={`py-3 flex items-center justify-center gap-1.5 transition ${
              activeTab === 'student'
                ? 'bg-white text-[#A87519] border-b-2 border-[#D9A52E]'
                : 'text-[#687386] hover:text-[#061426]'
            }`}
          >
            <GraduationCap className="w-4 h-4" /> Student Login
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('educator'); setError(''); }}
            className={`py-3 flex items-center justify-center gap-1.5 transition ${
              activeTab === 'educator'
                ? 'bg-white text-[#A87519] border-b-2 border-[#D9A52E]'
                : 'text-[#687386] hover:text-[#061426]'
            }`}
          >
            <Briefcase className="w-4 h-4" /> Teacher / Educator
          </button>
        </div>

        {activeTab === 'educator' && (
          <div className="p-3 bg-amber-50 border-b border-amber-200 text-[11px] text-amber-900 flex items-center justify-between">
            <span>Teachers sign in here. Interested in joining faculty?</span>
            <Link to="/educator/apply" className="font-bold text-[#A87519] hover:underline whitespace-nowrap ml-2">
              Apply to Teach &rarr;
            </Link>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleLogin} className="p-8 space-y-5">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 text-red-700 text-xs border border-red-200">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#263347] mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#687386]" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-9 pr-3.5 py-2.5 text-sm rounded-lg border border-[#E3D8BE] focus:border-[#D9A52E] focus:outline-none focus:ring-1 focus:ring-[#D9A52E]"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-semibold text-[#263347]">
                Password
              </label>
              <Link to="/forgot-password" className="text-xs text-[#A87519] hover:underline">
                Forgot Password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#687386]" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-10 py-2.5 text-sm rounded-lg border border-[#E3D8BE] focus:border-[#D9A52E] focus:outline-none focus:ring-1 focus:ring-[#D9A52E]"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#687386] hover:text-[#061426] p-0.5 focus:outline-none"
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="btn-sims-primary w-full py-3 text-sm font-bold shadow flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {isLoading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /><span>Authenticating…</span></>
            ) : (
              <>
                <span>Sign in to {activeTab === 'student' ? 'Student Portal' : 'Educator Studio'}</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </>
            )}
          </button>

          {/* Divider */}
          <div className="relative my-3">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#E3D8BE]" />
            </div>
            <div className="relative flex justify-center text-[11px] uppercase tracking-wider">
              <span className="bg-white px-2.5 text-[#687386] font-medium">Or continue with</span>
            </div>
          </div>

          {/* Google Sign In */}
          <GoogleLoginButton
            portal={activeTab}
            disabled={isLoading}
            onSuccess={handleGoogleSuccess}
            onError={(msg) => setError(msg)}
            theme="light"
          />

          <div className="text-center pt-2 text-xs text-[#687386]">
            {activeTab === 'student' ? (
              <>
                New to SIMS Raipur?{' '}
                <Link to="/signup" className="text-[#A87519] font-bold hover:underline">
                  Create a Student Account
                </Link>
              </>
            ) : (
              <>
                Looking for educator access?{' '}
                <Link to="/educator/apply" className="text-[#A87519] font-bold hover:underline">
                  Submit Faculty Application
                </Link>
              </>
            )}
          </div>
        </form>

      </div>
    </div>
  );
};

export default LoginPage;
