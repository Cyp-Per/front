import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, Loader2, Bot, User, XCircle } from 'lucide-react';
import { getDashboardInsights } from '../services/geminiService';
import { useLanguage } from '../context/LanguageContext';

interface Message {
  id: string;
  role: 'user' | 'ai';
  text: string;
}

export const GeminiWidget: React.FC = () => {
  const { t, language } = useLanguage();
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Initialize welcome message when language changes or component mounts
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        { id: '1', role: 'ai', text: t.widget.welcome }
      ]);
    }
  }, [t.widget.welcome]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: query };
    setMessages(prev => [...prev, userMsg]);
    setQuery('');
    setIsLoading(true);

    try {
      const result = await getDashboardInsights(query, language);
      const aiMsg: Message = { id: (Date.now() + 1).toString(), role: 'ai', text: result };
      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      const errorMsg: Message = { id: (Date.now() + 1).toString(), role: 'ai', text: t.widget.error };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#141585] text-white rounded-2xl overflow-hidden relative">
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center gap-3 bg-indigo-900/30 backdrop-blur-sm z-20 shrink-0">
        <div className="p-2 bg-indigo-500/20 rounded-lg">
          <Sparkles className="w-5 h-5 text-yellow-300" />
        </div>
        <div>
          <h3 className="font-bold text-sm">{t.widget.title}</h3>
          <p className="text-xs text-indigo-200">{t.widget.subtitle}</p>
        </div>
      </div>

      {/* Decorative Background */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/10 rounded-full blur-2xl translate-y-1/3 -translate-x-1/3 pointer-events-none"></div>

      {/* Messages Area - Removed minHeight constraint to fit in container */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 relative z-10 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent"
      >
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              msg.role === 'ai' ? 'bg-indigo-500/30 text-yellow-200' : 'bg-white/20 text-white'
            }`}>
              {msg.role === 'ai' ? <Bot size={16} /> : <User size={16} />}
            </div>
            <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
              msg.role === 'user' 
                ? 'bg-white text-indigo-900 rounded-tr-sm' 
                : 'bg-white/10 text-white border border-white/10 rounded-tl-sm'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex items-start gap-3">
             <div className="w-8 h-8 rounded-full bg-indigo-500/30 text-yellow-200 flex items-center justify-center shrink-0">
               <Bot size={16} />
             </div>
             <div className="bg-white/10 px-4 py-3 rounded-2xl rounded-tl-sm border border-white/10">
               <Loader2 className="w-4 h-4 animate-spin text-indigo-200" />
             </div>
          </div>
        )}
      </div>

      {/* Input Area - shrink-0 ensures it doesn't get compressed */}
      <div className="p-4 bg-indigo-900/30 backdrop-blur-md border-t border-white/10 z-20 shrink-0">
        <form onSubmit={handleAsk} className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.widget.placeholder}
            className="w-full pl-4 pr-12 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-400/50 focus:bg-white/15 transition-all text-sm"
          />
          <button
            type="submit"
            disabled={isLoading || !query.trim()}
            className="absolute right-2 top-2 p-1.5 bg-white text-indigo-900 rounded-lg hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};