import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  FileText,
  Loader2,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../services/supabaseClient';
import { Button } from '../components/Button';
import { downloadVatCertificatePdf } from '../services/vatCertificateService';

type Periodicity = 'daily' | 'weekly' | 'monthly' | 'inactive';

interface MonitoredNumber {
  uuid: string;
  country_code: string;
  vat_number: string;
  country_code_requester: string | null;
  vat_number_requester: string | null;
  periodicity: string;
  number_of_checks: number;
  last_check_date: string | null;
  created_at: string;
  reference: unknown;
}

interface VatCheckHistoryItem {
  id: string | number;
  created_at: string | null;
  country_code_check?: string | null;
  vat_number_check?: string | null;
  country_code_requester_check?: string | null;
  vat_number_requester_check?: string | null;
  validation_code: string | null;
  verification_code: string | null;
  name: string | null;
  address: string | null;
  valid: boolean | null;
  vat_check_date: string | null;
}

interface ChecksListResponse {
  checks?: VatCheckHistoryItem[];
  pagination?: {
    total?: number;
  };
  error?: string;
  message?: string;
}

interface VatNumberPatchResponse {
  vat_number?: {
    periodicity?: string | null;
  };
  error?: string;
  message?: string;
}

interface VatNumberDeleteResponse {
  success?: boolean;
  status?: string;
  error?: string;
  message?: string;
}

const PERIODICITY_OPTIONS: Array<{ value: Periodicity; label: string }> = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'inactive', label: 'Inactive' },
];

const CHECKER_DEV_BASE_URL = 'https://api.cyplom.com/functions/v1/checker-dev';
const CHECKS_PAGE_SIZE = 50;

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

const normalizePeriodicity = (value: string | null | undefined): Periodicity => {
  if (value === 'daily' || value === 'weekly' || value === 'monthly' || value === 'inactive') {
    return value;
  }
  return 'daily';
};

const formatDateDDMMYYYY = (value: string | null | undefined): string => {
  if (!value) {
    return '-';
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return '-';
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [year, month, day] = trimmed.split('-');
    return `${day}/${month}/${year}`;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return trimmed;
  }

  const day = String(parsed.getDate()).padStart(2, '0');
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const year = String(parsed.getFullYear());
  return `${day}/${month}/${year}`;
};

const toReferenceRecord = (value: unknown): Record<string, unknown> => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
};

