import React, { createContext, useContext, useEffect, useState } from 'react';
import { SiteConfigAPI, APISiteSettings, APICentre, APISiteConfig } from '../services/api';
import { buildWhatsAppUrl, isWhatsAppConfigured } from '../config/whatsapp';

const DEFAULT_SETTINGS: APISiteSettings = {
  site_name: 'SIMS Raipur',
  whatsapp_counsellor_number: '',
  whatsapp_group_url: '',
  whatsapp_counsellor_message: 'Hi SIMS Raipur, I would like to talk to a counsellor about {course}.',
  floating_whatsapp_enabled: true,
  floating_whatsapp_target: 'counsellor',
  floating_whatsapp_message: 'Hi SIMS Raipur, I would like to inquire about coaching programs.',
  support_phone: '8959774702',
  support_email: 'info@simsraipuredu.in',
  instagram_url: 'https://www.instagram.com/simsraipur',
  facebook_url: 'https://www.facebook.com/simsraipur',
  youtube_url: 'https://www.youtube.com/@simsraipur',
  website_url: 'https://simsraipuredu.in',
};

const DEFAULT_CENTRE: APICentre = {
  id: 1,
  name: 'SIMS Raipur Main Campus',
  address: '3rd Floor, SBI Building, Main Road, Chaoubey Colony, Samta, Raipur – 492001',
  city: 'Raipur',
  phone: '8959774702',
  maps_url: 'https://maps.google.com/?q=SIMS+Raipur+Chaoubey+Colony',
  latitude: null,
  longitude: null,
  embed_url: '',
  is_primary: true,
  is_active: true,
  order: 0,
  map_link: 'https://maps.google.com/?q=SIMS+Raipur+Chaoubey+Colony',
  directions_link: 'https://www.google.com/maps/dir/?api=1&destination=SIMS+Raipur+Chaoubey+Colony',
};

interface SiteContextType {
  settings: APISiteSettings;
  centres: APICentre[];
  primaryCentre: APICentre;
  counsellorChatUrl: string | null;
  floatingTargetUrl: string | null;
  loading: boolean;
  refreshConfig: () => Promise<void>;
  getCounsellorUrl: (courseTitle?: string) => string | null;
}

const SiteContext = createContext<SiteContextType | undefined>(undefined);

export const SiteProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<APISiteConfig>({
    settings: DEFAULT_SETTINGS,
    centres: [DEFAULT_CENTRE],
    counsellor_chat_url: null,
    floating_target_url: null,
  });
  const [loading, setLoading] = useState(true);

  const fetchConfig = async () => {
    try {
      const data = await SiteConfigAPI.getPublicConfig();
      setConfig(data);
    } catch {
      // Graceful fallback to default in-memory config if API fails or is offline
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const getCounsellorUrl = (courseTitle?: string): string | null => {
    if (!isWhatsAppConfigured()) return null;
    return buildWhatsAppUrl(courseTitle ? `Hello SIMS Raipur, I want to know more about ${courseTitle}.` : undefined);
  };

  const primaryCentre = config.centres.find(c => c.is_primary) || config.centres[0] || DEFAULT_CENTRE;

  return (
    <SiteContext.Provider
      value={{
        settings: config.settings,
        centres: config.centres.length > 0 ? config.centres : [DEFAULT_CENTRE],
        primaryCentre,
        counsellorChatUrl: isWhatsAppConfigured() ? buildWhatsAppUrl() : null,
        floatingTargetUrl: isWhatsAppConfigured() ? buildWhatsAppUrl() : null,
        loading,
        refreshConfig: fetchConfig,
        getCounsellorUrl,
      }}
    >
      {children}
    </SiteContext.Provider>
  );
};

export const useSite = () => {
  const context = useContext(SiteContext);
  if (!context) {
    throw new Error('useSite must be used within a SiteProvider');
  }
  return context;
};
