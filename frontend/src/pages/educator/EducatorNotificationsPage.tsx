import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { NotificationsAPI, APINotification } from '../../services/api';
import { Bell, CheckCheck, Loader2, AlertCircle, ArrowRight } from 'lucide-react';

export const EducatorNotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<APINotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const data = await NotificationsAPI.list();
      setNotifications(data);
    } catch (e: any) {
      setError(e.message || 'Failed to load notifications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await NotificationsAPI.markAllRead();
      setNotifications((list) => list.map((n) => ({ ...n, is_read: true })));
    } catch {
      /* ignore */
    }
  };

  const handleNotificationClick = async (notif: APINotification) => {
    if (!notif.is_read) {
      try {
        await NotificationsAPI.markRead(notif.id);
        setNotifications((list) =>
          list.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
        );
      } catch {
        /* ignore */
      }
    }
    if (notif.link) {
      navigate(notif.link);
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif font-bold text-3xl text-[#061426]">Notifications</h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time updates on curriculum reviews, approval status and educator administrative decisions.
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="px-3.5 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-white text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <CheckCheck className="w-4 h-4 text-emerald-600" />
            <span>Mark all read</span>
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-[#E3D8BE] overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-20 text-center space-y-2">
            <Loader2 className="w-6 h-6 animate-spin text-[#D9A52E] mx-auto" />
            <p className="text-xs text-slate-400">Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-16 text-center space-y-2">
            <Bell className="w-10 h-10 text-slate-300 mx-auto" />
            <div className="text-sm font-semibold text-slate-700">No notifications yet</div>
            <p className="text-xs text-slate-400">
              You will be notified here when admins review your courses or test series.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={`p-4 sm:p-5 flex items-start justify-between gap-4 transition cursor-pointer hover:bg-slate-50 ${
                  !notif.is_read ? 'bg-amber-50/40' : ''
                }`}
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div
                    className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${
                      !notif.is_read ? 'bg-[#D9A52E]' : 'bg-transparent'
                    }`}
                  />
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs sm:text-sm text-slate-900">{notif.title}</span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(notif.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{notif.body}</p>
                  </div>
                </div>

                {notif.link && (
                  <ArrowRight className="w-4 h-4 text-slate-400 flex-shrink-0 mt-1" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default EducatorNotificationsPage;
