import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DashboardAPI, APIAdminStats } from '../../services/api';
import { 
  BookOpen, Users, UserCheck, MessageSquare, FileCheck, 
  TrendingUp, IndianRupee, Layers, CheckCircle2, AlertCircle, Loader2, Clock, UploadCloud, Sparkles
} from 'lucide-react';

export const AdminDashboardPage: React.FC = () => {
  const [statsData, setStatsData] = useState<APIAdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    DashboardAPI.adminStats()
      .then(data => setStatsData(data))
      .catch(err => setError(err.message || 'Failed to fetch admin stats.'))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="py-20 text-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#D9A52E] mx-auto" />
        <p className="text-sm text-[#687386]">Loading verified institute analytics from PostgreSQL...</p>
      </div>
    );
  }

  const s = statsData || {
    totalCourses: 0,
    totalSubjects: 0,
    totalFaculty: 0,
    totalTests: 0,
    totalResources: 0,
    totalEnquiries: 0,
    openEnquiries: 0,
    totalStudents: 0,
    totalEnrollments: 0,
    totalTestAttempts: 0,
    totalPaidOrders: 0,
    totalVerifiedRevenue: 0,
    pendingOrders: 0,
    failedOrders: 0,
  };

  const statCards = [
    { label: 'Published Courses', value: s.totalCourses, icon: BookOpen, color: 'text-blue-600', bg: 'bg-blue-50', link: '/admin/courses' },
    { label: 'Active Educators', value: s.activeEducators ?? s.totalFaculty, icon: UserCheck, color: 'text-emerald-700', bg: 'bg-emerald-50', link: '/admin/educators' },
    { label: 'Pending Approvals', value: s.pendingApprovals ?? 0, icon: AlertCircle, color: 'text-amber-700', bg: 'bg-amber-50', link: '/admin/educators?tab=approvals' },
    { label: 'New Applications', value: s.newApplications ?? 0, icon: Clock, color: 'text-purple-700', bg: 'bg-purple-50', link: '/admin/educators?tab=applications' },
    { label: 'Registered Students', value: s.totalStudents, icon: Users, color: 'text-green-600', bg: 'bg-green-50', link: '/admin/students' },
    { label: 'Open Enquiries', value: s.openEnquiries, icon: MessageSquare, color: 'text-amber-600', bg: 'bg-amber-50', link: '/admin/enquiries' },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-[#061426] text-white p-6 sm:p-8 rounded-2xl border-2 border-[#D9A52E]/30 shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[#D9A52E]">
            Institute Management Console (Database Authoritative)
          </span>
          <h1 className="font-serif font-bold text-2xl sm:text-3xl text-[#FFF9ED] mt-1">
            SIMS Raipur — Administrative Center
          </h1>
          <p className="text-xs text-[#E3D8BE]/80 mt-1">
            Real-time institute metrics directly computed from PostgreSQL records.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Quick Action Banner: Bulk Import Wizard */}
      <div className="bg-gradient-to-r from-[#061426] via-[#112338] to-[#1C2C42] p-5 rounded-2xl border border-[#D9A52E]/40 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-serif font-bold text-sm text-[#FFF9ED] flex items-center gap-2">
              Advanced Test Series Bulk Import Wizard
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[10px] font-semibold">
                LaTeX + mhchem + Auto-Crop
              </span>
            </h3>
            <p className="text-xs text-slate-300 mt-0.5">
              Upload PDF / Word documents, auto-extract formulas, crop diagrams, configure CBT exam scheduling, and publish.
            </p>
          </div>
        </div>
        <Link
          to="/admin/tests/import"
          className="px-4 py-2 rounded-xl bg-[#D9A52E] hover:bg-[#F0C45B] text-[#061426] font-bold text-xs whitespace-nowrap shadow-sm transition flex items-center gap-2"
        >
          <UploadCloud className="w-4 h-4" /> Launch Wizard
        </Link>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <Link
              key={idx}
              to={stat.link}
              className="bg-white p-4 rounded-xl border border-[#E3D8BE] shadow-sm hover:border-[#D9A52E] transition flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-3">
                <span className={`p-2 rounded-lg ${stat.bg} ${stat.color}`}>
                  <Icon className="w-4 h-4" />
                </span>
              </div>
              <div>
                <span className="text-[11px] text-[#687386] block leading-tight">{stat.label}</span>
                <span className="font-serif font-bold text-2xl text-[#061426] mt-0.5 block">{stat.value}</span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Financial & Engagement Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Verified Revenue */}
        <div className="bg-white p-6 rounded-2xl border-2 border-[#E3D8BE] shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#A87519] uppercase tracking-wider">
              Verified Gateway Revenue
            </span>
            <span className="p-2 rounded-lg bg-emerald-50 text-emerald-700">
              <IndianRupee className="w-5 h-5" />
            </span>
          </div>
          <div className="text-3xl font-serif font-bold text-[#061426]">
            ₹{s.totalVerifiedRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-[#687386]">
            Derived exclusively from orders marked <strong>'paid'</strong> with server signature verification.
          </p>
          <div className="pt-2 border-t border-[#E3D8BE]/50 flex justify-between text-xs text-[#263347]">
            <span>Paid Orders: <strong>{s.totalPaidOrders}</strong></span>
            <span>Pending/Failed: <strong>{s.pendingOrders + s.failedOrders}</strong></span>
          </div>
        </div>

        {/* Academic Engagement */}
        <div className="bg-white p-6 rounded-2xl border-2 border-[#E3D8BE] shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#A87519] uppercase tracking-wider">
              Academic Activity
            </span>
            <span className="p-2 rounded-lg bg-blue-50 text-blue-700">
              <TrendingUp className="w-5 h-5" />
            </span>
          </div>
          <div className="text-3xl font-serif font-bold text-[#061426]">
            {s.totalTestAttempts} Attempts
          </div>
          <p className="text-xs text-[#687386]">
            Total test attempts logged across all national mock examinations.
          </p>
          <div className="pt-2 border-t border-[#E3D8BE]/50 flex justify-between text-xs text-[#263347]">
            <span>Active Enrollments: <strong>{s.totalEnrollments}</strong></span>
            <span>Study Resources: <strong>{s.totalResources}</strong></span>
          </div>
        </div>

        {/* Inbound Inquiries */}
        <div className="bg-white p-6 rounded-2xl border-2 border-[#E3D8BE] shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#A87519] uppercase tracking-wider">
              Admissions Pipeline
            </span>
            <span className="p-2 rounded-lg bg-amber-50 text-amber-700">
              <MessageSquare className="w-5 h-5" />
            </span>
          </div>
          <div className="text-3xl font-serif font-bold text-[#061426]">
            {s.totalEnquiries} Enquiries
          </div>
          <p className="text-xs text-[#687386]">
            Inbound student course inquiries submitted through web contact forms.
          </p>
          <div className="pt-2 border-t border-[#E3D8BE]/50 flex justify-between text-xs text-[#263347]">
            <span>Open (New): <strong className="text-amber-700">{s.openEnquiries}</strong></span>
            <Link to="/admin/enquiries" className="text-xs text-[#A87519] font-bold hover:underline">
              Manage Enquiries →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
