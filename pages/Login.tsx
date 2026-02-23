
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { Logo } from '../components/Logo';
import { ArrowRight, CheckCircle2, Loader2, AlertCircle, Globe, FileText, Shield, Lock, Activity } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../services/supabaseClient';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { t, language, setLanguage } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message === 'Invalid login credentials') {
          throw new Error(t.auth.invalidCredentials);
        }
        throw error;
      }
      
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || t.auth.loginError);
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

      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-[#141585] via-[#1e1f9a] to-indigo-600 items-center justify-center p-12 text-white relative overflow-hidden">
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
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md space-y-8">
          <div className="text-left">
            <h2 className="text-3xl font-bold tracking-tight text-[#141585]">
              {t.auth.welcomeBack}
            </h2>
            <p className="mt-2 text-gray-500">
              {t.auth.enterDetails}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3 bg-amber-50 text-amber-800 text-xs rounded-lg flex items-start gap-2 border border-amber-100">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                {error}
              </div>
            )}

            <div className="space-y-4">
              <Input
                label={t.auth.emailLabel}
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <Input
                label={t.auth.passwordLabel}
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <Button type="submit" fullWidth disabled={loading} className="h-12 text-base shadow-lg shadow-indigo-900/10">
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {t.auth.signIn}
                  <ArrowRight className="ml-2 w-4 h-4" />
                </>
              )}
            </Button>
          </form>

          <div className="pt-6 text-center text-sm text-gray-500 border-t border-gray-100">
            {t.auth.noAccount}{' '}
            <Link to="/signup" className="font-bold text-indigo-900 hover:text-indigo-700 hover:underline transition-colors">
              {t.auth.createAccount}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
