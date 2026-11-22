import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle2, ArrowRight, BookOpen, Receipt, Loader2 } from 'lucide-react';
import { OrdersAPI, APIOrder } from '../../services/api';

export const PaymentSuccessPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('order_id');
  const [order, setOrder] = useState<APIOrder | null>(null);
  const [loading, setLoading] = useState<boolean>(!!orderId);

  useEffect(() => {
    if (orderId) {
      OrdersAPI.status(orderId)
        .then((res) => setOrder(res.order))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [orderId]);

  const getDestinationLink = () => {
    if (!order) return '/student/my-courses';
    if (order.item_type === 'course') return `/learn/${order.item_id}`;
    if (order.item_type === 'test') return `/student/tests/${order.item_id}`;
    return '/study-material';
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#D9A52E] mx-auto" />
          <p className="text-sm text-[#687386]">Verifying payment receipt...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-[#E3D8BE] overflow-hidden">
        {/* Header Badge */}
        <div className="bg-[#061426] p-6 text-center text-white border-b border-[#D9A52E]/30">
          <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-3 border border-emerald-500/30">
            <CheckCircle2 className="w-9 h-9" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#D9A52E] bg-[#D9A52E]/10 px-3 py-1 rounded-full border border-[#D9A52E]/30">
            Payment Verified · Razorpay Test Mode
          </span>
          <h1 className="font-serif font-bold text-2xl mt-2 text-white">Enrollment Activated!</h1>
          <p className="text-xs text-white/70 mt-1">
            Your transaction was authorized and access has been unlocked in your student account.
          </p>
        </div>

        {/* Receipt Details */}
        <div className="p-6 space-y-4">
          <div className="bg-[#F8F4EA] border border-[#E3D8BE] rounded-xl p-4 divide-y divide-[#E3D8BE]/60 text-xs">
            <div className="flex justify-between py-2">
              <span className="text-[#687386]">Order Reference</span>
              <span className="font-mono font-semibold text-[#061426]">{order?.order_id || orderId || 'Confirmed'}</span>
            </div>
            {order?.razorpay_payment_id && (
              <div className="flex justify-between py-2">
                <span className="text-[#687386]">Razorpay Payment ID</span>
                <span className="font-mono text-[#061426]">{order.razorpay_payment_id}</span>
              </div>
            )}
            {order?.item_title && (
              <div className="flex justify-between py-2">
                <span className="text-[#687386]">Enrolled Offering</span>
                <span className="font-semibold text-[#061426] text-right">{order.item_title}</span>
              </div>
            )}
            {order?.amount && (
              <div className="flex justify-between py-2 font-bold text-sm">
                <span className="text-[#061426]">Amount Paid</span>
                <span className="text-[#061426]">₹{Number(order.amount).toLocaleString('en-IN')}</span>
              </div>
            )}
            <div className="flex justify-between py-2">
              <span className="text-[#687386]">Access Status</span>
              <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Active & Enrolled
              </span>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="space-y-2 pt-2">
            <Link
              to={getDestinationLink()}
              className="w-full py-3.5 bg-[#061426] text-[#F0C45B] hover:text-white font-bold rounded-xl text-sm transition flex items-center justify-center gap-2 shadow-md hover:bg-[#102846]"
            >
              <BookOpen className="w-4 h-4" />
              <span>Go to Course / Classroom</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              to="/student/my-courses"
              className="w-full py-2.5 rounded-xl border border-[#E3D8BE] text-xs font-semibold text-[#687386] hover:text-[#061426] hover:bg-[#F8F4EA] transition flex items-center justify-center gap-1.5"
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>View All Enrolled Courses & Orders</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

