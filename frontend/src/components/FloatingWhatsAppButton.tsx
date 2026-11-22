import React, { useState, useEffect, useRef } from 'react';
import { useLocation, Link } from 'react-router-dom';
import {
  WHATSAPP_BUTTON_POSITION,
  WHATSAPP_MESSAGE_OPTIONS,
  buildWhatsAppUrl,
  isWhatsAppConfigured,
  logWhatsAppDevWarning,
} from '../config/whatsapp';

export const FloatingWhatsAppButton: React.FC = () => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement | HTMLAnchorElement>(null);

  useEffect(() => {
    logWhatsAppDevWarning();

    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Close popup on route change
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  // Handle click outside and Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // 1. Hide in fullscreen mode (e.g. video / classroom / presentation)
  if (isFullscreen) return null;

  const path = location.pathname;

  // 2. Hide on Admin portal routes
  if (path.startsWith('/admin')) return null;

  // 3. Hide on Educator workspace routes, keep visible on public /educator/login and /educator/apply
  const isPublicEducatorPage = path === '/educator/login' || path === '/educator/apply';
  if (path.startsWith('/educator') && !isPublicEducatorPage) return null;

  // 4. Hide on student CBT test taking runner (/student/tests/:testId)
  if (path.startsWith('/student/tests/')) return null;

  // 5. Hide on live classroom / video learning player (/learn/*, /student/live/:id)
  if (path.startsWith('/learn/') || path.startsWith('/student/live/')) return null;

  const isConfigured = isWhatsAppConfigured();
  const isRight = WHATSAPP_BUTTON_POSITION === 'right';

  const positionClasses = isRight
    ? 'right-[calc(1rem+env(safe-area-inset-right,0px))] sm:right-[calc(1.5rem+env(safe-area-inset-right,0px))]'
    : 'left-[calc(1rem+env(safe-area-inset-left,0px))] sm:left-[calc(1.5rem+env(safe-area-inset-left,0px))]';

  const buttonClasses =
    'w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#25D366] hover:bg-[#20ba59] text-white shadow-lg hover:shadow-xl flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#25D366]';

  const svgWhatsAppIcon = (
    <svg
      className="w-6 h-6 sm:w-7 sm:h-7 fill-white pointer-events-none transition-transform duration-200"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M17.507 14.307l-.009.075c-.338-.168-1.999-.986-2.309-1.098-.309-.113-.533-.168-.758.169-.225.337-.872 1.098-1.069 1.323-.197.225-.394.253-.732.084-.337-.168-1.427-.526-2.718-1.677-1.004-.897-1.682-2.005-1.879-2.343-.197-.337-.021-.52.148-.687.152-.152.338-.394.507-.591.168-.197.225-.337.337-.563.113-.225.056-.422-.028-.591-.084-.169-.758-1.826-1.04-2.5-.274-.656-.552-.567-.758-.577-.196-.01-.421-.012-.647-.012s-.591.084-.9.422c-.309.337-1.18 1.153-1.18 2.81 0 1.657 1.208 3.257 1.376 3.482.169.225 2.378 3.632 5.762 5.093.805.347 1.433.554 1.923.71.808.257 1.543.221 2.124.134.648-.097 1.999-.816 2.28-1.604.281-.787.281-1.463.197-1.604-.084-.141-.309-.225-.647-.394z" />
      <path d="M12 2C6.477 2 2 6.477 2 12c0 1.891.524 3.662 1.434 5.176L2.1 22l4.981-1.306C8.513 21.54 10.215 22 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18.2c-1.636 0-3.155-.472-4.444-1.286l-.319-.199-2.964.777.791-2.889-.208-.332C3.968 14.939 3.48 13.513 3.48 12c0-4.701 3.819-8.52 8.52-8.52 4.701 0 8.52 3.819 8.52 8.52 0 4.701-3.819 8.52-8.52 8.52z" />
    </svg>
  );

  const svgCloseIcon = (
    <svg
      className="w-5 h-5 sm:w-6 sm:h-6 stroke-white pointer-events-none"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );

  return (
    <div
      className={`fixed z-40 flex flex-col ${
        isRight ? 'items-end' : 'items-start'
      } bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:bottom-[calc(1.5rem+env(safe-area-inset-bottom,0px))] ${positionClasses}`}
    >
      {/* Options Popup Card */}
      {isOpen && (
        <div
          ref={popupRef}
          role="dialog"
          aria-label="WhatsApp enquiry options"
          className={`mb-3 w-[calc(100vw-2rem)] sm:w-84 max-w-sm rounded-2xl shadow-2xl border border-gray-200 dark:border-[#2c2c31] bg-white dark:bg-[#17171a] text-gray-900 dark:text-[#e6e6e8] overflow-hidden transition-all animate-in fade-in duration-200 ${
            isRight ? 'origin-bottom-right' : 'origin-bottom-left'
          }`}
        >
          {/* Card Header */}
          <div className="bg-gradient-to-r from-[#061426] to-[#0c2340] text-white p-4 flex items-center justify-between border-b border-[#D9A52E]/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#25D366] flex items-center justify-center text-white shadow-md">
                <svg className="w-6 h-6 fill-white" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19.01L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 14.99 3.81 13.47 3.81 11.91C3.81 7.37 7.5 3.67 12.05 3.67Z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#FFF9ED] tracking-wide">SIMS Raipur Helpdesk</h3>
                <p className="text-[11px] text-[#25D366] flex items-center gap-1.5 font-medium">
                  <span className="w-2 h-2 rounded-full bg-[#25D366] inline-block animate-pulse"></span>
                  Online | Quick Support
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close WhatsApp chat options"
              className="text-[#E3D8BE] hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Subheading */}
          <div className="px-4 pt-3 pb-1 text-xs font-semibold text-gray-500 dark:text-[#9b9ba3]">
            Choose a topic to chat on WhatsApp:
          </div>

          {/* Options List */}
          <div className="p-3 space-y-2">
            {WHATSAPP_MESSAGE_OPTIONS.map((opt) => {
              const url = buildWhatsAppUrl(opt.message);
              return isConfigured ? (
                <a
                  key={opt.id}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setIsOpen(false)}
                  className="group flex items-start gap-3 p-3 rounded-xl border border-gray-200 dark:border-[#2c2c31] bg-gray-50 dark:bg-[#1e1e22] hover:bg-[#25D366]/10 dark:hover:bg-[#25D366]/15 hover:border-[#25D366]/40 transition text-left"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#25D366]/15 text-[#25D366] flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-[#25D366] group-hover:text-white transition">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-900 dark:text-[#e6e6e8] group-hover:text-[#25D366] transition">
                        {opt.title}
                      </span>
                      {opt.badge && (
                        <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#C9A55C]/20 text-[#C9A55C]">
                          {opt.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-[#9b9ba3] leading-tight mt-0.5">
                      {opt.description}
                    </p>
                  </div>
                  <svg
                    className="w-4 h-4 text-gray-400 group-hover:text-[#25D366] shrink-0 self-center transition-transform group-hover:translate-x-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </a>
              ) : (
                <Link
                  key={opt.id}
                  to="/contact"
                  onClick={() => setIsOpen(false)}
                  className="group flex items-start gap-3 p-3 rounded-xl border border-gray-200 dark:border-[#2c2c31] bg-gray-50 dark:bg-[#1e1e22] hover:bg-[#25D366]/10 transition text-left"
                >
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-bold text-gray-900 dark:text-[#e6e6e8]">
                      {opt.title}
                    </span>
                    <p className="text-[11px] text-gray-500 dark:text-[#9b9ba3] leading-tight mt-0.5">
                      {opt.description}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Quick Direct Link Footer */}
          <div className="px-4 py-2.5 bg-gray-50 dark:bg-[#1e1e22] border-t border-gray-200 dark:border-[#2c2c31] flex items-center justify-between text-[11px]">
            <span className="text-gray-500 dark:text-[#9b9ba3]">Want direct support?</span>
            {isConfigured ? (
              <a
                href={buildWhatsAppUrl()}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setIsOpen(false)}
                className="font-bold text-[#25D366] hover:underline flex items-center gap-1"
              >
                <span>Direct WhatsApp Chat</span>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </a>
            ) : (
              <Link
                to="/contact"
                onClick={() => setIsOpen(false)}
                className="font-bold text-[#25D366] hover:underline"
              >
                Contact Form
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Floating Toggle Button */}
      <div className="flex items-center gap-2">
        {/* Tooltip on hover (desktop only when popup closed) */}
        {showTooltip && !isOpen && (
          <div
            role="tooltip"
            className={`hidden sm:block absolute ${
              isRight ? 'right-full mr-3' : 'left-full ml-3'
            } bg-[#061426] text-[#FFF9ED] text-xs font-semibold px-3 py-1.5 rounded-lg shadow-lg border border-[#D9A52E]/30 whitespace-nowrap pointer-events-none transition-opacity duration-150`}
          >
            Chat with SIMS Raipur
          </div>
        )}

        <button
          ref={buttonRef as React.RefObject<HTMLButtonElement>}
          type="button"
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          aria-label="Chat with SIMS Raipur on WhatsApp"
          title="Chat with SIMS Raipur on WhatsApp"
          onClick={() => setIsOpen((prev) => !prev)}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          onFocus={() => setShowTooltip(true)}
          onBlur={() => setShowTooltip(false)}
          className={buttonClasses}
        >
          {isOpen ? svgCloseIcon : svgWhatsAppIcon}
        </button>
      </div>
    </div>
  );
};

export default FloatingWhatsAppButton;
