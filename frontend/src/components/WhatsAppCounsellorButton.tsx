import React from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, PhoneCall } from 'lucide-react';
import { buildWhatsAppUrl, isWhatsAppConfigured } from '../config/whatsapp';

interface WhatsAppCounsellorButtonProps {
  course?: string;
  className?: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'compact';
  children?: React.ReactNode;
  icon?: boolean;
}

export const WhatsAppCounsellorButton: React.FC<WhatsAppCounsellorButtonProps> = ({
  course,
  className = '',
  variant = 'primary',
  children,
  icon = true,
}) => {
  const isConfigured = isWhatsAppConfigured();
  const message = course
    ? `Hello SIMS Raipur, I want to know more about ${course}.`
    : undefined;
  const whatsappUrl = buildWhatsAppUrl(message);

  const defaultText = children || (course ? `Talk to Counsellor about ${course}` : 'Talk to Counsellor');

  // Variant styling classes
  let baseStyle = 'inline-flex items-center justify-center font-semibold transition rounded-xl text-center gap-2 ';
  if (variant === 'primary') {
    baseStyle += 'bg-[#D9A52E] hover:bg-[#F0C45B] text-[#061426] px-5 py-2.5 text-xs sm:text-sm shadow ';
  } else if (variant === 'secondary') {
    baseStyle += 'bg-[#061426] hover:bg-[#0c2340] text-[#F0C45B] px-5 py-2.5 text-xs sm:text-sm border border-[#D9A52E]/30 ';
  } else if (variant === 'outline') {
    baseStyle += 'border border-[#D9A52E] text-[#D9A52E] hover:bg-[#D9A52E]/10 px-4 py-2 text-xs ';
  } else if (variant === 'compact') {
    baseStyle += 'bg-[#25D366] hover:bg-[#20ba59] text-white px-3 py-1.5 text-xs shadow-sm ';
  }

  // If WhatsApp contact number configured, open WhatsApp in new tab
  if (isConfigured) {
    return (
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={typeof defaultText === 'string' ? defaultText : 'Talk to Counsellor on WhatsApp'}
        className={`${baseStyle} ${className}`}
      >
        {icon && <MessageSquare className="w-4 h-4 flex-shrink-0" />}
        <span>{defaultText}</span>
      </a>
    );
  }

  // Graceful fallback to Contact / Free Counselling Enquiry page when unconfigured
  return (
    <Link
      to="/contact"
      aria-label={typeof defaultText === 'string' ? defaultText : 'Book Free Counselling'}
      className={`${baseStyle} ${className}`}
    >
      {icon && <PhoneCall className="w-4 h-4 flex-shrink-0" />}
      <span>{defaultText}</span>
    </Link>
  );
};

export default WhatsAppCounsellorButton;
