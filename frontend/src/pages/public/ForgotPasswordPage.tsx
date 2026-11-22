import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { AuthAPI } from '../../services/api';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setError('');
    setIsLoading(true);
    try {
      await AuthAPI.requestPasswordReset(email);
      setSent(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send recovery link. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="py-16 bg-[#FFF9ED] min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl border-2 border-[#E3D8BE] shadow-xl p-8 space-y-6">
        <div>
          <Link to="/login" className="inline-flex items-center gap-1.5 text-xs text-[#A87519] hover:underline mb-4 font-semibold">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Login
          </Link>
          <h2 className="font-serif font-bold text-2xl text-[#061426]">
            Reset Password
          </h2>
          <p className="text-xs text-[#687386] mt-1">
            Enter the registered email associated with your student account.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {sent ? (
          <div className="p-4 bg-green-50 border border-green-200 rounded-xl space-y-2 text-center">
            <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto" />
            <p className="text-sm font-semibold text-green-800">Password Reset Link Dispatched</p>
            <p className="text-xs text-green-700">
              If an account exists for <strong>{email}</strong>, a recovery link has been sent. Check your inbox to set a new password.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#263347] mb-1.5">Registered Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#687386]" />
                <input
                  type="email"
                  required
                  placeholder="student@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 text-sm rounded-lg border border-[#E3D8BE] focus:border-[#D9A52E] focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-lg bg-[#D9A52E] hover:bg-[#F0C45B] text-[#061426] font-bold text-sm shadow transition flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending link...
                </>
              ) : (
                'Send Recovery Link'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
