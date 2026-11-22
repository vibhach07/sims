import React, { useEffect, useState } from 'react';
import { 
  SiteConfigAPI, APISiteSettings, APICentre 
} from '../../services/api';
import { 
  Sliders, MessageSquare, MapPin, PlusCircle, CheckCircle2, 
  AlertCircle, Loader2, Save, ExternalLink, Navigation, 
  Trash2, Edit3, HelpCircle, Phone, Mail, Globe, Check, X
} from 'lucide-react';

export const AdminSiteSettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'settings' | 'centres'>('settings');

  // Settings State
  const [settings, setSettings] = useState<APISiteSettings>({
    site_name: 'SIMS Raipur',
    whatsapp_counsellor_number: '',
    whatsapp_group_url: '',
    whatsapp_counsellor_message: 'Hi SIMS Raipur, I would like to talk to a counsellor about {course}.',
    floating_whatsapp_enabled: true,
    floating_whatsapp_target: 'counsellor',
    floating_whatsapp_message: 'Hi SIMS Raipur, I would like to inquire about coaching programs.',
    support_phone: '8959774702',
    support_email: 'info@simsraipuredu.in',
    instagram_url: '',
    facebook_url: '',
    youtube_url: '',
    website_url: 'https://simsraipuredu.in',
  });
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  // Centres State
  const [centres, setCentres] = useState<APICentre[]>([]);
  const [loadingCentres, setLoadingCentres] = useState(false);
  const [centreModalOpen, setCentreModalOpen] = useState(false);
  const [editingCentreId, setEditingCentreId] = useState<number | null>(null);
  const [centreForm, setCentreForm] = useState({
    name: '',
    address: '',
    city: 'Raipur',
    phone: '',
    maps_url: '',
    latitude: '' as string | number,
    longitude: '' as string | number,
    embed_url: '',
    is_primary: false,
    is_active: true,
    order: 0,
  });
  const [savingCentre, setSavingCentre] = useState(false);
  const [showEmbedTooltip, setShowEmbedTooltip] = useState(false);

  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadSettings = async () => {
    setLoadingSettings(true);
    try {
      const data = await SiteConfigAPI.getAdminSettings();
      setSettings(data);
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to fetch settings.' });
    } finally {
      setLoadingSettings(false);
    }
  };

  const loadCentres = async () => {
    setLoadingCentres(true);
    try {
      const data = await SiteConfigAPI.listAdminCentres();
      setCentres(data);
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to fetch centres.' });
    } finally {
      setLoadingCentres(false);
    }
  };

  useEffect(() => {
    loadSettings();
    loadCentres();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setMsg(null);
    try {
      const updated = await SiteConfigAPI.updateAdminSettings(settings);
      setSettings(updated);
      setMsg({ type: 'success', text: 'Site & WhatsApp settings saved successfully.' });
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to update settings.' });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleOpenAddCentre = () => {
    setEditingCentreId(null);
    setCentreForm({
      name: '',
      address: '',
      city: 'Raipur',
      phone: '',
      maps_url: '',
      latitude: '',
      longitude: '',
      embed_url: '',
      is_primary: centres.length === 0,
      is_active: true,
      order: centres.length,
    });
    setCentreModalOpen(true);
  };

  const handleOpenEditCentre = (c: APICentre) => {
    setEditingCentreId(c.id);
    setCentreForm({
      name: c.name,
      address: c.address,
      city: c.city,
      phone: c.phone || '',
      maps_url: c.maps_url || '',
      latitude: c.latitude !== null ? c.latitude : '',
      longitude: c.longitude !== null ? c.longitude : '',
      embed_url: c.embed_url || '',
      is_primary: c.is_primary,
      is_active: c.is_active ?? true,
      order: c.order || 0,
    });
    setCentreModalOpen(true);
  };

  const handleSaveCentre = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!centreForm.name || !centreForm.address) {
      alert('Name and Address are required.');
      return;
    }

    setSavingCentre(true);
    try {
      const payload: Partial<APICentre> = {
        name: centreForm.name,
        address: centreForm.address,
        city: centreForm.city,
        phone: centreForm.phone,
        maps_url: centreForm.maps_url,
        latitude: centreForm.latitude !== '' ? Number(centreForm.latitude) : null,
        longitude: centreForm.longitude !== '' ? Number(centreForm.longitude) : null,
        embed_url: centreForm.embed_url,
        is_primary: centreForm.is_primary,
        is_active: centreForm.is_active,
        order: Number(centreForm.order) || 0,
      };

      if (editingCentreId) {
        await SiteConfigAPI.updateAdminCentre(editingCentreId, payload);
        setMsg({ type: 'success', text: 'Centre details updated successfully.' });
      } else {
        await SiteConfigAPI.createAdminCentre(payload);
        setMsg({ type: 'success', text: 'New centre location added successfully.' });
      }
      setCentreModalOpen(false);
      loadCentres();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to save centre.' });
    } finally {
      setSavingCentre(false);
    }
  };

  const handleDeleteCentre = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete centre "${name}"?`)) return;
    try {
      await SiteConfigAPI.deleteAdminCentre(id);
      setMsg({ type: 'success', text: `Centre "${name}" deleted.` });
      loadCentres();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to delete centre.' });
    }
  };

  const handleSetPrimaryCentre = async (c: APICentre) => {
    try {
      await SiteConfigAPI.updateAdminCentre(c.id, { is_primary: true });
      setMsg({ type: 'success', text: `"${c.name}" is now the primary centre.` });
      loadCentres();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to update primary centre.' });
    }
  };

  // Live link previews
  const liveCounsellorTestUrl = settings.whatsapp_counsellor_number
    ? `https://wa.me/${settings.whatsapp_counsellor_number}?text=${encodeURIComponent(
        settings.whatsapp_counsellor_message.replace('{course}', 'GATE 2027 Comprehensive Batch')
      )}`
    : null;

  const liveFloatingTestUrl = settings.floating_whatsapp_target === 'group' && settings.whatsapp_group_url
    ? settings.whatsapp_group_url
    : settings.whatsapp_counsellor_number
    ? `https://wa.me/${settings.whatsapp_counsellor_number}?text=${encodeURIComponent(
        settings.floating_whatsapp_message || settings.whatsapp_counsellor_message.replace('{course}', 'your programs')
      )}`
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[#E3D8BE]">
        <div>
          <h1 className="font-serif font-bold text-2xl sm:text-3xl text-[#061426]">
            Site & Contact Settings
          </h1>
          <p className="text-xs sm:text-sm text-[#687386] mt-1">
            Configure institute contact channels, WhatsApp counsellor links, and physical centre locations.
          </p>
        </div>
      </div>

      {msg && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center justify-between ${
            msg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <span>{msg.text}</span>
          <button onClick={() => setMsg(null)} className="font-bold ml-2">×</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E3D8BE] pb-2 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2 rounded-lg transition ${
            activeTab === 'settings'
              ? 'bg-[#061426] text-[#F0C45B] font-bold'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          WhatsApp & Contact Channels
        </button>
        <button
          onClick={() => setActiveTab('centres')}
          className={`px-4 py-2 rounded-lg transition ${
            activeTab === 'centres'
              ? 'bg-[#061426] text-[#F0C45B] font-bold'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Institute Centres ({centres.length})
        </button>
      </div>

      {/* TAB 1: WHATSAPP & CONTACT SETTINGS */}
      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <form onSubmit={handleSaveSettings} className="bg-white p-6 rounded-2xl border border-[#E3D8BE] shadow-sm space-y-6 text-xs">
              <h3 className="font-serif font-bold text-base text-[#061426] pb-2 border-b border-slate-100">
                General Institute Contact
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Site Title</label>
                  <input
                    type="text"
                    required
                    value={settings.site_name}
                    onChange={(e) => setSettings({ ...settings, site_name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:border-[#D9A52E]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Support Helpline Phone</label>
                  <input
                    type="text"
                    value={settings.support_phone}
                    onChange={(e) => setSettings({ ...settings, support_phone: e.target.value })}
                    placeholder="8959774702"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:border-[#D9A52E]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Support Email Address</label>
                <input
                  type="email"
                  value={settings.support_email}
                  onChange={(e) => setSettings({ ...settings, support_email: e.target.value })}
                  placeholder="info@simsraipuredu.in"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:border-[#D9A52E]"
                />
              </div>

              <h3 className="font-serif font-bold text-base text-[#061426] pt-4 pb-2 border-b border-slate-100 flex items-center gap-2">
                <Globe className="w-4 h-4 text-[#D9A52E]" />
                Social Media & Website URLs
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Instagram URL</label>
                  <input
                    type="url"
                    value={settings.instagram_url || ''}
                    onChange={(e) => setSettings({ ...settings, instagram_url: e.target.value })}
                    placeholder="https://www.instagram.com/simsraipur"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:border-[#D9A52E]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Facebook URL</label>
                  <input
                    type="url"
                    value={settings.facebook_url || ''}
                    onChange={(e) => setSettings({ ...settings, facebook_url: e.target.value })}
                    placeholder="https://www.facebook.com/simsraipur"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:border-[#D9A52E]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">YouTube URL</label>
                  <input
                    type="url"
                    value={settings.youtube_url || ''}
                    onChange={(e) => setSettings({ ...settings, youtube_url: e.target.value })}
                    placeholder="https://www.youtube.com/@simsraipur"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:border-[#D9A52E]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Website URL</label>
                  <input
                    type="url"
                    value={settings.website_url || ''}
                    onChange={(e) => setSettings({ ...settings, website_url: e.target.value })}
                    placeholder="https://simsraipuredu.in"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:border-[#D9A52E]"
                  />
                </div>
              </div>

              <h3 className="font-serif font-bold text-base text-[#061426] pt-4 pb-2 border-b border-slate-100 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#25D366]" />
                WhatsApp Counsellor Integration
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Counsellor WhatsApp Number *
                  </label>
                  <input
                    type="text"
                    value={settings.whatsapp_counsellor_number}
                    onChange={(e) => setSettings({ ...settings, whatsapp_counsellor_number: e.target.value.replace(/\D/g, '') })}
                    placeholder="e.g. 918959774702 (10-15 digits, country code included, NO +)"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:border-[#D9A52E]"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Digits only, including country code (e.g. 91 for India). Do not include + or spaces.</p>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    WhatsApp Group / Channel URL
                  </label>
                  <input
                    type="url"
                    value={settings.whatsapp_group_url}
                    onChange={(e) => setSettings({ ...settings, whatsapp_group_url: e.target.value })}
                    placeholder="https://chat.whatsapp.com/..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:border-[#D9A52E]"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Must start with https://chat.whatsapp.com/ or https://wa.me/</p>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Counsellor Message Template
                </label>
                <textarea
                  rows={2}
                  value={settings.whatsapp_counsellor_message}
                  onChange={(e) => setSettings({ ...settings, whatsapp_counsellor_message: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:border-[#D9A52E]"
                />
                <p className="text-[10px] text-slate-400 mt-1">Use <code className="text-[#D9A52E] font-bold">{'{course}'}</code> as placeholder for course/program title.</p>
              </div>

              <h3 className="font-serif font-bold text-base text-[#061426] pt-4 pb-2 border-b border-slate-100">
                Floating WhatsApp Widget
              </h3>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="floating_enabled"
                  checked={settings.floating_whatsapp_enabled}
                  onChange={(e) => setSettings({ ...settings, floating_whatsapp_enabled: e.target.checked })}
                  className="rounded border-slate-300 text-[#25D366] focus:ring-[#25D366]"
                />
                <label htmlFor="floating_enabled" className="font-semibold text-slate-800 cursor-pointer">
                  Enable floating WhatsApp button (visible bottom-right on public & student pages)
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Floating Button Target</label>
                  <select
                    value={settings.floating_whatsapp_target}
                    onChange={(e) => setSettings({ ...settings, floating_whatsapp_target: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:border-[#D9A52E]"
                  >
                    <option value="counsellor">Direct WhatsApp Counsellor</option>
                    <option value="group">Student Community Group / Channel</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Floating Message Greeting</label>
                  <input
                    type="text"
                    value={settings.floating_whatsapp_message}
                    onChange={(e) => setSettings({ ...settings, floating_whatsapp_message: e.target.value })}
                    placeholder="Hi SIMS Raipur, I would like to inquire about coaching..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:border-[#D9A52E]"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="px-6 py-2.5 rounded-xl bg-[#D9A52E] hover:bg-[#F0C45B] text-[#061426] font-bold text-xs flex items-center gap-2 shadow"
                >
                  {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Settings
                </button>
              </div>
            </form>
          </div>

          {/* Live Previews Panel */}
          <div className="space-y-4">
            <div className="bg-[#061426] text-white p-5 rounded-2xl border border-[#D9A52E]/30 space-y-4 text-xs">
              <h3 className="font-serif font-bold text-sm text-[#F0C45B] flex items-center gap-2">
                <ExternalLink className="w-4 h-4" /> Live WhatsApp Link Test
              </h3>

              <div className="space-y-2">
                <span className="text-[11px] font-semibold text-[#E3D8BE]">Counsellor Desk Link</span>
                {liveCounsellorTestUrl ? (
                  <div className="space-y-2">
                    <p className="font-mono text-[10px] text-slate-300 break-all bg-black/30 p-2 rounded border border-white/10">
                      {liveCounsellorTestUrl}
                    </p>
                    <a
                      href={liveCounsellorTestUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#25D366] hover:bg-[#20ba59] text-white font-bold rounded-lg text-xs"
                    >
                      <MessageSquare className="w-3.5 h-3.5" /> Test Counsellor Chat
                    </a>
                  </div>
                ) : (
                  <p className="text-slate-400 italic">Configure WhatsApp number to test link.</p>
                )}
              </div>

              <div className="space-y-2 pt-2 border-t border-white/10">
                <span className="text-[11px] font-semibold text-[#E3D8BE]">Floating Button Target Link</span>
                {liveFloatingTestUrl ? (
                  <div className="space-y-2">
                    <p className="font-mono text-[10px] text-slate-300 break-all bg-black/30 p-2 rounded border border-white/10">
                      {liveFloatingTestUrl}
                    </p>
                    <a
                      href={liveFloatingTestUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#25D366] hover:bg-[#20ba59] text-white font-bold rounded-lg text-xs"
                    >
                      <MessageSquare className="w-3.5 h-3.5" /> Test Floating Target
                    </a>
                  </div>
                ) : (
                  <p className="text-slate-400 italic">No floating target link active.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CENTRES MANAGER */}
      {activeTab === 'centres' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-3.5 rounded-xl border border-[#E3D8BE]">
            <p className="text-xs text-slate-600">
              Manage physical institute campuses displayed in footer, contact page, and map integrations.
            </p>
            <button
              onClick={handleOpenAddCentre}
              className="px-4 py-2 rounded-xl bg-[#D9A52E] hover:bg-[#F0C45B] text-[#061426] font-bold text-xs flex items-center gap-2 shadow"
            >
              <PlusCircle className="w-4 h-4" /> Add Centre
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {centres.map((c) => (
              <div 
                key={c.id} 
                className="bg-white p-5 rounded-2xl border border-[#E3D8BE] shadow-sm space-y-3 relative"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-serif font-bold text-base text-[#061426]">{c.name}</h4>
                      {c.is_primary && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#D9A52E]/20 text-[#061426] border border-[#D9A52E]/40 uppercase">
                          Primary
                        </span>
                      )}
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${c.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                        {c.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">{c.city} • Order: {c.order}</div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenEditCentre(c)}
                      className="p-1.5 rounded bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200"
                      title="Edit Centre"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteCentre(c.id, c.name)}
                      className="p-1.5 rounded bg-rose-50 text-rose-600 hover:text-rose-900 border border-rose-200"
                      title="Delete Centre"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100 leading-relaxed">
                  <MapPin className="w-3.5 h-3.5 inline mr-1 text-[#D9A52E]" />
                  {c.address}
                </p>

                {c.phone && (
                  <p className="text-xs text-slate-600">
                    <Phone className="w-3.5 h-3.5 inline mr-1 text-[#D9A52E]" />
                    {c.phone}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
                  <a
                    href={c.map_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#D9A52E] hover:underline"
                  >
                    <ExternalLink className="w-3 h-3" /> Test Map Link
                  </a>
                  <span className="text-slate-300">•</span>
                  <a
                    href={c.directions_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#D9A52E] hover:underline"
                  >
                    <Navigation className="w-3 h-3" /> Test Directions
                  </a>

                  {!c.is_primary && (
                    <>
                      <span className="text-slate-300">•</span>
                      <button
                        onClick={() => handleSetPrimaryCentre(c)}
                        className="text-[11px] font-bold text-slate-700 hover:text-[#061426]"
                      >
                        Set as Primary
                      </button>
                    </>
                  )}
                </div>

                {c.embed_url && (
                  <div className="pt-2">
                    <span className="text-[10px] text-slate-400 block mb-1">Embedded Map Preview:</span>
                    <iframe
                      src={c.embed_url}
                      title={c.name}
                      width="100%"
                      height="140"
                      style={{ border: 0 }}
                      loading="lazy"
                      className="rounded-lg border border-slate-200"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CENTRE ADD / EDIT MODAL */}
      {centreModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl border-2 border-[#E3D8BE] shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="font-serif font-bold text-base text-[#061426]">
                {editingCentreId ? 'Edit Institute Centre' : 'Add New Institute Centre'}
              </h3>
              <button onClick={() => setCentreModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold text-base">×</button>
            </div>

            <form onSubmit={handleSaveCentre} className="space-y-3.5">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Centre / Campus Name *</label>
                <input
                  type="text"
                  required
                  value={centreForm.name}
                  onChange={(e) => setCentreForm({ ...centreForm, name: e.target.value })}
                  placeholder="e.g. SIMS Raipur Main Campus"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:border-[#D9A52E]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Physical Address *</label>
                <textarea
                  rows={2}
                  required
                  value={centreForm.address}
                  onChange={(e) => setCentreForm({ ...centreForm, address: e.target.value })}
                  placeholder="Street, Building, Landmark, City – Pincode"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:border-[#D9A52E]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    value={centreForm.city}
                    onChange={(e) => setCentreForm({ ...centreForm, city: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:border-[#D9A52E]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Centre Phone</label>
                  <input
                    type="text"
                    value={centreForm.phone}
                    onChange={(e) => setCentreForm({ ...centreForm, phone: e.target.value })}
                    placeholder="8959774702"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:border-[#D9A52E]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Google Maps Share Link (optional)
                </label>
                <input
                  type="url"
                  value={centreForm.maps_url}
                  onChange={(e) => setCentreForm({ ...centreForm, maps_url: e.target.value })}
                  placeholder="https://maps.app.goo.gl/... or https://www.google.com/maps/..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:border-[#D9A52E]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Latitude (optional)</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={centreForm.latitude}
                    onChange={(e) => setCentreForm({ ...centreForm, latitude: e.target.value })}
                    placeholder="21.251400"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:border-[#D9A52E]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Longitude (optional)</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={centreForm.longitude}
                    onChange={(e) => setCentreForm({ ...centreForm, longitude: e.target.value })}
                    placeholder="81.629600"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:border-[#D9A52E]"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700">Google Maps Embed URL (optional)</label>
                  <button
                    type="button"
                    onClick={() => setShowEmbedTooltip(!showEmbedTooltip)}
                    className="text-[#D9A52E] hover:underline flex items-center gap-1 text-[11px]"
                  >
                    <HelpCircle className="w-3.5 h-3.5" /> How to get this?
                  </button>
                </div>
                {showEmbedTooltip && (
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-900 mb-2 leading-relaxed">
                    1. Open Google Maps in your browser.<br />
                    2. Search for your institute address and click <strong>Share</strong>.<br />
                    3. Select the <strong>Embed a map</strong> tab.<br />
                    4. Copy the URL inside <code className="font-bold">src="..."</code> (starts with <code className="font-bold">https://www.google.com/maps/embed</code>).
                  </div>
                )}
                <input
                  type="url"
                  value={centreForm.embed_url}
                  onChange={(e) => setCentreForm({ ...centreForm, embed_url: e.target.value })}
                  placeholder="https://www.google.com/maps/embed?pb=..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:border-[#D9A52E]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_primary"
                    checked={centreForm.is_primary}
                    onChange={(e) => setCentreForm({ ...centreForm, is_primary: e.target.checked })}
                    className="rounded border-slate-300 text-[#D9A52E] focus:ring-[#D9A52E]"
                  />
                  <label htmlFor="is_primary" className="font-semibold text-slate-700 cursor-pointer">
                    Primary Centre
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={centreForm.is_active}
                    onChange={(e) => setCentreForm({ ...centreForm, is_active: e.target.checked })}
                    className="rounded border-slate-300 text-[#D9A52E] focus:ring-[#D9A52E]"
                  />
                  <label htmlFor="is_active" className="font-semibold text-slate-700 cursor-pointer">
                    Active / Publicly Visible
                  </label>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Display Sort Order</label>
                <input
                  type="number"
                  value={centreForm.order}
                  onChange={(e) => setCentreForm({ ...centreForm, order: Number(e.target.value) })}
                  className="w-24 bg-slate-50 border border-slate-200 rounded-lg p-2 outline-none focus:border-[#D9A52E]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCentreModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingCentre}
                  className="px-5 py-2 rounded-xl bg-[#D9A52E] hover:bg-[#F0C45B] text-[#061426] font-bold flex items-center gap-1.5 shadow"
                >
                  {savingCentre && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save Centre
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default AdminSiteSettingsPage;
