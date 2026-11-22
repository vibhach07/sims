import React, { useState } from 'react';
import { X, ShieldCheck, Lock, CreditCard, AlertTriangle, CheckCircle2, AlertCircle } from 'lucide-react';
import { usePurchase, CheckoutItem } from '../../contexts/PurchaseContext';
import { useAuth } from '../../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { APIOrder } from '../../services/api';

export const CheckoutModal: React.FC = () => {
  const { checkoutItem, isCheckoutOpen, closeCheckout, startRazorpayPayment } = usePurchase();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<'details' | 'processing' | 'success' | 'error'>('details');
  const [completedOrder, setCompletedOrder] = useState<APIOrder | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isCheckoutOpen || !checkoutItem) return null;

  const item = checkoutItem as CheckoutItem;
  const discount = item.originalPrice ? Math.round((1 - item.price / item.originalPrice) * 100) : 0;

  const handleConfirm = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setStep('processing');
    setErrorMessage('');

    await startRazorpayPayment(item, {
      onSuccess: (order: APIOrder) => {
        setCompletedOrder(order);
        setStep('success');
        setIsSubmitting(false);
      },
      onError: (errorMsg: string) => {
        setErrorMessage(errorMsg);
        setStep('error');
        setIsSubmitting(false);
      },
      onDismiss: () => {
        setStep('details');
        setIsSubmitting(false);
      }
    });
  };

  const handleClose = () => {
    setStep('details');
    setErrorMessage('');
    setIsSubmitting(false);
    closeCheckout();
  };

  const getDestinationLink = () => {
    if (!item) return '/student/dashboard';
    if (item.type === 'course') return `/learn/${item.id}/1`;
    if (item.type === 'test') return `/student/tests/${item.id}`;
    return '/study-material';
  };

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget && !isSubmitting) handleClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label="Secure Checkout"
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-[#E3D8BE]">

        {/* Header */}
        <div className="bg-[#061426] px-6 py-4 flex items-center justify-between border-b border-[#D9A52E]/30">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-[#D9A52E]" />
            <span className="font-serif font-bold text-base text-[#F0C45B]">SIMS Secure Checkout</span>
          </div>
          {!isSubmitting && (
            <button onClick={handleClose} className="text-white/60 hover:text-white transition p-1 rounded-lg hover:bg-white/10">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {step === 'details' && (
          <div className="p-6 space-y-5">
            {!isAuthenticated && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                <strong>Sign in required:</strong>{' '}
                <Link to="/login" onClick={handleClose} className="underline font-semibold">Log in</Link>
                {' '}or{' '}
                <Link to="/signup" onClick={handleClose} className="underline font-semibold">create an account</Link>
                {' '}to link this purchase to your student learning portal.
              </div>
            )}

            {/* Product info */}
            <div className="bg-[#F8F4EA] border border-[#E3D8BE] rounded-xl p-4 space-y-1">
              <div className="text-[10px] font-bold text-[#A87519] uppercase tracking-widest">
                {item.type === 'course' ? 'Full Course Enrollment' : item.type === 'test' ? 'CBT Mock Test Series' : 'Downloadable Study Material'}
              </div>
              <h3 className="font-serif font-bold text-base text-[#061426] leading-snug">{item.title}</h3>
              {item.subtitle && <p className="text-xs text-[#687386]">{item.subtitle}</p>}
            </div>

            {/* Pricing */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#263347]">Authoritative Price</span>
                <div className="flex items-center gap-2">
                  {item.originalPrice && (
                    <span className="text-sm text-[#687386] line-through">₹{item.originalPrice.toLocaleString('en-IN')}</span>
                  )}
                  <span className="text-xl font-bold text-[#061426]">₹{item.price.toLocaleString('en-IN')}</span>
                  {discount > 0 && (
                    <span className="text-xs font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-md">{discount}% OFF</span>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-[#687386] pb-2 border-b border-[#E3D8BE]">
                <span>Applicable GST (18%)</span>
                <span>Included</span>
              </div>
              <div className="flex items-center justify-between font-bold text-base text-[#061426]">
                <span>Total Payable</span>
                <span className="text-lg text-[#061426]">₹{item.price.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Payment methods row */}
            <div className="space-y-1.5">
              <p className="text-[11px] text-[#687386] font-medium">Supported Payment Channels</p>
              <div className="flex items-center gap-2.5 flex-wrap">
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#073B8B] rounded-lg text-white text-[11px] font-bold shadow-sm">
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Razorpay Checkout</span>
                </div>
                <span className="text-[11px] text-[#687386]">UPI · Google Pay · PhonePe · Cards · Net Banking</span>
              </div>
            </div>

            {/* CTA */}
            <button
              onClick={handleConfirm}
              disabled={!isAuthenticated || isSubmitting}
              className={`w-full py-3.5 font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-md ${
                !isAuthenticated || isSubmitting
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : 'bg-[#D9A52E] text-[#061426] hover:bg-[#F0C45B] active:scale-[0.98]'
              }`}
            >
              <Lock className="w-4 h-4" />
              <span>{isSubmitting ? 'Starting Razorpay Checkout…' : `Proceed to Pay ₹${item.price.toLocaleString('en-IN')}`}</span>
            </button>

            <p className="text-[10px] text-center text-[#A0A8B5]">
              <ShieldCheck className="w-3 h-3 inline mr-1 text-green-500" />
              256-bit SSL encrypted · Verified backend transaction
            </p>
          </div>
        )}

        {step === 'processing' && (
          <div className="p-10 flex flex-col items-center justify-center gap-5 min-h-[300px]">
            <div className="w-14 h-14 border-4 border-[#E3D8BE] border-t-[#D9A52E] rounded-full animate-spin" />
            <div className="text-center space-y-1">
              <p className="font-serif font-bold text-lg text-[#061426]">Authorizing Transaction…</p>
              <p className="text-xs text-[#687386]">Opening Razorpay gateway & preparing signature verification</p>
            </div>
          </div>
        )}

        {step === 'error' && (
          <div className="p-8 flex flex-col items-center justify-center gap-4 min-h-[300px] text-center">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-lg text-[#061426]">Payment Could Not Be Completed</h3>
              <p className="text-xs text-[#687386] mt-1 max-w-xs">{errorMessage || 'The payment was cancelled or declined. No amount was charged.'}</p>
            </div>
            <div className="flex gap-3 w-full pt-2">
              <button
                onClick={() => setStep('details')}
                className="flex-1 py-2.5 rounded-xl border border-[#E3D8BE] text-xs font-semibold hover:bg-[#F8F4EA]"
              >
                Try Again
              </button>
              <button
                onClick={handleClose}
                className="flex-1 py-2.5 rounded-xl bg-[#061426] text-white text-xs font-semibold hover:bg-[#102846]"
              >
                Close
              </button>
            </div>
            {errorMessage && (
              <Link
                to={`/payment/failure?reason=${encodeURIComponent(errorMessage)}`}
                onClick={handleClose}
                className="text-[11px] text-[#687386] hover:underline pt-1"
              >
                View failure details receipt
              </Link>
            )}
          </div>
        )}

        {step === 'success' && (
          <div className="p-8 flex flex-col items-center justify-center gap-5 min-h-[300px] text-center">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-green-700 bg-green-50 px-2.5 py-0.5 rounded-full border border-green-200 uppercase tracking-widest">
                Payment Confirmed
              </span>
              <h3 className="font-serif font-bold text-xl text-[#061426] mt-2">Access Activated!</h3>
              <p className="text-xs text-[#687386] mt-1">
                Your purchase has been verified and permanently linked to your student account.
              </p>
              {completedOrder && (
                <p className="text-[11px] font-mono text-[#A87519] mt-2 bg-[#F8F4EA] py-1 px-2 rounded border border-[#E3D8BE]">
                  Ref: {completedOrder.order_id}
                </p>
              )}
            </div>

            <div className="space-y-2 w-full pt-1">
              <button
                onClick={() => {
                  handleClose();
                  navigate(getDestinationLink());
                }}
                className="w-full py-3 bg-[#061426] text-white rounded-xl text-xs font-bold hover:bg-[#102846] transition"
              >
                Start Learning Now &rarr;
              </button>

              {completedOrder && (
                <Link
                  to={`/payment/success?order_id=${completedOrder.order_id}`}
                  onClick={handleClose}
                  className="w-full py-2.5 rounded-xl border border-[#E3D8BE] text-xs font-semibold text-[#687386] hover:text-[#061426] hover:bg-[#F8F4EA] transition flex items-center justify-center gap-1.5"
                >
                  <span>View Full Receipt Page</span>
                </Link>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
