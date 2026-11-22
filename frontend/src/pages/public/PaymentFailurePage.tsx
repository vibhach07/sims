import React from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { AlertCircle, RotateCcw, ArrowLeft, ShieldAlert } from 'lucide-react';

export const PaymentFailurePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('order_id');
  const reason = searchParams.get('reason') || 'Transaction was declined or cancelled by the user/bank.';

  return (
    <div className="min-h-[70vh] flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-[#E3D8BE] overflow-hidden">
        {/* Header Badge */}
        <div className="bg-[#061426] p-6 text-center text-white border-b border-[#D9A52E]/30">
          <div className="w-16 h-16 bg-rose-500/20 text-rose-400 rounded-full flex items-center justify-center mx-auto mb-3 border border-rose-500/30">
            <AlertCircle className="w-9 h-9" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-rose-300 bg-rose-950/60 px-3 py-1 rounded-full border border-rose-500/30">
            Payment Not Completed
          </span>
          <h1 className="font-serif font-bold text-2xl mt-2 text-white">Transaction Unsuccessful</h1>
          <p className="text-xs text-white/70 mt-1">
            No money has been debited or your transaction was cancelled.
          </p>
        </div>

        {/* Diagnostic info */}
        <div className="p-6 space-y-4">
          <div className="bg-[#F8F4EA] border border-[#E3D8BE] rounded-xl p-4 divide-y divide-[#E3D8BE]/60 text-xs">
            {orderId && (
              <div className="flex justify-between py-2">
                <span className="text-[#687386]">Order Reference</span>
                <span className="font-mono text-[#061426]">{orderId}</span>
              </div>
            )}
            <div className="flex justify-between py-2 items-start gap-4">
              <span className="text-[#687386]">Reason</span>
              <span className="text-rose-700 font-medium text-right">{reason}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-[#687386]">Access Status</span>
              <span className="text-slate-600 font-medium bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                Not Granted
              </span>
            </div>
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p>
              If your bank account was charged, Razorpay will automatically reverse the amount to your source account within 5-7 business days.
            </p>
          </div>

          {/* Action CTAs */}
          <div className="space-y-2 pt-2">
            <Link
              to="/courses"
              className="w-full py-3.5 bg-[#061426] text-[#F0C45B] hover:text-white font-bold rounded-xl text-sm transition flex items-center justify-center gap-2 shadow-md hover:bg-[#102846]"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Retry from Courses Catalogue</span>
            </Link>

            <Link
              to="/student/my-courses"
              className="w-full py-2.5 rounded-xl border border-[#E3D8BE] text-xs font-semibold text-[#687386] hover:text-[#061426] hover:bg-[#F8F4EA] transition flex items-center justify-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Student Portal</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

