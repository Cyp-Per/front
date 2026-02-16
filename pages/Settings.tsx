
import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../services/supabaseClient';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Loader2, Save, User, Building2, MapPin, Globe, CreditCard, Link as LinkIcon, Calendar, CheckCircle, AlertCircle, X } from 'lucide-react';

export const Settings: React.FC = () => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  // Form State
  const [formData, setFormData] = useState({
    id: '',
    created_at: '',
    name: '',
    first_name: '',
    address: '',
    country: '',
    user_vat_number: '',
    company_name: '',
    url_webhook: ''
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        setUserId(user.id);
        const { data, error } = await supabase
          .from('user_data')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error("Error fetching profile:", error);
        }

        if (data) {
          setFormData({
            id: data.id || user.id,
            created_at: data.created_at || new Date().toISOString(),
            name: data.name || '',
            first_name: data.first_name || '',
            address: data.address || '',
            country: data.country || '',
            user_vat_number: data.user_vat_number || '',
            company_name: data.company_name || '',
            url_webhook: data.url_webhook || ''
          });
        } else {
            // Initialize with user metadata if table is empty
            setFormData(prev => ({
                ...prev,
                id: user.id,
                created_at: user.created_at,
                name: user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || '',
                first_name: user.user_metadata?.full_name?.split(' ')[0] || ''
            }));
        }
      }
    } catch (err) {
      console.error("Unexpected error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);
    setToast(null);
    try {
      // Strictly use update as requested. 
      // Note: This requires the row to already exist in 'user_data'.
      const updates = {
        name: formData.name,
        first_name: formData.first_name,
        address: formData.address,
        country: formData.country,
        user_vat_number: formData.user_vat_number,
        company_name: formData.company_name,
        url_webhook: formData.url_webhook,
      };

      const { error } = await supabase
        .from('user_data')
        .update(updates)
        .eq('id', userId);

      if (error) throw error;
      
      setToast({ 
        message: `${t.settings.saveSuccess} (${formData.company_name || formData.first_name})`, 
        type: 'success' 
      });
      
    } catch (err: any) {
      setToast({ message: t.settings.saveError + " " + err.message, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[#141585]" />
      </div>
    );
  }

  // Modern input class for consistency - White background, subtle border, nice focus ring
  const inputClass = "w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-900 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all duration-200 placeholder-gray-400 shadow-sm hover:border-gray-300";

  return (
    <div className="max-w-4xl mx-auto pb-10 relative">
      {/* Toast Notification - Positioned to be clearly visible */}
      {toast && (
        <div className={`fixed top-24 right-6 z-[150] px-5 py-4 rounded-2xl shadow-2xl border flex items-start gap-4 max-w-sm animate-in slide-in-from-right-10 duration-300 ${
            toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'
        }`}>
            <div className={`mt-0.5 p-1 rounded-full ${toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-bold text-sm leading-tight">{toast.type === 'success' ? 'Settings Updated' : 'Update Failed'}</p>
                <p className="text-xs opacity-80 mt-1 leading-relaxed">{toast.message}</p>
            </div>
            <button onClick={() => setToast(null)} className="shrink-0 p-1 hover:bg-black/5 rounded-lg transition-colors">
                <X size={16}/>
            </button>
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-[#141585] tracking-tight">{t.settings.title}</h1>
        <p className="text-gray-500 text-sm mt-1.5">{t.settings.subtitle}</p>
      </div>

      <div className="grid gap-6">
        {/* Company Section */}
        <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 p-6 sm:p-8 transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
            <div className="flex items-center gap-3 mb-8 pb-4 border-b border-gray-50">
                <div className="p-3 bg-indigo-50 rounded-2xl text-[#141585]">
                    <Building2 size={24} />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-gray-800">{t.settings.companyInfo}</h2>
                    <p className="text-xs text-gray-400 mt-0.5">Corporate identity and legal numbers</p>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">{t.settings.companyName}</label>
                    <input 
                        name="company_name"
                        value={formData.company_name}
                        onChange={handleChange}
                        className={inputClass}
                        placeholder="e.g. Acme Corp"
                    />
                </div>
                <div className="space-y-2">
                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                        <CreditCard size={12} className="text-gray-400" /> {t.settings.vatNumber}
                    </label>
                    <input 
                        name="user_vat_number"
                        value={formData.user_vat_number}
                        onChange={handleChange}
                        className={`${inputClass} font-mono`}
                        placeholder="e.g. FR123456789"
                    />
                </div>
            </div>
        </div>

        {/* Personal Section */}
        <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 p-6 sm:p-8 transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
            <div className="flex items-center gap-3 mb-8 pb-4 border-b border-gray-50">
                <div className="p-3 bg-blue-50 rounded-2xl text-blue-600">
                    <User size={24} />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-gray-800">{t.settings.personalDetails}</h2>
                    <p className="text-xs text-gray-400 mt-0.5">Primary account contact info</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">{t.settings.firstName}</label>
                    <input 
                        name="first_name"
                        value={formData.first_name}
                        onChange={handleChange}
                        className={inputClass}
                    />
                </div>
                <div className="space-y-2">
                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">{t.settings.lastName}</label>
                    <input 
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        className={inputClass}
                    />
                </div>
            </div>
        </div>

        {/* Location Section */}
        <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 p-6 sm:p-8 transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
            <div className="flex items-center gap-3 mb-8 pb-4 border-b border-gray-50">
                <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600">
                    <MapPin size={24} />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-gray-800">{t.settings.location}</h2>
                    <p className="text-xs text-gray-400 mt-0.5">Physical office or billing address</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="md:col-span-2 space-y-2">
                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">{t.settings.address}</label>
                    <input 
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        className={inputClass}
                        placeholder="Street address, P.O. Box..."
                    />
                </div>
                <div className="space-y-2">
                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                        <Globe size={12} className="text-gray-400" /> {t.settings.country}
                    </label>
                    <input 
                        name="country"
                        value={formData.country}
                        onChange={handleChange}
                        className={inputClass}
                    />
                </div>
            </div>
        </div>

        {/* Technical Section */}
        <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 p-6 sm:p-8 transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
            <div className="flex items-center gap-3 mb-8 pb-4 border-b border-gray-50">
                <div className="p-3 bg-amber-50 rounded-2xl text-amber-600">
                    <LinkIcon size={24} />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-gray-800">{t.settings.integration}</h2>
                    <p className="text-xs text-gray-400 mt-0.5">External system hooks and identifiers</p>
                </div>
            </div>

            <div className="space-y-8">
                <div className="space-y-2">
                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">{t.settings.webhookUrl}</label>
                    <input 
                        name="url_webhook"
                        value={formData.url_webhook}
                        onChange={handleChange}
                        className={`${inputClass} font-mono text-xs`}
                        placeholder="https://api.your-system.com/webhook"
                    />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-gray-50">
                    <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2.5 ml-1">{t.settings.userId}</label>
                        <div className="px-4 py-3 bg-gray-50 rounded-xl border border-gray-100 text-xs font-mono text-gray-500 select-all shadow-inner">
                            {formData.id}
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2.5 ml-1 flex items-center gap-1">
                            <Calendar size={10} /> {t.settings.createdAt}
                        </label>
                        <div className="px-4 py-3 bg-gray-50 rounded-xl border border-gray-100 text-xs text-gray-500 shadow-inner">
                            {formData.created_at ? new Date(formData.created_at).toLocaleDateString(undefined, { dateStyle: 'long' }) + ' at ' + new Date(formData.created_at).toLocaleTimeString(undefined, { timeStyle: 'short' }) : '-'}
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div className="flex justify-end pt-6">
            <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto min-w-[180px] h-14 text-base font-bold shadow-xl shadow-indigo-900/20 rounded-2xl">
                {saving ? <Loader2 className="animate-spin w-5 h-5 mr-2" /> : <Save size={20} className="mr-2" />}
                {t.common.save}
            </Button>
        </div>
      </div>
    </div>
  );
};
