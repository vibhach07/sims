import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Lock, Mail, ArrowRight, Loader2, Briefcase, Award, Eye, EyeOff } from 'lucide-react';
import { GoogleLoginButton } from '../../components/auth/GoogleLoginButton';

export const EducatorLoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, loginWithGoogle, user } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      if (user.isStaff || user.role === 'admin' || user.role === 'superadmin') {
        navigate('/admin/dashboard');
      } else if (user.role === 'educator') {
        navigate('/educator/dashboard');
      } else {
        navigate('/student/dashboard');
      }
    }
  }, [user, navigate]);

  const handleGoogleSuccess = async (credential: string) => {
    setError('');
    setIsLoading(true);
    try {
      const loggedUser = await loginWithGoogle(credential, 'educator');
      if (loggedUser.isStaff || loggedUser.role === 'admin' || loggedUser.role === 'superadmin') {
        navigate('/admin/dashboard');
      } else if (loggedUser.role === 'educator') {
        navigate('/educator/dashboard');
      } else {
        navigate('/student/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Educator Google authentication failed.');
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
      const loggedUser = await login(email, password, 'educator');
      if (loggedUser.isStaff || loggedUser.role === 'admin' || loggedUser.role === 'superadmin') {
        navigate('/admin/dashboard');
      } else if (loggedUser.role === 'educator') {
        navigate('/educator/dashboard');
      } else {
        navigate('/student/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="py-16 bg-[#0B1528] min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-[#101F38] rounded-2xl border-2 border-[#D9A52E]/40 shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="bg-[#060D1A] p-8 text-center text-white border-b border-[#D9A52E]/30 space-y-3">
          <div className="inline-flex p-3 rounded-xl bg-[#D9A52E]/20 text-[#F0C45B] border border-[#D9A52E]/40">
            <Briefcase className="w-8 h-8" />
          </div>
          <h2 className="font-serif font-bold text-2xl text-[#F0C45B]">
            SIMS Educator Studio
          </h2>
          <p className="text-xs text-[#E3D8BE]/80 max-w-xs mx-auto">
            Authorized portal for course directors, master lecturers & academic evaluators.
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleLogin} className="p-8 space-y-5">
          {error && (
            <div className="p-3 rounded-lg bg-red-950/80 text-rose-300 text-xs border border-rose-800">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#E3D8BE] mb-1.5">
              Faculty Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A2B3C8]" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="faculty@sims.in"
                className="w-full pl-9 pr-3.5 py-2.5 text-sm rounded-lg bg-[#060D1A] text-white border border-[#233554] focus:border-[#D9A52E] focus:outline-none focus:ring-1 focus:ring-[#D9A52E]"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-semibold text-[#E3D8BE]">
                Password
              </label>
              <Link to="/forgot-password" className="text-xs text-[#D9A52E] hover:underline">
                Forgot Password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A2B3C8]" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-10 py-2.5 text-sm rounded-lg bg-[#060D1A] text-white border border-[#233554] focus:border-[#D9A52E] focus:outline-none focus:ring-1 focus:ring-[#D9A52E]"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A2B3C8] hover:text-[#D9A52E] p-0.5 focus:outline-none"
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
            className="w-full py-3 bg-[#D9A52E] hover:bg-[#F0C45B] text-[#061426] text-sm font-bold rounded-lg shadow-lg flex items-center justify-center gap-2 transition disabled:opacity-60"
          >
            {isLoading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /><span>Verifying Educator Session…</span></>
            ) : (
              <><span>Enter Educator Studio</span><ArrowRight className="w-4 h-4 ml-1" /></>
            )}
          </button>

          {/* Divider */}
          <div className="relative my-3">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#233554]" />
            </div>
            <div className="relative flex justify-center text-[11px] uppercase tracking-wider">
              <span className="bg-[#101F38] px-2.5 text-[#A2B3C8] font-medium">Or continue with</span>
            </div>
          </div>

          {/* Google Sign In */}
          <GoogleLoginButton
            portal="educator"
            disabled={isLoading}
            onSuccess={handleGoogleSuccess}
            onError={(msg) => setError(msg)}
            theme="dark"
          />

          <div className="pt-4 border-t border-[#233554] text-center space-y-2">
            <p className="text-xs text-[#A2B3C8]">
              Want to join SIMS as an instructor?
            </p>
            <Link
              to="/educator/apply"
              className="inline-flex items-center gap-1.5 text-xs text-[#F0C45B] font-bold hover:underline"
            >
              <Award className="w-3.5 h-3.5" /> Submit Educator Application
            </Link>
            <div>
              <Link to="/login" className="text-[11px] text-[#A2B3C8] hover:text-white underline">
                &larr; Return to Student Sign-in
              </Link>
            </div>
          </div>
        </form>

      </div>
    </div>
  );
};

export default EducatorLoginPage;
