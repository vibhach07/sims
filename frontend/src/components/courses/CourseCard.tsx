import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Clock, BookOpen, Check, ShoppingCart, CheckCircle2 } from 'lucide-react';
import { APICourse } from '../../services/api';
import { usePurchase } from '../../contexts/PurchaseContext';
import { useAuth } from '../../contexts/AuthContext';

interface CourseCardProps {
  course: APICourse;
  isSelected?: boolean;
  onSelect?: (course: APICourse) => void;
}

export const CourseCard: React.FC<CourseCardProps> = ({ 
  course, 
  isSelected = false, 
  onSelect 
}) => {
  const navigate = useNavigate();
  const { isCourseOwned, openCheckout, startRazorpayPayment } = usePurchase();
  const { user, isAuthenticated } = useAuth();

  // Owned = purchased via PurchaseContext OR enrolled via backend (enrolledCourseIds)
  const ownedLocally = isCourseOwned(String(course.id));
  const enrolledViaBackend = user?.enrolledCourseIds?.includes(course.id) ?? false;
  const owned = Boolean(user) && (ownedLocally || enrolledViaBackend || Boolean(course.is_enrolled));

  const price = course.price ? parseFloat(course.price) : undefined;
  const originalPrice = course.original_price ? parseFloat(course.original_price) : undefined;
  const discount = originalPrice && price
    ? Math.round((1 - price / originalPrice) * 100) 
    : 0;

  const handleBuyCourse = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      navigate('/login', { state: { returnTo: `/courses/${course.slug}` } });
      return;
    }
    await startRazorpayPayment(
      {
        id: String(course.id),
        type: 'course',
        title: course.title,
        subtitle: course.subtitle,
        price: price || 0,
        originalPrice,
      },
      {
        onSuccess: (order) => {
          navigate(`/payment/success?order_id=${order.order_id}`);
        },
        onError: (err) => {
          alert(err || 'Could not complete Razorpay transaction.');
        },
      }
    );
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('a, button')) return;
    if (onSelect) {
      onSelect(course);
    } else {
      navigate(`/courses/${course.slug}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      if ((e.target as HTMLElement).closest('a, button')) return;
      e.preventDefault();
      if (onSelect) {
        onSelect(course);
      } else {
        navigate(`/courses/${course.slug}`);
      }
    }
  };

  return (
    <div
      tabIndex={0}
      role="region"
      aria-label={`Course: ${course.title}`}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      className={`sims-card sims-card-interactive flex flex-col justify-between overflow-hidden group outline-none ${
        isSelected ? 'sims-card-selected' : ''
      }`}
    >
      {/* Top Card Header */}
      <div className="p-5 bg-gradient-to-br from-[#061426] via-[#091B31] to-[#102846] text-white relative">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[11px] font-semibold tracking-wider uppercase text-[#D9A52E] px-2.5 py-0.5 rounded bg-white/10 border border-white/5">
            {course.category_label}
          </span>
          <div className="flex items-center gap-1.5">
            {owned ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase bg-emerald-600 text-white px-2 py-0.5 rounded shadow-sm">
                <CheckCircle2 className="w-3 h-3" /> Enrolled
              </span>
            ) : isSelected ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase bg-[#D9A52E] text-[#061426] px-2 py-0.5 rounded shadow-sm">
                <Check className="w-3 h-3 stroke-[3]" /> Selected
              </span>
            ) : course.badge ? (
              <span className="text-[10px] font-bold tracking-wide uppercase bg-[#D9A52E]/90 text-[#061426] px-2 py-0.5 rounded shadow-sm">
                {course.badge}
              </span>
            ) : null}
          </div>
        </div>
        <h3 className="font-serif font-bold text-lg text-[#FFF9ED] group-hover:text-[#F0C45B] transition-colors duration-200 line-clamp-1">
          {course.title.split('—')[0]}
        </h3>
        <p className="text-xs text-[#E3D8BE]/85 mt-1 line-clamp-1">
          {course.target_exam}
        </p>
      </div>

      {/* Body Content */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <p className="text-sm text-[#263347] line-clamp-2 mb-4 leading-relaxed font-normal">
            {course.short_description}
          </p>

          {/* Lecture count badge */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            <span className="text-[11px] bg-[#F8F4EA] text-[#263347] px-2.5 py-0.5 rounded-md border border-[#E3D8BE]/70">
              {course.lecture_count} Lectures
            </span>
            <span className="text-[11px] bg-[#F8F4EA] text-[#263347] px-2.5 py-0.5 rounded-md border border-[#E3D8BE]/70">
              {course.language}
            </span>
          </div>
        </div>

        {/* Metadata stats & Pricing */}
        <div className="pt-3 border-t border-[#E3D8BE]/50 space-y-2">
          <div className="flex items-center justify-between text-xs text-[#687386]">
            <span className="flex items-center gap-1.5 font-medium">
              <Clock className="w-3.5 h-3.5 text-[#D9A52E]" />
              {course.duration}
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <BookOpen className="w-3.5 h-3.5 text-[#D9A52E]" />
              {course.format.split('/')[0]}
            </span>
          </div>
          
          {price ? (
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-baseline gap-2">
                <span className="font-serif font-bold text-lg text-[#061426]">
                  ₹{price.toLocaleString('en-IN')}
                </span>
                {originalPrice && (
                  <span className="text-xs text-[#687386] line-through">
                    ₹{originalPrice.toLocaleString('en-IN')}
                  </span>
                )}
              </div>
              {discount > 0 && (
                <span className="text-[10px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded">
                  {discount}% OFF
                </span>
              )}
            </div>
          ) : (
            <div className="text-xs font-semibold text-[#A87519]">
              {course.fee_status}
            </div>
          )}
        </div>
      </div>

      {/* Action Footer */}
      <div className="p-4 bg-[#F8F4EA] border-t border-[#E3D8BE] flex items-center justify-between gap-2">
        <Link
          to={`/courses/${course.slug}`}
          className="text-xs font-semibold text-[#061426] hover:text-[#A87519] flex items-center gap-1 transition focus:outline-none focus:ring-1 focus:ring-[#D9A52E] rounded px-1.5 py-1"
        >
          View Details <ArrowRight className="w-3.5 h-3.5" />
        </Link>
        
        {owned ? (
          <Link
            to={`/student/my-courses`}
            className="px-3.5 py-1.5 bg-[#061426] text-white hover:bg-[#D9A52E] hover:text-[#061426] rounded-lg text-xs font-bold transition flex items-center gap-1"
          >
            <span>Learn Now</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        ) : course.is_paid && price ? (
          <button
            onClick={handleBuyCourse}
            className="btn-sims-primary px-3.5 py-1.5 text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>Buy Course</span>
          </button>
        ) : (
          <Link
            to={`/contact?course=${encodeURIComponent(course.title)}`}
            className="btn-sims-primary px-3.5 py-1.5 text-xs font-semibold"
          >
            Enquire Now
          </Link>
        )}
      </div>

    </div>
  );
};
