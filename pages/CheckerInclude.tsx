
import React, { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Button } from '../components/Button';
import { Upload, FileText, CheckCircle, AlertCircle, Clipboard, X, Loader2, Trash2, CheckSquare, RefreshCw } from 'lucide-react';
import { read, utils } from 'xlsx';
import { supabase } from '../services/supabaseClient';

interface ExtractedNumber {
  id: string;
  value: string;
  source: 'manual' | 'file';
}

interface ProfileResponse {
  profile?: {
    user_vat_number?: string | null;
    company_name?: string | null;
  };
  error?: string;
  message?: string;
}

interface SubaccountItem {
  id: string;
  name: string | null;
  subuser_vat_number: string;
}

interface SubaccountsResponse {
  subaccounts?: SubaccountItem[];
  error?: string;
  message?: string;
}

interface ApiErrorResponse {
  error?: string;
  message?: string;
}

interface RequesterOption {
  value: string;
  label: string;
}

const CHECKER_DEV_BASE_URL = 'https://api.cyplom.com/functions/v1/checker-dev';

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

const normalizeVatInput = (value: string): string =>
  value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

const isVatLike = (value: string): boolean => /^[A-Z]{2}[A-Z0-9]{2,14}$/.test(value);

export const CheckerInclude: React.FC = () => {
  const { t } = useLanguage();
  
  // State
  const [manualText, setManualText] = useState('');
  const [extractedNumbers, setExtractedNumbers] = useState<ExtractedNumber[]>([]);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [requesterOptions, setRequesterOptions] = useState<RequesterOption[]>([]);
  const [selectedRequesterVat, setSelectedRequesterVat] = useState('');
  const [loadingRequesters, setLoadingRequesters] = useState(true);
  const [requesterError, setRequesterError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const getAuthHeaders = async (includeJson = false) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('Missing active session. Please sign in again.');
    }

    const headers: Record<string, string> = {
      accept: 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    };
    if (includeJson) {
      headers['Content-Type'] = 'application/json';
    }
    return headers;
  };

  const loadRequesterOptions = async () => {
    setLoadingRequesters(true);
    setRequesterError(null);

    try {
      const headers = await getAuthHeaders();
      const [profileRes, subaccountsRes] = await Promise.all([
        fetch(`${CHECKER_DEV_BASE_URL}/me`, {
          method: 'GET',
          headers,
        }),
        fetch(`${CHECKER_DEV_BASE_URL}/subaccounts`, {
          method: 'GET',
          headers,
        }),
      ]);

      const profilePayload = (await profileRes.json().catch(() => null)) as ProfileResponse | null;
      const subaccountsPayload = (await subaccountsRes.json().catch(() => null)) as SubaccountsResponse | null;

      if (!profileRes.ok) {
        throw new Error(extractApiErrorMessage(profilePayload, 'Failed to load profile VAT number.'));
      }
      if (!subaccountsRes.ok) {
        throw new Error(extractApiErrorMessage(subaccountsPayload, 'Failed to load subaccounts.'));
      }

      const optionsByVat = new Map<string, RequesterOption>();

      const profileVat = typeof profilePayload?.profile?.user_vat_number === 'string'
        ? normalizeVatInput(profilePayload.profile.user_vat_number)
        : '';
      if (profileVat && isVatLike(profileVat)) {
        const companyName = typeof profilePayload?.profile?.company_name === 'string'
          ? profilePayload.profile.company_name.trim()
          : '';
        const mainLabel = companyName || t.checker.include.requester.mainAccount;
        optionsByVat.set(profileVat, {
          value: profileVat,
          label: `${mainLabel} (${profileVat})`,
        });
      }

      const subaccounts = Array.isArray(subaccountsPayload?.subaccounts)
        ? subaccountsPayload.subaccounts
        : [];

      for (const subaccount of subaccounts) {
        const vat = normalizeVatInput(subaccount.subuser_vat_number || '');
        if (!vat || !isVatLike(vat) || optionsByVat.has(vat)) {
          continue;
        }

        const name = typeof subaccount.name === 'string' ? subaccount.name.trim() : '';
        optionsByVat.set(vat, {
          value: vat,
          label: `${name || t.checker.include.requester.subaccountFallback} (${vat})`,
        });
      }

      const nextOptions = Array.from(optionsByVat.values());
      setRequesterOptions(nextOptions);
      setSelectedRequesterVat((prev) => {
        if (prev && nextOptions.some((option) => option.value === prev)) {
          return prev;
        }
        return nextOptions[0]?.value ?? '';
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t.widget.error;
      setRequesterError(message);
      setRequesterOptions([]);
      setSelectedRequesterVat('');
    } finally {
      setLoadingRequesters(false);
    }
  };

  useEffect(() => {
    void loadRequesterOptions();
  }, []);

  // Manual Processing
  const handleManualProcess = () => {
    if (!manualText.trim()) return;
    
    // Split by newlines, commas, or semicolons
    const rawLines = manualText.split(/[\n,;]+/);
    const validLines = rawLines
      .map(s => s.trim())
      .filter(s => s.length > 0)
      .map(s => ({
        id: `man_${Date.now()}_${Math.random()}`,
        value: s,
        source: 'manual' as const
      }));

    setExtractedNumbers(prev => [...prev, ...validLines]);
    setManualText('');
  };

  // File Processing
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
    e.target.value = ''; // reset
  };

  const processFile = (file: File) => {
    setIsProcessingFile(true);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        // Parse CSV or Excel
        const wb = read(data, { type: 'binary' });
        const sheetName = wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];
        
        // Convert to array of arrays
        const jsonData = utils.sheet_to_json(ws, { header: 1 }) as any[][];
        
        // Extract first column from each row, skipping empty
        const newNumbers: ExtractedNumber[] = jsonData
          .map(row => (row[0] ? String(row[0]).trim() : ''))
          .filter(val => val.length > 0)
          .map(val => ({
             id: `file_${Date.now()}_${Math.random()}`,
             value: val,
             source: 'file'
          }));

        setExtractedNumbers(prev => [...prev, ...newNumbers]);
      } catch (err) {
        console.error("Parse error", err);
        alert("Failed to parse file.");
      } finally {
        setIsProcessingFile(false);
      }
    };

    if (file.name.endsWith('.csv')) {
        // Read as text for CSV sometimes safer, but binary works with XLSX lib usually
        reader.readAsBinaryString(file);
    } else {
        reader.readAsBinaryString(file);
    }
  };

  // Drag & Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const clearNumbers = () => {
    setExtractedNumbers([]);
    setShowSuccess(false);
    setSubmitError(null);
  };

  const removeNumber = (id: string) => {
    setExtractedNumbers(prev => prev.filter(n => n.id !== id));
  };

  const submitNumbers = async () => {
    if (extractedNumbers.length === 0) return;
    if (!selectedRequesterVat) {
      setSubmitError(t.checker.include.requester.missingSelection);
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setShowSuccess(false);

    try {
        const headers = await getAuthHeaders(true);
        const uniqueVats = new Set<string>();
        const prepared = extractedNumbers.map((item) => {
          const normalized = normalizeVatInput(item.value);
          return {
            id: item.id,
            raw: item.value,
            normalized,
          };
        });
        const failedIds = new Set<string>();
        const failureMessages: string[] = [];
        const toCreate: Array<{ id: string; vat: string }> = [];

        for (const item of prepared) {
          if (!isVatLike(item.normalized)) {
            failedIds.add(item.id);
            failureMessages.push(`${item.raw}: ${t.checker.include.errors.invalidVat}`);
            continue;
          }

          if (uniqueVats.has(item.normalized)) {
            failedIds.add(item.id);
            failureMessages.push(`${item.normalized}: ${t.checker.include.errors.duplicateBatch}`);
            continue;
          }

          uniqueVats.add(item.normalized);
          toCreate.push({ id: item.id, vat: item.normalized });
        }

        let createdCount = 0;

        for (const item of toCreate) {
          const response = await fetch(`${CHECKER_DEV_BASE_URL}/vat/numbers`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              vat_number: item.vat,
              requester_vat_number: selectedRequesterVat,
              periodicity: 'daily',
            }),
          });

          const payload = (await response.json().catch(() => null)) as ApiErrorResponse | null;
          if (!response.ok) {
            failedIds.add(item.id);
            failureMessages.push(
              `${item.vat}: ${extractApiErrorMessage(payload, t.checker.include.errors.genericCreate)}`
            );
            continue;
          }

          createdCount += 1;
        }

        setExtractedNumbers((prev) => prev.filter((item) => failedIds.has(item.id)));

        if (createdCount > 0 && failureMessages.length === 0) {
          setShowSuccess(true);
          setTimeout(() => setShowSuccess(false), 3000);
        } else {
          setShowSuccess(false);
        }

        if (failureMessages.length > 0) {
          const preview = failureMessages.slice(0, 3).join(' | ');
          const summary =
            createdCount > 0
              ? `${createdCount} ${t.checker.include.errors.createdSome} ${failureMessages.length} ${t.checker.include.errors.failedSome}: ${preview}`
              : `${failureMessages.length} ${t.checker.include.errors.failedSome}: ${preview}`;
          setSubmitError(summary);
        }

        if (createdCount === 0 && failureMessages.length === 0) {
          setSubmitError(t.checker.include.errors.nothingToSubmit);
        }
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : t.widget.error;
        setSubmitError(message);
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full pb-10">
      <div>
        <h1 className="text-2xl font-bold text-[#141585]">{t.checker.include.title}</h1>
        <p className="text-gray-500 text-sm mt-1">{t.checker.include.subtitle}</p>
      </div>

      <div className="bg-white rounded-2xl shadow-[0_2px_12px_-4px_rgba(6,81,237,0.1)] border border-gray-50 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <h3 className="font-bold text-gray-800">{t.checker.include.requester.title}</h3>
          <button
            type="button"
            className="text-xs text-indigo-700 hover:text-indigo-900 flex items-center gap-1.5"
            onClick={() => void loadRequesterOptions()}
            disabled={loadingRequesters}
          >
            {loadingRequesters ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
            {t.checker.include.requester.refresh}
          </button>
        </div>

        {loadingRequesters ? (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 size={16} className="animate-spin" />
            {t.checker.include.requester.loading}
          </div>
        ) : requesterOptions.length > 0 ? (
          <>
            <select
              value={selectedRequesterVat}
              onChange={(event) => setSelectedRequesterVat(event.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none"
            >
              {requesterOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-2">{t.checker.include.requester.helper}</p>
          </>
        ) : (
          <div className="p-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 text-sm">
            {requesterError || t.checker.include.requester.empty}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Manual Card */}
        <div className="bg-white rounded-2xl shadow-[0_2px_12px_-4px_rgba(6,81,237,0.1)] border border-gray-50 p-6 flex flex-col h-full">
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-indigo-50 rounded-lg text-[#141585]">
                    <Clipboard size={20} />
                </div>
                <h3 className="font-bold text-gray-800">{t.checker.include.manual.title}</h3>
            </div>
            
            <div className="flex-1 flex flex-col gap-3">
                <textarea 
                    className="w-full flex-1 min-h-[150px] p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-100 outline-none text-sm text-gray-700 placeholder-gray-400 font-mono resize-none"
                    placeholder={t.checker.include.manual.placeholder}
                    value={manualText}
                    onChange={(e) => setManualText(e.target.value)}
                />
                <div className="flex justify-between items-center text-xs text-gray-400">
                    <span>{t.checker.include.manual.helper}</span>
                </div>
                <Button onClick={handleManualProcess} disabled={!manualText.trim()}>
                    {t.checker.include.manual.process}
                </Button>
            </div>
        </div>

        {/* Upload Card */}
        <div className="bg-white rounded-2xl shadow-[0_2px_12px_-4px_rgba(6,81,237,0.1)] border border-gray-50 p-6 flex flex-col h-full">
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                    <FileText size={20} />
                </div>
                <h3 className="font-bold text-gray-800">{t.checker.include.upload.title}</h3>
            </div>

            <div 
                className={`flex-1 min-h-[150px] border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-3 transition-colors ${isDragging ? 'border-emerald-500 bg-emerald-50/30' : 'border-gray-200 hover:border-emerald-300 hover:bg-gray-50'}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                    {isProcessingFile ? <Loader2 className="animate-spin" /> : <Upload size={24} />}
                </div>
                <div className="text-center px-4">
                     <p className="font-medium text-gray-700">{isProcessingFile ? t.checker.include.upload.processing : t.checker.include.upload.dragDrop}</p>
                     <p className="text-xs text-gray-400 mt-1">{t.checker.include.upload.helper}</p>
                </div>
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept=".csv, .xlsx, .xls"
                    onChange={handleFileUpload}
                />
                <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isProcessingFile}>
                    {t.checker.include.upload.browse}
                </Button>
            </div>
        </div>
      </div>

      {/* Preview Section */}
      <div className="bg-white rounded-2xl shadow-[0_2px_12px_-4px_rgba(6,81,237,0.1)] border border-gray-50 overflow-hidden">
         <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
             <div className="flex items-center gap-2">
                 <CheckSquare size={18} className="text-[#141585]" />
                 <h3 className="font-bold text-gray-800">{t.checker.include.preview.title}</h3>
                 {extractedNumbers.length > 0 && (
                     <span className="bg-[#141585] text-white text-xs px-2 py-0.5 rounded-full font-medium ml-2">
                         {extractedNumbers.length}
                     </span>
                 )}
             </div>
             {extractedNumbers.length > 0 && (
                 <button onClick={clearNumbers} className="text-xs text-gray-500 hover:text-red-500 flex items-center gap-1 transition-colors">
                     <Trash2 size={12} /> {t.checker.include.preview.clear}
                 </button>
             )}
         </div>

         <div className="p-6">
             {submitError && (
                 <div className="mb-4 p-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm">
                     {submitError}
                 </div>
             )}
             {showSuccess ? (
                 <div className="flex flex-col items-center justify-center py-12 text-center animate-in fade-in zoom-in-95">
                     <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4 text-green-600">
                         <CheckCircle size={32} />
                     </div>
                     <h4 className="text-lg font-bold text-gray-900 mb-1">Success!</h4>
                     <p className="text-gray-500">{t.checker.include.preview.success}</p>
                 </div>
             ) : extractedNumbers.length === 0 ? (
                 <div className="text-center py-12 text-gray-400">
                     <AlertCircle size={48} className="mx-auto mb-3 opacity-20" />
                     <p>{t.checker.include.preview.empty}</p>
                 </div>
             ) : (
                 <div className="space-y-6">
                     <div className="max-h-[300px] overflow-y-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 pr-2">
                         {extractedNumbers.map((num) => (
                             <div key={num.id} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-100 rounded-lg group hover:border-indigo-100 transition-colors">
                                 <span className="font-mono text-sm text-gray-700 truncate font-medium">{num.value}</span>
                                 <button onClick={() => removeNumber(num.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                     <X size={14} />
                                 </button>
                             </div>
                         ))}
                     </div>
                     <div className="flex justify-end pt-4 border-t border-gray-100">
                         <Button
                           onClick={submitNumbers}
                           className="w-full sm:w-auto min-w-[200px]"
                           disabled={isSubmitting || loadingRequesters || requesterOptions.length === 0}
                         >
                             {isSubmitting ? (
                                 <><Loader2 className="animate-spin w-4 h-4 mr-2" /> Saving...</>
                             ) : (
                                 t.checker.include.preview.submit
                             )}
                         </Button>
                     </div>
                 </div>
             )}
         </div>
      </div>
    </div>
  );
};
