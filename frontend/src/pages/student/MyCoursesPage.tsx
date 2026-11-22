import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { CoursesAPI, APICourse, OrdersAPI, APIOrder } from '../../services/api';
import { PlayCircle, Clock, BookOpen, Loader2, Receipt, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

export const MyCoursesPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'courses' | 'orders'>('courses');
  const [courses, setCourses] = useState<APICourse[]>([]);
  const [orders, setOrders] = useState<APIOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    CoursesAPI.myCourses()
      .then(data => {
        if (data.length > 0) {
          setCourses(data);
        } else {
          CoursesAPI.list().then(pub => setCourses(pub.slice(0, 3)));
        }
      })
      .catch(() => {
        CoursesAPI.list().then(pub => setCourses(pub.slice(0, 3)));
      })
      .finally(() => setIsLoading(false));
  }, []);

  const loadOrders = () => {
    setOrdersLoading(true);
    OrdersAPI.myOrders()
      .then(data => setOrders(data))
      .catch(() => setOrders([]))
      .finally(() => setOrdersLoading(false));
  };

  useEffect(() => {
    if (activeTab === 'orders') {
      loadOrders();
    }
  }, [activeTab]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-serif font-bold text-3xl text-[#061426]">
            {activeTab === 'courses' ? 'My Enrolled Courses' : 'Order & Payment History'}
          </h1>
          <p className="text-sm text-[#687386] mt-1">
            {activeTab === 'courses'
              ? 'Access your enrolled batch curricula, recorded lecture backups, and module exercises.'
              : 'Review your transactions, payment IDs, and access status.'}
          </p>
        </div>

        <div className="inline-flex rounded-lg border border-[#E3D8BE] p-1 bg-[#F8F4EA] self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('courses')}
            className={`px-4 py-2 text-xs font-bold rounded-md transition ${
              activeTab === 'courses'
                ? 'bg-[#061426] text-white shadow-sm'
                : 'text-[#687386] hover:text-[#061426]'
            }`}
          >
            My Courses
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 text-xs font-bold rounded-md transition flex items-center gap-1.5 ${
              activeTab === 'orders'
                ? 'bg-[#061426] text-white shadow-sm'
                : 'text-[#687386] hover:text-[#061426]'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" /> Order History
          </button>
        </div>
      </div>

      {activeTab === 'courses' ? (
        isLoading ? (
          <div className="py-16 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-[#D9A52E] mx-auto mb-3" />
            <p className="text-sm text-[#687386]">Loading enrolled courses...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {courses.map((course) => (
              <div 
                key={course.id}
                tabIndex={0}
                role="region"
                aria-label={`Enrolled course: ${course.title}`}
                className="sims-card sims-card-interactive overflow-hidden flex flex-col justify-between group outline-none"
              >
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#A87519] bg-[#F8F4EA] px-2.5 py-1 rounded border border-[#E3D8BE]">
                      {course.category_label}
                    </span>
                    <span className="text-xs text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
                      ● Active Batch
                    </span>
                  </div>

                  <div>
                    <h3 className="font-serif font-bold text-xl text-[#061426] group-hover:text-[#A87519] transition">
                      {course.title}
                    </h3>
                    <p className="text-xs text-[#687386] mt-1 font-normal">
                      {course.subtitle}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-[#687386] pt-2">
                    <span className="flex items-center gap-1 font-medium">
                      <Clock className="w-3.5 h-3.5 text-[#D9A52E]" /> {course.duration}
                    </span>
                    <span className="flex items-center gap-1 font-medium">
                      <BookOpen className="w-3.5 h-3.5 text-[#D9A52E]" /> {course.lecture_count} Lectures
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-[#F8F4EA] border-t border-[#E3D8BE] flex items-center justify-between">
                  <Link
                    to={`/courses/${course.slug}`}
                    className="text-xs font-semibold text-[#687386] hover:text-[#061426] transition"
                  >
                    Syllabus Overview
                  </Link>

                  <Link
                    to={`/learn/${course.slug}/1`}
                    className="btn-sims-primary px-4 py-2 text-xs font-bold flex items-center gap-1.5 shadow-sm"
                  >
                    <PlayCircle className="w-3.5 h-3.5" /> Open Classroom
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-[#687386]">
              Verified receipts and transaction records processed via Razorpay.
            </p>
            <button
              onClick={loadOrders}
              disabled={ordersLoading}
              className="text-xs font-medium text-[#A87519] hover:underline flex items-center gap-1"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${ordersLoading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>

          {ordersLoading ? (
            <div className="py-16 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-[#D9A52E] mx-auto mb-3" />
              <p className="text-sm text-[#687386]">Loading payment history...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="p-12 text-center sims-card bg-white">
              <Receipt className="w-12 h-12 text-[#98A2B3] mx-auto mb-3" />
              <h3 className="font-serif font-bold text-lg text-[#061426]">No Transactions Found</h3>
              <p className="text-xs text-[#687386] mt-1 max-w-sm mx-auto">
                You have not completed any paid course or test series purchases yet.
              </p>
            </div>
          ) : (
            <div className="sims-card overflow-x-auto bg-white">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#F8F4EA] border-b border-[#E3D8BE] text-[#061426] font-semibold">
                    <th className="py-3 px-4">Order ID</th>
                    <th className="py-3 px-4">Item</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Payment ID</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Access</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E3D8BE]/50">
                  {orders.map((o) => (
                    <tr key={o.order_id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 font-mono font-medium text-[#061426]">
                        {o.order_id}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-[#061426]">{o.item_title}</div>
                        <div className="text-[10px] text-[#687386] uppercase tracking-wide">{o.item_type}</div>
                      </td>
                      <td className="py-3 px-4 font-semibold text-[#061426]">
                        ₹{Number(o.amount).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-[#687386]">
                        {o.razorpay_payment_id || '-'}
                      </td>
                      <td className="py-3 px-4 text-[#687386]">
                        {new Date(o.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="py-3 px-4">
                        {o.status === 'paid' && (
                          <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-semibold text-[11px] border border-emerald-200">
                            <CheckCircle className="w-3 h-3" /> Paid
                          </span>
                        )}
                        {o.status === 'pending' && (
                          <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-semibold text-[11px] border border-amber-200">
                            Pending
                          </span>
                        )}
                        {o.status === 'failed' && (
                          <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 px-2 py-0.5 rounded font-semibold text-[11px] border border-rose-200">
                            <AlertCircle className="w-3 h-3" /> Failed
                          </span>
                        )}
                        {o.status === 'refunded' && (
                          <span className="inline-flex items-center gap-1 text-slate-700 bg-slate-100 px-2 py-0.5 rounded font-semibold text-[11px] border border-slate-300">
                            Refunded
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {o.entitlement_granted ? (
                          <span className="text-emerald-700 font-semibold text-[11px]">Active</span>
                        ) : (
                          <span className="text-[#98A2B3] text-[11px]">Locked</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
