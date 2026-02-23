
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { Logo } from '../components/Logo';
import { ArrowRight, CheckCircle2, Loader2, AlertCircle, Globe, FileText, Shield, Lock, Activity } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../services/supabaseClient';

export const Signup: React.FC = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [vatNumber, setVatNumber] = useState('');
  const [location, setLocation] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { t, language, setLanguage } = useLanguage();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const trimmedFirstName = firstName.trim();
      const trimmedLastName = lastName.trim();
      const trimmedCompanyName = companyName.trim();
      const normalizedVatNumber = vatNumber.trim().toUpperCase();
      const trimmedLocation = location.trim();
      const fullName = [trimmedFirstName, trimmedLastName].filter(Boolean).join(' ').trim();

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName || null,
            first_name: trimmedFirstName || null,
            name: trimmedLastName || null,
            company_name: trimmedCompanyName || null,
            user_vat_number: normalizedVatNumber || null,
            address: trimmedLocation || null,
            location: trimmedLocation || null
          },
        },
      });

      if (signUpError) throw signUpError;
      if (!signUpData.user?.id) {
        throw new Error('Account created but profile initialization failed.');
      }

      const { error: profileError } = await supabase
        .from('user_data')
        .upsert(
          {
            id: signUpData.user.id,
            first_name: trimmedFirstName || null,
            name: trimmedLastName || null,
            company_name: trimmedCompanyName || null,
            user_vat_number: normalizedVatNumber || null,
            address: trimmedLocation || null
          },
          { onConflict: 'id' }
        );

      if (profileError) {
        throw new Error(`Account created, but profile setup failed: ${profileError.message}`);
      }

      // Redirect to login page on success
      navigate('/login');
    } catch (err: any) {
      console.error('Signup error:', err);
      setError(err.message || 'Failed to sign up');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-white relative">
      <div className="absolute top-4 right-4 z-50">
        <button 
          onClick={() => setLanguage(language === 'en' ? 'fr' : 'en')}
          className="flex items-center gap-1 px-3 py-1.5 bg-white shadow-sm border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <Globe size={16} className="text-[#141585]" />
          <span className="uppercase">{language}</span>
        </button>
      </div>

      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-[#141585] via-[#1e1f9a] to-indigo-600 relative overflow-hidden items-center justify-center p-12 text-white">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-white opacity-[0.05] blur-3xl animate-blob"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-indigo-400 opacity-[0.1] blur-3xl animate-blob animation-delay-2000"></div>

        {/* Floating Icons for dynamism */}
        <div className="absolute top-[10%] left-[15%] opacity-20 animate-float">
          <FileText size={48} />
        </div>
        <div className="absolute bottom-[15%] right-[20%] opacity-15 animate-float animation-delay-2000" style={{ animationDuration: '8s' }}>
          <Shield size={64} />
        </div>
        <div className="absolute top-[25%] left-[5%] opacity-10 animate-float animation-delay-4000">
          <Lock size={32} />
        </div>
        <div className="absolute bottom-[40%] right-[10%] opacity-15 animate-float animation-delay-1000" style={{ animationDuration: '7s' }}>
          <Activity size={40} />
        </div>

        <div className="relative z-10 max-w-lg">
          <div className="mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <Logo className="w-64 text-white" />
          </div>
          
          <h1 className="text-5xl font-bold mb-6 leading-tight">
            {t.auth.sloganLoginPart1} <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-indigo-100">
              {t.auth.sloganLoginPart2}
            </span>
          </h1>
          <p className="text-lg text-indigo-100 mb-8 leading-relaxed">
            {t.auth.subSloganLogin}
          </p>
          <div className="space-y-4">
            {[t.auth.feature1, t.auth.feature2, t.auth.feature3].map((item, idx) => (
              <div key={idx} className="flex items-center gap-3 text-indigo-100/90 font-medium">
                <CheckCircle2 className="w-5 h-5 text-blue-300" />
                <span>{item}</span>
              </div>
            ))}
          </div>

          <div className="mt-12 pt-12 border-t border-white/10 flex justify-between text-indigo-100/80 text-sm">
            <p>© 2026 Cyplom</p>
            <div className="space-x-6">
              <a href="#" className="hover:text-white transition-colors">{t.footer.privacy}</a>
              <a href="#" className="hover:text-white transition-colors">{t.footer.terms}</a>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white text-gray-900">
        <div className="w-full max-w-md space-y-8">
          <div className="text-left">
            <h2 className="text-3xl font-bold tracking-tight text-[#141585]">{t.auth.createAccountTitle}</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
                <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg flex items-start gap-2 border border-red-100">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  {error}
                </div>
            )}

            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-[#141585]">Account</h3>
                <p className="text-xs text-gray-500 mt-1">Login credentials</p>
              </div>
              <Input
                label={t.auth.emailLabel}
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-gray-50 border-gray-200 focus:bg-white"
              />
              <div className="space-y-1">
                <Input
                  label={t.auth.passwordLabel}
                  type="password"
                  placeholder={t.auth.passwordHint}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-gray-50 border-gray-200 focus:bg-white"
                />
                <p className="text-xs text-gray-400">{t.auth.passwordHint}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-[#141585]">Personal Details</h3>
                <p className="text-xs text-gray-500 mt-1">Primary account contact info</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label={t.settings.firstName}
                  type="text"
                  placeholder="e.g. Sarah"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  className="bg-gray-50 border-gray-200 focus:bg-white"
                />
                <Input
                  label={t.settings.lastName}
                  type="text"
                  placeholder="e.g. Johnson"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="bg-gray-50 border-gray-200 focus:bg-white"
                />
              </div>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-[#141585]">Company Information</h3>
                <p className="text-xs text-gray-500 mt-1">Corporate identity and legal numbers</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label={t.settings.companyName}
                  type="text"
                  placeholder="e.g. Acme Corp"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="bg-gray-50 border-gray-200 focus:bg-white"
                />
                <Input
                  label={t.settings.vatNumber}
                  type="text"
                  placeholder="e.g. FR123456789"
                  value={vatNumber}
                  onChange={(e) => setVatNumber(e.target.value)}
                  className="bg-gray-50 border-gray-200 font-mono focus:bg-white"
                />
              </div>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-[#141585]">Location</h3>
                <p className="text-xs text-gray-500 mt-1">Physical office or billing address</p>
              </div>
              <Input
                label={t.settings.location}
                type="text"
                placeholder="Physical office or billing address"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="bg-gray-50 border-gray-200 focus:bg-white"
              />
            </div>

            <Button type="submit" fullWidth disabled={loading} className="h-12 text-base shadow-lg shadow-indigo-900/10 mt-2">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>{t.auth.getStarted} <ArrowRight className="ml-2 w-4 h-4" /></>}
            </Button>
          </form>

          <div className="pt-6 text-center text-sm text-gray-500 border-t border-gray-100">
            {t.auth.alreadyHaveAccount}{' '}
            <Link to="/login" className="font-bold text-indigo-900 hover:text-indigo-700 hover:underline transition-colors">
              {t.auth.logIn}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
