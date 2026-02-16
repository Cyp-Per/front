import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../services/supabaseClient';
import { Button } from '../components/Button';
import { Loader2, Key, Trash2, Plus, AlertCircle, CheckCircle, Copy, X, Lock } from 'lucide-react';

interface ApiKey {
  token_id: string;
  token_masked: string;
  validity: boolean;
  status: 'active' | 'deleted';
  issued_at: string | null;
  expires_at: string | null;
  deleted_at: string | null;
  is_current: boolean;
}

interface ApiKeyListResponse {
  api_keys?: unknown[];
}

interface ApiKeyCreateResponse {
  api_key?: {
    token?: string;
  };
  error?: string;
  message?: string;
}

interface ApiErrorResponse {
  error?: string;
  message?: string;
}

const API_BASE_URL = 'https://api.cyplom.com/functions/v1/checker-dev';
const PAGE_SIZE = 10;

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

const normalizeApiKey = (item: unknown): ApiKey | null => {
  if (!item || typeof item !== 'object') {
    return null;
  }

  const record = item as Record<string, unknown>;
  const tokenId =
    typeof record.token_id === 'string'
      ? record.token_id
      : typeof record.token_uuid === 'string'
        ? record.token_uuid
        : '';
  const tokenMasked = typeof record.token_masked === 'string' ? record.token_masked : '';

  if (!tokenId && !tokenMasked) {
    return null;
  }

  return {
    token_id: tokenId,
    token_masked: tokenMasked,
    validity: Boolean(record.validity),
    status: record.status === 'deleted' ? 'deleted' : 'active',
    issued_at: typeof record.issued_at === 'string' ? record.issued_at : null,
    expires_at: typeof record.expires_at === 'string' ? record.expires_at : null,
    deleted_at: typeof record.deleted_at === 'string' ? record.deleted_at : null,
    is_current: Boolean(record.is_current)
  };
};