const readString = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const CheckerChecks: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { vatNumberUuid } = useParams<{ vatNumberUuid: string }>();

  const [monitoredNumber, setMonitoredNumber] = useState<MonitoredNumber | null>(null);
  const [loadingMonitoredNumber, setLoadingMonitoredNumber] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  const [periodicityDraft, setPeriodicityDraft] = useState<Periodicity>('daily');
  const [updatingPeriodicity, setUpdatingPeriodicity] = useState(false);
  const [deletingVatNumber, setDeletingVatNumber] = useState(false);
  const [periodicityToast, setPeriodicityToast] = useState<string | null>(null);

  const [checksHistory, setChecksHistory] = useState<VatCheckHistoryItem[]>([]);
  const [checksLoading, setChecksLoading] = useState(false);
  const [checksError, setChecksError] = useState<string | null>(null);
  const [checksPage, setChecksPage] = useState(1);
  const [checksTotal, setChecksTotal] = useState(0);
  const [checksTotalPages, setChecksTotalPages] = useState(1);
  const [checksDateFrom, setChecksDateFrom] = useState('');
  const [checksDateTo, setChecksDateTo] = useState('');
  const [downloadingCertificateId, setDownloadingCertificateId] = useState<string | number | null>(null);

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

  const fetchChecksHistoryForVat = async (
    monitoredVatUuid: string,
    pageNumber: number,
    dateFrom: string,
    dateTo: string
  ): Promise<{ items: VatCheckHistoryItem[]; total: number }> => {
    const headers = await getAuthHeaders();
    const offset = (pageNumber - 1) * CHECKS_PAGE_SIZE;
    const params = new URLSearchParams({
      limit: String(CHECKS_PAGE_SIZE),
      offset: String(offset),
    });
    if (dateFrom) params.set('date_from', dateFrom);
    if (dateTo) params.set('date_to', dateTo);

    const response = await fetch(
      `${CHECKER_DEV_BASE_URL}/vat/checks/${monitoredVatUuid}?${params.toString()}`,
      {
        method: 'GET',
        headers,
      }
    );

    const payload = (await response.json().catch(() => null)) as ChecksListResponse | null;
    if (!response.ok) {
      throw new Error(payload?.error || payload?.message || 'Failed to load check history.');
    }

    const items = Array.isArray(payload?.checks) ? payload.checks : [];
    const total =
      typeof payload?.pagination?.total === 'number'
        ? payload.pagination.total
        : items.length;

    return { items, total };
  };

  useEffect(() => {
    if (!vatNumberUuid) {
      setPageError('Invalid VAT number id.');
      setLoadingMonitoredNumber(false);
      return;
    }

    let isMounted = true;
    const loadMonitoredNumber = async () => {
      setLoadingMonitoredNumber(true);
      setPageError(null);

      try {
        const { data, error } = await supabase
          .from('vat_checker_numbers')
          .select('*')
          .eq('uuid', vatNumberUuid)
          .maybeSingle<MonitoredNumber>();

        if (error) {
          throw error;
        }
        if (!data) {
          throw new Error('VAT number not found.');
        }
        if (!isMounted) return;

        setMonitoredNumber(data);
        setPeriodicityDraft(normalizePeriodicity(data.periodicity));
      } catch (error: unknown) {
        if (!isMounted) return;
        const message = error instanceof Error ? error.message : t.widget.error;
        setPageError(message);
      } finally {
        if (isMounted) {
          setLoadingMonitoredNumber(false);
        }
      }
    };

    void loadMonitoredNumber();
    return () => {
      isMounted = false;
    };
  }, [vatNumberUuid, t.widget.error]);

  useEffect(() => {
    if (!monitoredNumber?.uuid) {
      setChecksHistory([]);
      setChecksTotal(0);
      setChecksTotalPages(1);
      setChecksError(null);
      setChecksLoading(false);
      return;
    }

    if (checksDateFrom && checksDateTo && checksDateFrom > checksDateTo) {
      setChecksHistory([]);
      setChecksTotal(0);
      setChecksTotalPages(1);
      setChecksError('Start date cannot be after end date.');
      setChecksLoading(false);
      return;
    }

    let isMounted = true;
    const loadChecks = async () => {
      setChecksLoading(true);
      setChecksError(null);

      try {
        const { items, total } = await fetchChecksHistoryForVat(
          monitoredNumber.uuid,
          checksPage,
          checksDateFrom,
          checksDateTo
        );
        if (!isMounted) return;

        setChecksHistory(items);
        setChecksTotal(total);
        setChecksTotalPages(Math.max(1, Math.ceil(total / CHECKS_PAGE_SIZE)));
      } catch (error: unknown) {
        if (!isMounted) return;
        const message = error instanceof Error ? error.message : 'Failed to load check history.';
        setChecksHistory([]);
        setChecksTotal(0);
        setChecksTotalPages(1);
        setChecksError(message);
      } finally {
        if (isMounted) {
          setChecksLoading(false);
        }
      }
    };

    void loadChecks();
    return () => {
      isMounted = false;
    };
  }, [monitoredNumber?.uuid, checksPage, checksDateFrom, checksDateTo]);

  useEffect(() => {
    if (!periodicityToast) {
      return;
    }

    const timer = setTimeout(() => setPeriodicityToast(null), 3500);
    return () => clearTimeout(timer);
  }, [periodicityToast]);

  const savePeriodicity = async () => {
    if (!monitoredNumber) return;

    const current = normalizePeriodicity(monitoredNumber.periodicity);
    if (current === periodicityDraft) {
      return;
    }

    setUpdatingPeriodicity(true);
    setPageError(null);

    try {
      const headers = await getAuthHeaders(true);
      const response = await fetch(
        `${CHECKER_DEV_BASE_URL}/vat/numbers/${monitoredNumber.uuid}`,
        {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            periodicity: periodicityDraft,
          }),
        }
      );
      const payload = (await response.json().catch(() => null)) as VatNumberPatchResponse | null;

      if (!response.ok) {
        throw new Error(extractApiErrorMessage(payload, 'Failed to update periodicity.'));
      }

      const nextPeriodicity = normalizePeriodicity(payload?.vat_number?.periodicity ?? periodicityDraft);
      setMonitoredNumber((prev) => (prev ? { ...prev, periodicity: nextPeriodicity } : prev));
      setPeriodicityDraft(nextPeriodicity);
      setPeriodicityToast(t.checker.monitoring.detail.periodicityUpdated);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to update periodicity.';
      setPageError(message);
      setPeriodicityDraft(current);
    } finally {
      setUpdatingPeriodicity(false);
    }
  };

  const downloadCheckCertificate = async (check: VatCheckHistoryItem) => {
    if (!monitoredNumber || downloadingCertificateId != null) {
      return;
    }

    const checkDate = check.vat_check_date || check.created_at || monitoredNumber.last_check_date;
    const countryCode = check.country_code_check || monitoredNumber.country_code;
    const number = check.vat_number_check || monitoredNumber.vat_number;
    const countryCodeRequest =
      check.country_code_requester_check || monitoredNumber.country_code_requester || null;
    const numberRequest =
      check.vat_number_requester_check || monitoredNumber.vat_number_requester || null;
    const requestId = check.validation_code || check.verification_code || null;

    if (!countryCode || !number) {
      setPageError('Missing VAT data for certificate generation.');
      return;
    }

    setDownloadingCertificateId(check.id);
    setPageError(null);
    try {
      await downloadVatCertificatePdf({
        countryCode,
        number,
        dateCheck: checkDate,
        validity: check.valid,
        name: check.name,
        address: check.address,
        validationCode: requestId,
        countryCodeRequest,
        numberRequest,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to download certificate.';
      setPageError(message);
    } finally {
      setDownloadingCertificateId(null);
    }
  };

  const softDeleteVatNumber = async () => {
    if (!monitoredNumber || deletingVatNumber) return;

    const confirmed = window.confirm(
      t.checker.monitoring.detail.deleteConfirm || 'Are you sure you want to remove this VAT number from monitoring?'
    );
    if (!confirmed) return;

    setDeletingVatNumber(true);
    setPageError(null);

    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `${CHECKER_DEV_BASE_URL}/vat/numbers/${monitoredNumber.uuid}`,
        {
          method: 'DELETE',
          headers,
        }
      );
      const payload = (await response.json().catch(() => null)) as VatNumberDeleteResponse | null;

      if (!response.ok) {
        throw new Error(extractApiErrorMessage(payload, 'Failed to delete VAT number.'));
      }

      navigate('/checker/monitoring_room');
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : t.checker.monitoring.detail.deleteError || 'Failed to delete VAT number.';
      setPageError(message);
    } finally {
      setDeletingVatNumber(false);
    }
  };

  const entityName = useMemo<string | null>(() => {
    if (!monitoredNumber) return null;
    const reference = toReferenceRecord(monitoredNumber.reference);
    return (
      readString(reference.name) ||
      readString(reference.nom_complet) ||
      readString(reference.counterpart_name) ||
      null
    );
  }, [monitoredNumber]);

  if (loadingMonitoredNumber) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[#141585]" />
      </div>
    );
  }

  if (!monitoredNumber) {
    return (
      <div className="max-w-4xl mx-auto pb-10">
        <button
          type="button"
          onClick={() => navigate('/checker/monitoring_room')}
          className="mb-5 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-[#141585]"
        >
          <ChevronLeft size={16} />
          Back to Monitoring Room
        </button>
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          {pageError || 'VAT number not found.'}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto pb-10 flex flex-col gap-6">
      {periodicityToast && (
        <div className="fixed top-24 right-6 z-[150] px-5 py-4 rounded-2xl shadow-2xl border bg-emerald-50 border-emerald-200 text-emerald-900 flex items-start gap-4 max-w-sm animate-in slide-in-from-right-10 duration-300">
          <div className="mt-0.5 p-1 rounded-full bg-emerald-500 text-white">
            <CheckCircle size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm leading-tight">{t.common.save}</p>
            <p className="text-xs opacity-80 mt-1 leading-relaxed">{periodicityToast}</p>
          </div>
          <button
            onClick={() => setPeriodicityToast(null)}
            className="shrink-0 p-1 hover:bg-black/5 rounded-lg transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate('/checker/monitoring_room')}
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-[#141585]"
        >
          <ChevronLeft size={16} />
          Back to Monitoring Room
        </button>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-[#141585]">{t.checker.monitoring.detail.historyTitle}</h1>
        <p className="text-gray-500 text-sm mt-1">
          {monitoredNumber.country_code}
          {monitoredNumber.vat_number}
          {entityName ? ` - ${entityName}` : ''}
        </p>
      </div>

      {pageError && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          {pageError}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_2px_12px_-4px_rgba(6,81,237,0.1)] p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4">
            <p className="text-xs uppercase tracking-wider text-gray-500">Country</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">{monitoredNumber.country_code}</p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4">
            <p className="text-xs uppercase tracking-wider text-gray-500">Requester VAT</p>
            <p className="mt-1 text-sm font-semibold text-gray-900 font-mono">
              {monitoredNumber.country_code_requester && monitoredNumber.vat_number_requester
                ? `${monitoredNumber.country_code_requester}${monitoredNumber.vat_number_requester}`
                : '-'}
            </p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4">
            <p className="text-xs uppercase tracking-wider text-gray-500">Checks</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">{monitoredNumber.number_of_checks ?? 0}</p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4">
            <p className="text-xs uppercase tracking-wider text-gray-500">Last Check</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">{formatDateDDMMYYYY(monitoredNumber.last_check_date)}</p>
          </div>
        </div>

        <div className="mt-5 flex flex-col sm:flex-row gap-3 sm:items-end sm:justify-between">
          <div className="flex items-end gap-2">
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1">Frequency</label>
              <select
                value={periodicityDraft}
                onChange={(event) => setPeriodicityDraft(normalizePeriodicity(event.target.value))}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 outline-none"
                disabled={updatingPeriodicity}
              >
                {PERIODICITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={savePeriodicity}
              disabled={
                updatingPeriodicity ||
                normalizePeriodicity(monitoredNumber.periodicity) === periodicityDraft
              }
            >
              {updatingPeriodicity ? <Loader2 size={14} className="animate-spin" /> : t.common.save}
            </Button>
          </div>

          <Button
            type="button"
            variant="secondary"
            onClick={softDeleteVatNumber}
            disabled={deletingVatNumber}
            className="border-red-200 text-red-700 hover:bg-red-50"
          >
            {deletingVatNumber ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
            {t.common.delete}
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_2px_12px_-4px_rgba(6,81,237,0.1)] overflow-hidden">
        <div className="p-5 border-b border-gray-100 bg-gray-50/40">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="date"
              value={checksDateFrom}
              onChange={(event) => {
                setChecksDateFrom(event.target.value);
                setChecksPage(1);
              }}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 outline-none"
            />
            <input
              type="date"
              value={checksDateTo}
              onChange={(event) => {
                setChecksDateTo(event.target.value);
                setChecksPage(1);
              }}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 outline-none"
            />
          </div>
          {(checksDateFrom || checksDateTo) && (
            <button
              type="button"
              onClick={() => {
                setChecksDateFrom('');
                setChecksDateTo('');
                setChecksPage(1);
              }}
              className="mt-2 text-xs text-indigo-700 hover:text-indigo-900 font-medium"
            >
              {t.checker.monitoring.detail.clearFilters}
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-semibold">
              <tr>
                <th className="px-5 py-3">{t.checker.monitoring.detail.checkDate}</th>
                <th className="px-5 py-3">{t.checker.monitoring.detail.requestId}</th>
                <th className="px-5 py-3">{t.checker.monitoring.table.entity}</th>
                <th className="px-5 py-3">Address</th>
                <th className="px-5 py-3 text-right">{t.checker.monitoring.detail.result}</th>
                <th className="px-5 py-3 text-right">{t.common.download}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {checksLoading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-gray-500">
                    <div className="inline-flex items-center gap-2">
                      <Loader2 size={16} className="animate-spin" />
                      {t.common.loading}
                    </div>
                  </td>
                </tr>
              ) : checksError ? (
                <tr>
                  <td colSpan={6} className="px-5 py-6 text-red-700 bg-red-50/50">
                    {checksError}
                  </td>
                </tr>
              ) : checksHistory.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-gray-500">
                    {t.checker.monitoring.detail.emptyHistory}
                  </td>
                </tr>
              ) : (
                checksHistory.map((check) => {
                  const checkDate = check.vat_check_date || check.created_at;
                  const requestId = check.validation_code || check.verification_code || '-';
                  return (
                    <tr key={`${check.id}`} className="hover:bg-gray-50/50">
                      <td className="px-5 py-4 text-gray-700">
                        {checkDate ? new Date(checkDate).toLocaleString() : '-'}
                      </td>
                      <td className="px-5 py-4 font-mono text-gray-700">{requestId}</td>
                      <td className="px-5 py-4 text-gray-800">{check.name || '-'}</td>
                      <td className="px-5 py-4 text-gray-600 max-w-[360px] truncate" title={check.address || ''}>
                        {check.address || '-'}
                      </td>
                      <td className="px-5 py-4 text-right">
                        {check.valid === true ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle size={12} /> {t.checker.status.valid}
                          </span>
                        ) : check.valid === false ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
                            <XCircle size={12} /> {t.checker.status.invalid}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-700 border border-gray-200">
                            <AlertTriangle size={12} /> {t.checker.status.pending}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => void downloadCheckCertificate(check)}
                          disabled={downloadingCertificateId === check.id}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          title={t.checker.monitoring.detail.downloadCert}
                        >
                          {downloadingCertificateId === check.id ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <FileText size={13} />
                          )}
                          {t.common.download}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {!checksLoading && checksTotalPages > 1 && (
          <div className="px-5 py-4 border-t border-gray-100 bg-gray-50/40 flex items-center justify-between">
            <p className="text-xs text-gray-500">{checksTotal} total</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setChecksPage((prev) => Math.max(1, prev - 1))}
                disabled={checksPage === 1}
                className="p-1.5 rounded-md border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="text-xs font-medium text-gray-600">
                {checksPage}/{checksTotalPages}
              </span>
              <button
                type="button"
                onClick={() => setChecksPage((prev) => Math.min(checksTotalPages, prev + 1))}
                disabled={checksPage >= checksTotalPages}
                className="p-1.5 rounded-md border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
