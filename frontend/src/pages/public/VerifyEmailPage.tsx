import React, { useEffect, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2, ArrowRight, Mail } from 'lucide-react';
import { AuthAPI, tokenStore } from '../../services/api';

export const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [errorMessage, setErrorMessage] = useState('');
  const [resendEmail, setResendEmail] = useState('');
  const [resendStatus, setResendStatus] = useState<'idle' | 'sending' | 'sent'>('idle');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMessage('Missing verification token in link.');
      return;
    }

    AuthAPI.verifyEmail(token)
      .then((res) => {
        if (res.token) {
          tokenStore.set(res.token);
        }
        setStatus('success');
      })
      .catch((err: any) => {
        setStatus('error');
        setErrorMessage(err.message || 'Verification token is invalid or has expired.');
      });
  }, [token]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail) return;

    setResendStatus('sending');
    try {
      await AuthAPI.resendVerification(resendEmail);
      setResendStatus('sent');
    } catch {
      setResendStatus('sent'); // Non-enumerating UI
    }
  };

  return (
    <div className="py-16 bg-[#FFF9ED] min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl border-2 border-[#E3D8BE] shadow-xl p-8 space-y-6 text-center">
        {status === 'verifying' && (
          <div className="space-y-4 py-8">
            <Loader2 className="w-12 h-12 text-[#A87519] animate-spin mx-auto" />
            <h2 className="font-serif font-bold text-2xl text-[#061426]">Verifying Your Email</h2>
            <p className="text-xs text-[#687386]">Please wait while we validate your activation token...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4 py-4">
            <CheckCircle2 className="w-14 h-14 text-green-600 mx-auto" />
            <h2 className="font-serif font-bold text-2xl text-[#061426]">Email Verified!</h2>
            <p className="text-sm text-[#263347]">
              Your student account has been successfully verified. Welcome to SIMS Raipur!
            </p>
            <button
              onClick={() => navigate('/student/dashboard')}
              className="mt-4 w-full py-3 rounded-lg bg-[#D9A52E] hover:bg-[#F0C45B] text-[#061426] font-bold text-sm shadow transition flex items-center justify-center gap-2"
            >
              Go to Dashboard <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4 py-2">
            <XCircle className="w-14 h-14 text-red-500 mx-auto" />
            <h2 className="font-serif font-bold text-2xl text-[#061426]">Verification Failed</h2>
            <p className="text-sm text-red-700 bg-red-50 p-3 rounded-lg border border-red-200">
              {errorMessage}
            </p>

            <div className="pt-4 border-t border-[#E3D8BE] text-left space-y-3">
              <h3 className="text-xs font-bold text-[#061426] uppercase tracking-wider">Request New Link</h3>
              {resendStatus === 'sent' ? (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-xs text-green-800">
                  If an account exists, a new activation email has been dispatched.
                </div>
              ) : (
                <form onSubmit={handleResend} className="space-y-2">
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#687386]" />
                    <input
                      type="email"
                      required
                      placeholder="Your registered email"
                      value={resendEmail}
                      onChange={(e) => setResendEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-[#E3D8BE] focus:border-[#D9A52E] focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={resendStatus === 'sending'}
                    className="w-full py-2 bg-[#061426] hover:bg-[#263347] text-white text-xs font-semibold rounded-lg transition"
                  >
                    {resendStatus === 'sending' ? 'Sending...' : 'Resend Verification Email'}
                  </button>
                </form>
              )}
            </div>

            <div className="pt-2">
              <Link to="/login" className="text-xs text-[#A87519] hover:underline font-semibold">
                Back to Login
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
