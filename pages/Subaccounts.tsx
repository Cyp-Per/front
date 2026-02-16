import React, { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../services/supabaseClient';
import { Button } from '../components/Button';
import { Loader2, Plus, Trash2, AlertCircle, Building2 } from 'lucide-react';

interface Subaccount {
  id: string;
  created_at: string | null;
  name: string | null;
  subuser_vat_number: string;
}

interface SubaccountsListResponse {
  subaccounts?: Subaccount[];
  error?: string;
  message?: string;
}

interface SubaccountCreateResponse {
  subaccount?: Subaccount;
  error?: string;
  message?: string;
}

interface ApiErrorResponse {
  error?: string;
  message?: string;
}

const API_BASE_URL = 'https://api.cyplom.com/functions/v1/checker-dev';

const extractApiErrorMessage = (payload: unknown, fallback: string): string => {
  if (!payload || typeof payload !== 'object') {
    return fallback;
  }

  const record = payload as Record<string, unknown>;
  if (typeof record.error === 'string' && record.error.trim()) {
    return record.error;
  }
  if (typeof record.message === 'string' && record.message.trim()) {
    return record.message;
  }
  return fallback;
};

export const Subaccounts: React.FC = () => {
  const { t } = useLanguage();
  const [subaccounts, setSubaccounts] = useState<Subaccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const [name, setName] = useState('');
  const [vatNumber, setVatNumber] = useState('');

  const getAuthHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('Missing active session. Please sign in again.');
    }

    return {
      'Content-Type': 'application/json',
      'accept': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    };
  };

  const fetchSubaccounts = async (showLoader = true) => {
    if (showLoader) {
      setLoading(true);
    }
    setError(null);

    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/subaccounts`, {
        method: 'GET',
        headers,
      });

      const payload = (await response.json().catch(() => null)) as SubaccountsListResponse | null;
      if (!response.ok) {
        throw new Error(extractApiErrorMessage(payload, 'Failed to fetch subaccounts.'));
      }

      setSubaccounts(Array.isArray(payload?.subaccounts) ? payload!.subaccounts! : []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t.widget.error);
    } finally {
      if (showLoader) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    void fetchSubaccounts();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const vat = vatNumber.trim().toUpperCase();
    if (!vat) return;

    setCreating(true);
    setError(null);

    try {
      const headers = await getAuthHeaders();
      const payload = {
        name: name.trim() || undefined,
        subuser_vat_number: vat,
      };

      const response = await fetch(`${API_BASE_URL}/subaccounts`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      const data = (await response.json().catch(() => null)) as SubaccountCreateResponse | null;
      if (!response.ok) {
        throw new Error(extractApiErrorMessage(data, 'Failed to create subaccount.'));
      }

      setName('');
      setVatNumber('');
      await fetchSubaccounts(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create subaccount.');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (subaccount: Subaccount) => {
    const confirmed = window.confirm(t.subaccounts.deleteConfirm);
    if (!confirmed) return;

    setDeletingId(subaccount.id);
    setError(null);

    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/subaccounts/${subaccount.id}`, {
        method: 'DELETE',
        headers,
      });

      const payload = (await response.json().catch(() => null)) as ApiErrorResponse | null;
      if (!response.ok) {
        throw new Error(extractApiErrorMessage(payload, 'Failed to delete subaccount.'));
      }

      setSubaccounts((prev) => prev.filter((item) => item.id !== subaccount.id));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete subaccount.');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredSubaccounts = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return subaccounts;

    return subaccounts.filter((item) => {
      const nameValue = (item.name || '').toLowerCase();
      const vatValue = (item.subuser_vat_number || '').toLowerCase();
      return nameValue.includes(term) || vatValue.includes(term);
    });
  }, [search, subaccounts]);

  return (
    <div className="max-w-5xl mx-auto pb-10">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-[#141585] tracking-tight">{t.subaccounts.title}</h1>
        <p className="text-gray-500 text-sm mt-1.5">{t.subaccounts.subtitle}</p>
      </div>

      <div className="bg-white rounded-2xl shadow-[0_2px_12px_-4px_rgba(6,81,237,0.1)] border border-gray-100 p-6 mb-6">
        <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              {t.subaccounts.fields.name}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.subaccounts.placeholders.name}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              {t.subaccounts.fields.vat}
            </label>
            <input
              type="text"
              value={vatNumber}
              onChange={(e) => setVatNumber(e.target.value)}
              placeholder={t.subaccounts.placeholders.vat}
              required
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none font-mono"
            />
          </div>
          <Button type="submit" disabled={creating || vatNumber.trim().length === 0}>
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus size={16} />}
            {t.subaccounts.add}
          </Button>
        </form>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700">
          <AlertCircle size={18} />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-[0_2px_12px_-4px_rgba(6,81,237,0.1)] border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.subaccounts.search}
            className="w-full px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 outline-none"
          />
        </div>

        {loading ? (
          <div className="p-12 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-[#141585]" />
          </div>
        ) : filteredSubaccounts.length === 0 ? (
          <div className="p-12 text-center text-gray-500 flex flex-col items-center">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 text-gray-400">
              <Building2 size={30} />
            </div>
            <p className="font-medium">{t.subaccounts.empty}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-semibold">
                <tr>
                  <th className="px-6 py-4">{t.subaccounts.columns.name}</th>
                  <th className="px-6 py-4">{t.subaccounts.columns.vat}</th>
                  <th className="px-6 py-4">{t.subaccounts.columns.created}</th>
                  <th className="px-6 py-4 text-right">{t.subaccounts.columns.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredSubaccounts.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 text-gray-800 font-medium">{item.name || '-'}</td>
                    <td className="px-6 py-4 font-mono text-indigo-900">{item.subuser_vat_number}</td>
                    <td className="px-6 py-4 text-gray-500">
                      {item.created_at ? new Date(item.created_at).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => void handleDelete(item)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title={t.common.delete}
                        disabled={deletingId === item.id}
                      >
                        {deletingId === item.id ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Trash2 size={16} />
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