export const ApiKeys: React.FC = () => {
  const { t } = useLanguage();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Create Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newKeyDuration, setNewKeyDuration] = useState('2592000'); // Default 30 days in seconds
  const [confirmPassword, setConfirmPassword] = useState(''); // Password required for create/delete
  
  // Delete Modal State
  const [keyToDelete, setKeyToDelete] = useState<ApiKey | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Success State
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const getAuthHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('Missing active session. Please sign in again.');
    }

    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`
    };
  };

  const fetchKeys = useCallback(async (showLoader = true) => {
    if (showLoader) {
      setLoading(true);
    }

    setError(null);

    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/auth/api-key?include_deleted=false`, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(extractApiErrorMessage(errorData, 'Failed to fetch API keys'));
      }
      
      const data = (await response.json()) as ApiKeyListResponse;
      const items = Array.isArray(data.api_keys) ? data.api_keys : [];
      const normalizedItems = items
        .map(normalizeApiKey)
        .filter((item): item is ApiKey => item !== null);
      setKeys(normalizedItems);
    } catch (error: unknown) {
      console.error('Error fetching API keys:', error);
      setError(error instanceof Error ? error.message : t.widget.error);
    } finally {
      if (showLoader) {
        setLoading(false);
      }
    }
  }, [t.widget.error]);

  useEffect(() => {
    void fetchKeys();
  }, [fetchKeys]);

  const totalPages = Math.max(1, Math.ceil(keys.length / PAGE_SIZE));
  const paginatedKeys = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return keys.slice(startIndex, startIndex + PAGE_SIZE);
  }, [keys, currentPage]);

  useEffect(() => {
    setCurrentPage((prev) => Math.min(prev, totalPages));
  }, [totalPages]);

  const startItem = keys.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const endItem = Math.min(currentPage * PAGE_SIZE, keys.length);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmPassword) return;
    
    setCreating(true);
    setError(null);

    try {
      const headers = await getAuthHeaders();
      const lifespanSeconds = Number.parseInt(newKeyDuration, 10);
      if (!Number.isInteger(lifespanSeconds) || lifespanSeconds < 60) {
        throw new Error('Invalid API key duration.');
      }

      const payload = {
        password: confirmPassword,
        lifespan_seconds: lifespanSeconds
      };

      const response = await fetch(`${API_BASE_URL}/auth/api-key`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      const data = (await response.json().catch(() => null)) as ApiKeyCreateResponse | null;

      if (!response.ok) {
        throw new Error(extractApiErrorMessage(data, 'Failed to create API key'));
      }

      const token = data?.api_key?.token;
      if (typeof token !== 'string' || token.length === 0) {
        throw new Error('API key created, but the token was missing in the response.');
      }

      setCreatedToken(token);
      
      await fetchKeys(false);
      setConfirmPassword('');
    } catch (error: unknown) {
      console.error('Error creating key:', error);
      setError(error instanceof Error ? error.message : 'Failed to create key.');
    } finally {
      setCreating(false);
    }
  };

  const initiateDelete = (key: ApiKey) => {
    setKeyToDelete(key);
    setConfirmPassword('');
    setError(null);
  };

  const closeDeleteModal = () => {
    setKeyToDelete(null);
    setConfirmPassword('');
    setError(null);
  };

  const confirmDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyToDelete || !confirmPassword) return;

    setDeleting(true);
    setError(null);

    try {
      const headers = await getAuthHeaders();
      if (!keyToDelete.token_id) {
        throw new Error('Missing API key identifier (token_id).');
      }

      const payload = {
        password: confirmPassword,
        token_id: keyToDelete.token_id
      };

      const response = await fetch(`${API_BASE_URL}/auth/api-key`, {
        method: 'DELETE',
        headers,
        body: JSON.stringify(payload)
      });

      const data = (await response.json().catch(() => null)) as ApiErrorResponse | null;

      if (!response.ok) {
        throw new Error(extractApiErrorMessage(data, 'Failed to revoke key'));
      }

      setKeys((prev) => prev.filter((k) => k.token_id !== keyToDelete.token_id));
      closeDeleteModal();
    } catch (error: unknown) {
      console.error('Error deleting key:', error);
      setError(error instanceof Error ? error.message : 'Failed to revoke key.');
    } finally {
      setDeleting(false);
    }
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setCreatedToken(null);
    setNewKeyDuration('2592000');
    setConfirmPassword('');
    setCopied(false);
    setError(null);
  };

  const copyToken = () => {
    if (createdToken) {
      void navigator.clipboard
        .writeText(createdToken)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        })
        .catch(() => {
          setError('Unable to copy API key.');
        });
    }
  };

  return (
    <div className="max-w-5xl mx-auto pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-[#141585] tracking-tight">{t.apiKeys.title}</h1>
          <p className="text-gray-500 text-sm mt-1.5">{t.apiKeys.subtitle}</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus size={18} className="mr-2" />
          {t.apiKeys.createTitle}
        </Button>
      </div>

      {error && !showCreateModal && !keyToDelete && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700">
          <AlertCircle size={20} />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-[0_2px_12px_-4px_rgba(6,81,237,0.1)] border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-[#141585]" />
          </div>
        ) : keys.length === 0 ? (
          <div className="p-12 text-center text-gray-500 flex flex-col items-center">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 text-gray-400">
                <Key size={32} />
            </div>
            <p className="font-medium">{t.apiKeys.noKeys}</p>
            <Button variant="secondary" className="mt-4" onClick={() => setShowCreateModal(true)}>
              {t.apiKeys.createTitle}
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-semibold">
                <tr>
                  <th className="px-6 py-4">{t.apiKeys.columns.token}</th>
                  <th className="px-6 py-4">{t.apiKeys.columns.created}</th>
                  <th className="px-6 py-4">{t.apiKeys.columns.status}</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedKeys.map((key) => {
                    const dateStr = key.issued_at;
                    return (
                      <tr key={key.token_id || key.token_masked} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                              <span className="font-mono text-gray-600 bg-gray-50/50 rounded-lg w-fit px-2 py-1 border border-gray-100">
                                {key.token_masked}
                              </span>
                              {key.is_current && <span className="text-[10px] text-indigo-600 font-medium mt-1">Current Session</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-500">
                          {dateStr ? new Date(dateStr).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            key.status === 'active' || key.validity ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {key.status === 'active' || key.validity ? 'Active' : 'Revoked'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => initiateDelete(key)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title={t.common.delete}
                            disabled={!key.validity && key.status !== 'active'}
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                })}
              </tbody>
            </table>
          </div>
        )}
        {!loading && keys.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-gray-100 px-6 py-4 bg-gray-50/40">
            <p className="text-xs text-gray-500">
              Showing {startItem}-{endItem} of {keys.length}
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span className="text-xs font-medium text-gray-600 px-1">
                Page {currentPage} / {totalPages}
              </span>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
               <h3 className="text-lg font-bold text-gray-900">{createdToken ? 'API Key Generated' : t.apiKeys.createTitle}</h3>
               <button onClick={closeCreateModal} className="text-gray-400 hover:text-gray-600">
                 <X size={20} />
               </button>
            </div>
            
            <div className="p-6">
              {createdToken ? (
                <div className="space-y-4">
                  <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl flex gap-3 text-amber-800 text-sm">
                    <AlertCircle size={20} className="shrink-0" />
                    <p>{t.apiKeys.newKeyWarning}</p>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase">{t.apiKeys.columns.token}</label>
                    <div className="flex gap-2">
                      <code className="flex-1 p-3 bg-gray-50 border border-gray-200 rounded-xl font-mono text-sm text-indigo-900 break-all">
                        {createdToken}
                      </code>
                      <button 
                        onClick={copyToken}
                        className="shrink-0 px-3 flex items-center justify-center bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-xl transition-colors text-gray-600"
                        title={t.common.copy}
                      >
                        {copied ? <CheckCircle size={18} className="text-emerald-600" /> : <Copy size={18} />}
                      </button>
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end">
                    <Button onClick={closeCreateModal} className="w-full">
                      {t.common.close}
                    </Button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleCreate} className="space-y-4">
                  {error && (
                    <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg flex items-start gap-2 border border-red-100">
                      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                      {error}
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t.apiKeys.expiration}</label>
                    <select 
                      value={newKeyDuration}
                      onChange={(e) => setNewKeyDuration(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white text-gray-900"
                    >
                      <option value="604800">{t.apiKeys.durations.d7}</option>
                      <option value="2592000">{t.apiKeys.durations.d30}</option>
                      <option value="7776000">{t.apiKeys.durations.d90}</option>
                      <option value="31536000">{t.apiKeys.durations.y1}</option>
                    </select>
                  </div>

                  <div className="pt-2">
                     <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                     <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input 
                           type="password"
                           value={confirmPassword}
                           onChange={(e) => setConfirmPassword(e.target.value)}
                           className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                           placeholder="Enter your password"
                           required
                        />
                     </div>
                     <p className="text-xs text-gray-400 mt-1">Required to generate a new key.</p>
                  </div>

                  <div className="pt-4 flex gap-3">
                    <Button type="button" variant="secondary" onClick={closeCreateModal} fullWidth>
                      {t.common.cancel}
                    </Button>
                    <Button type="submit" disabled={creating || !confirmPassword} fullWidth>
                      {creating ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : null}
                      {t.apiKeys.generate}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {keyToDelete && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
           <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-6">
                 <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mb-4 text-red-600 mx-auto">
                    <AlertCircle size={24} />
                 </div>
                 <h3 className="text-lg font-bold text-gray-900 text-center mb-2">Revoke API Key?</h3>
                 <p className="text-sm text-center text-gray-500 mb-6">
                    This action cannot be undone. Any applications using this key will lose access immediately.
                 </p>

                 <form onSubmit={confirmDelete} className="space-y-4">
                    {error && (
                        <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg text-center border border-red-100">
                          {error}
                        </div>
                    )}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Confirm Password</label>
                        <input 
                           type="password"
                           value={confirmPassword}
                           onChange={(e) => setConfirmPassword(e.target.value)}
                           className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                           placeholder="Password"
                           required
                           autoFocus
                        />
                    </div>
                    
                    <div className="flex gap-3 pt-2">
                        <Button type="button" variant="secondary" onClick={closeDeleteModal} fullWidth>
                           Cancel
                        </Button>
                        <Button type="submit" className="bg-red-600 hover:bg-red-700 hover:shadow-red-500/30 text-white border-transparent" fullWidth disabled={deleting || !confirmPassword}>
                           {deleting ? <Loader2 className="animate-spin w-4 h-4" /> : 'Revoke Key'}
                        </Button>
                    </div>
                 </form>
              </div>
           </div>
         </div>
      )}
    </div>
  );
};
