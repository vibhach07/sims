import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { User, Mail, Phone, Lock, ArrowRight, Loader2, CheckCircle2, Eye, EyeOff } from 'lucide-react';

const TARGET_EXAMS = [
  'GATE (Engineering & Sciences)',
  'IIT-JAM (Maths, Chemistry, Physics)',
  'NIMCET (MCA Entrance)',
  'NET / SET / CSIR-NET',
  'CAT / MBA Entrance',
  'NEET / Medical Entrance',
  'CA Foundation',
  'JEE (Main & Advanced)',
];

export const SignupPage: React.FC = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    targetExam: TARGET_EXAMS[0],
    password: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName || !formData.email || !formData.password) {
      setError('Please fill all required fields.');
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      await register({
        email: formData.email,
        password: formData.password,
        first_name: formData.firstName,
        last_name: formData.lastName,
        name: [formData.firstName, formData.lastName].filter(Boolean).join(' ').trim(),
        phone: formData.phone,
        target_exam: formData.targetExam,
      });
      setIsRegistered(true);
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try a different email.');
    } finally {
      setIsLoading(false);
    }
  };

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setFormData(prev => ({ ...prev, [field]: e.target.value }));

  return (
    <div className="py-16 bg-[#FFF9ED] min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl border-2 border-[#E3D8BE] shadow-xl overflow-hidden">
        
        <div className="bg-[#061426] p-8 text-center text-white border-b border-[#D9A52E]/30 space-y-2">
          <img 
            src="/assets/sims-logo.png" 
            alt="SIMS Logo" 
            className="w-14 h-14 object-contain mx-auto rounded-lg border border-[#D9A52E]"
          />
          <h2 className="font-serif font-bold text-2xl text-[#F0C45B]">
            Create Student Account
          </h2>
          <p className="text-xs text-[#E3D8BE]">
            Join SIMS Raipur to access live classes, tests and study resources
          </p>
        </div>

        {isRegistered ? (
          <div className="p-8 text-center space-y-4">
            <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto" />
            <h3 className="font-serif font-bold text-2xl text-[#061426]">Registration Successful!</h3>
            <p className="text-sm text-[#263347]">
              An activation link has been sent to <strong>{formData.email}</strong>.
            </p>
            <p className="text-xs text-[#687386]">
              Please check your email inbox to verify your account. You can also proceed directly to your student dashboard.
            </p>
            <button
              onClick={() => navigate('/student/dashboard')}
              className="w-full py-3 rounded-lg bg-[#D9A52E] hover:bg-[#F0C45B] text-[#061426] font-bold text-sm shadow transition flex items-center justify-center gap-2 mt-4"
            >
              Continue to Student Dashboard <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <form onSubmit={handleSignup} className="p-8 space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-red-50 text-red-700 text-xs border border-red-200">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#263347] mb-1.5">First Name *</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#687386]" />
                  <input
                    type="text"
                    required
                    placeholder="Aarav"
                    value={formData.firstName}
                    onChange={set('firstName')}
                    className="w-full pl-9 pr-2 py-2 text-sm rounded-lg border border-[#E3D8BE] focus:border-[#D9A52E] focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#263347] mb-1.5">Last Name</label>
                <input
                  type="text"
                  placeholder="Sharma"
                  value={formData.lastName}
                  onChange={set('lastName')}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-[#E3D8BE] focus:border-[#D9A52E] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#263347] mb-1.5">Email Address *</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#687386]" />
                <input
                  type="email"
                  required
                  placeholder="aarav@example.com"
                  value={formData.email}
                  onChange={set('email')}
                  className="w-full pl-9 pr-3.5 py-2 text-sm rounded-lg border border-[#E3D8BE] focus:border-[#D9A52E] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#263347] mb-1.5">Mobile Phone</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#687386]" />
                <input
                  type="tel"
                  placeholder="9876543210"
                  value={formData.phone}
                  onChange={set('phone')}
                  className="w-full pl-9 pr-3.5 py-2 text-sm rounded-lg border border-[#E3D8BE] focus:border-[#D9A52E] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#263347] mb-1.5">Target Competitive Exam *</label>
              <select
                value={formData.targetExam}
                onChange={set('targetExam')}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-[#E3D8BE] focus:border-[#D9A52E] focus:outline-none bg-white"
              >
                {TARGET_EXAMS.map(exam => (
                  <option key={exam} value={exam}>{exam}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#263347] mb-1.5">Create Password *</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#687386]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Min. 8 characters"
                  value={formData.password}
                  onChange={set('password')}
                  className="w-full pl-9 pr-10 py-2 text-sm rounded-lg border border-[#E3D8BE] focus:border-[#D9A52E] focus:outline-none"
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
              className="btn-sims-primary w-full py-3 text-sm font-bold shadow flex items-center justify-center gap-2 mt-4 disabled:opacity-60"
            >
              {isLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /><span>Creating Account…</span></>
              ) : (
                <><span>Complete Registration</span><ArrowRight className="w-4 h-4 ml-1" /></>
              )}
            </button>

            <div className="text-center pt-2 text-xs text-[#687386]">
              Already registered?{' '}
              <Link to="/login" className="text-[#A87519] font-bold hover:underline">
                Log in here
              </Link>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};
