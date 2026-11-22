import React, { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { AuthAPI } from '../../services/api';

interface GoogleLoginButtonProps {
  portal?: 'student' | 'educator';
  onSuccess: (credential: string) => void;
  onError: (errorMsg: string) => void;
  disabled?: boolean;
  theme?: 'light' | 'dark';
}

declare global {
  interface Window {
    google?: any;
    __gsiScriptLoaded?: boolean;
  }
}

export const GoogleLoginButton: React.FC<GoogleLoginButtonProps> = ({
  portal = 'student',
  onSuccess,
  onError,
  disabled = false,
  theme = 'light',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [clientId, setClientId] = useState<string>(
    import.meta.env.VITE_GOOGLE_CLIENT_ID || '1085372780311-e8gd3er29mqm59elaa0ai9l5v3alru6c.apps.googleusercontent.com'
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isScriptReady, setIsScriptReady] = useState(false);

  // 1. Fetch Client ID if missing
  useEffect(() => {
    if (!clientId) {
      AuthAPI.googleConfig()
        .then((res) => {
          if (res?.client_id) setClientId(res.client_id);
        })
        .catch((err) => {
          console.warn('Could not fetch Google OAuth client ID:', err);
        });
    }
  }, [clientId]);

  // 2. Load Google Identity Services script
  useEffect(() => {
    if (window.google?.accounts?.id) {
      setIsScriptReady(true);
      return;
    }

    const existingScript = document.getElementById('google-gsi-client');
    if (existingScript) {
      existingScript.addEventListener('load', () => setIsScriptReady(true));
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-gsi-client';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => setIsScriptReady(true);
    script.onerror = () => {
      onError('Failed to load Google Sign-In SDK. Check network connection.');
    };
    document.body.appendChild(script);
  }, [onError]);

  // 3. Initialize Google Identity Services & Render Button
  useEffect(() => {
    if (!isScriptReady || !clientId || !window.google?.accounts?.id) return;

    try {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response: any) => {
          if (response?.credential) {
            setIsLoading(true);
            try {
              onSuccess(response.credential);
            } finally {
              setIsLoading(false);
            }
          } else {
            onError('Google Sign-In did not return valid credentials.');
          }
        },
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      if (containerRef.current) {
        containerRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(containerRef.current, {
          type: 'standard',
          theme: theme === 'dark' ? 'filled_black' : 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'rectangular',
          logo_alignment: 'left',
          width: containerRef.current.offsetWidth || 340,
        });
      }
    } catch (err: any) {
      console.error('Google One Tap init error:', err);
    }
  }, [isScriptReady, clientId, theme, onSuccess, onError]);

  const handleManualTrigger = () => {
    if (disabled || isLoading) return;
    if (window.google?.accounts?.id) {
      try {
        window.google.accounts.id.prompt((notification: any) => {
          if (notification.isNotDisplayed()) {
            console.warn('Google One Tap prompt suppressed:', notification.getNotDisplayedReason());
          }
        });
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <div className="w-full flex flex-col items-center justify-center space-y-2">
      {/* Official Google GSI Render Mount */}
      <div 
        ref={containerRef} 
        className={`w-full flex justify-center [&>div]:w-full ${disabled || isLoading ? 'pointer-events-none opacity-60' : ''}`}
        style={{ minHeight: '44px' }}
      />

      {/* Fallback button if GSI container is empty or during loading */}
      {(!isScriptReady || isLoading) && (
        <button
          type="button"
          onClick={handleManualTrigger}
          disabled={disabled || isLoading}
          className={`w-full py-2.5 px-4 rounded-lg border flex items-center justify-center gap-3 text-sm font-semibold transition ${
            theme === 'dark'
              ? 'bg-[#15243E] text-white border-white/20 hover:bg-[#1C3052]'
              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50 shadow-sm'
          } disabled:opacity-60`}
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-[#D9A52E]" />
          ) : (
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3h3.88c2.27-2.09 3.66-5.17 3.66-9.09z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.1C3.27 21.46 7.34 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.32c-.25-.72-.38-1.49-.38-2.32s.13-1.6.38-2.32V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.1z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.27 2.54 1.25 6.58l4.03 3.1c.95-2.83 3.6-4.93 6.72-4.93z"
              />
            </svg>
          )}
          <span>{isLoading ? 'Connecting to Google…' : 'Continue with Google'}</span>
        </button>
      )}
    </div>
  );
};

