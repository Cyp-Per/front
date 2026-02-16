
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../services/supabaseClient';
import { Search, Filter, CheckCircle, XCircle, AlertTriangle, FileText, X, ChevronLeft, ChevronRight, Loader2, Hash, RefreshCcw, Trash2 } from 'lucide-react';
import { Button } from '../components/Button';
import { downloadVatCertificatePdf } from '../services/vatCertificateService';

type Periodicity = 'daily' | 'weekly' | 'monthly' | 'inactive';
type MonitoringStatusFilter = '__all__' | 'pending' | 'inactive' | 'active' | 'deleted';

interface MonitoredNumber {
  uuid: string;
  country_code: string;
  vat_number: string;
  country_code_requester?: string;
  vat_number_requester?: string;
  periodicity: string;
  number_of_checks: number;
  user_uuid: string;
  last_check_date: string;
  last_check_valid?: boolean | null;
  last_check_checked_at?: string | null;
  last_check_name?: string | null;
  created_at: string;
  reference: any; // jsonb
}

interface LatestCheckRow {
  vat_number_uuid: string | null;
  valid: boolean | null;
  vat_check_date: string | null;
  name: string | null;
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
  vat_number_uuid: string | null;
  vat_check_date: string | null;
}

interface VatNumberUuidRow {
  uuid?: string | null;
}

interface VatCheckUuidRow {
  vat_number_uuid?: string | null;
}

interface RequesterOption {
  value: string;
  label: string;
}

interface VatContextMenuState {
  x: number;
  y: number;
  item: MonitoredNumber;
}

interface VatNumberPatchResponse {
  vat_number?: {
    periodicity?: string | null;
  };
  error?: string;
  message?: string;
}

interface ProfileResponse {
  profile?: {
    user_vat_number?: string | null;
    company_name?: string | null;
  };
  error?: string;
  message?: string;
}

interface SubaccountsResponse {
  subaccounts?: Array<{
    name?: string | null;
    subuser_vat_number?: string | null;
  }>;
  error?: string;
  message?: string;
}

const COL_KEYS = [
  { key: 'country_code', label: 'Country' },
  { key: 'vat_number', label: 'VAT Number' },
  { key: 'entity_name', label: 'Entity Name', isJson: true }, // Derived from reference
  { key: 'created_at', label: 'Added Date' },
  { key: 'last_check_date', label: 'Last Check' },
  { key: 'number_of_checks', label: 'Checks' },
  { key: 'periodicity', label: 'Frequency' },
];

const PERIODICITY_OPTIONS: Array<{ value: Periodicity; label: string }> = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'inactive', label: 'Inactive' },
];

const CHECKER_DEV_BASE_URL = 'https://api.cyplom.com/functions/v1/checker-dev';
const CHECKS_PAGE_SIZE = 50;
const STATUS_FILTER_OPTIONS: Array<{ value: MonitoringStatusFilter; label: string }> = [
  { value: '__all__', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'active', label: 'Active' },
  { value: 'deleted', label: 'Deleted' },
];
const PAGE_SIZE_OPTIONS = [15, 25, 50, 100];

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

const sanitizeSearchTerm = (value: string): string =>
  value
    .trim()
    .replace(/[%_]/g, '')
    .replace(/,/g, ' ');

const normalizeVatInput = (value: string): string =>
  value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

const isVatLike = (value: string): boolean => /^[A-Z]{2}[A-Z0-9]{2,14}$/.test(value);
const isIsoCountryCodeLike = (value: string): boolean => /^[A-Z]{2}$/.test(value);

const isIsoDate = (value: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(value);

const formatDateDDMMYYYY = (value: string | null | undefined): string => {
  if (!value) {
    return '-';
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return '-';
  }

  if (isIsoDate(trimmed)) {
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

const getNextIsoDate = (isoDate: string): string => {
  const date = new Date(`${isoDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
};

export const CheckerMonitoringRoom: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  
  // Data State
  const [data, setData] = useState<MonitoredNumber[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination State
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [pageInput, setPageInput] = useState('1');

  // Filter State
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [activeFilterCol, setActiveFilterCol] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [requesterOptions, setRequesterOptions] = useState<RequesterOption[]>([]);
  const [requesterFilter, setRequesterFilter] = useState('__all__');
  const [loadingRequesterFilter, setLoadingRequesterFilter] = useState(false);
  const [statusFilter, setStatusFilter] = useState<MonitoringStatusFilter>('__all__');

  // Cache State for Prefetching
  const [dataCache, setDataCache] = useState<Record<number, MonitoredNumber[]>>({});
  const dataCacheRef = useRef<Record<number, MonitoredNumber[]>>({});

  // Selection for Detail View
  const [selectedNumber, setSelectedNumber] = useState<MonitoredNumber | null>(null);
  const [periodicityDraft, setPeriodicityDraft] = useState<Periodicity>('daily');
  const [updatingPeriodicity, setUpdatingPeriodicity] = useState(false);
  const [deletingVatNumber, setDeletingVatNumber] = useState(false);
  const [downloadingLatestCertificate, setDownloadingLatestCertificate] = useState(false);
  const [periodicityToast, setPeriodicityToast] = useState<string | null>(null);
  const [checksHistory, setChecksHistory] = useState<VatCheckHistoryItem[]>([]);
  const [checksLoading, setChecksLoading] = useState(false);
  const [checksError, setChecksError] = useState<string | null>(null);
  const [checksPage, setChecksPage] = useState(1);
  const [checksTotal, setChecksTotal] = useState(0);
  const [checksTotalPages, setChecksTotalPages] = useState(1);
  const [checksDateFrom, setChecksDateFrom] = useState('');
  const [checksDateTo, setChecksDateTo] = useState('');
  const [actionToast, setActionToast] = useState<string | null>(null);
  const [vatContextMenu, setVatContextMenu] = useState<VatContextMenuState | null>(null);
  const [contextAction, setContextAction] = useState<'download' | 'force' | null>(null);
  const showTableOverlayLoader = loading && data.length === 0;

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

  // Track initial render
  const isFirstRender = useRef(true);
  const isPageSizeFirstRender = useRef(true);

  // --- Effects ---

  useEffect(() => {
    loadPageData(page);
    setPageInput(page.toString());
  }, [page]);

  useEffect(() => {
    if (isFirstRender.current) {
        isFirstRender.current = false;
        return;
    }
    const timer = setTimeout(() => {
        setPage(1);
        clearCache();
        loadPageData(1, true);
    }, 500);
    return () => clearTimeout(timer);
  }, [search, filters, requesterFilter, statusFilter]);

  useEffect(() => {
    if (isPageSizeFirstRender.current) {
      isPageSizeFirstRender.current = false;
      return;
    }

    clearCache();
    setPageInput('1');

    if (page !== 1) {
      setPage(1);
      return;
    }

    void loadPageData(1, true);
  }, [pageSize]);

  useEffect(() => {
    if (!periodicityToast) {
      return;
    }

    const timer = setTimeout(() => setPeriodicityToast(null), 3500);
    return () => clearTimeout(timer);
  }, [periodicityToast]);

  useEffect(() => {
    if (!actionToast) {
      return;
    }

    const timer = setTimeout(() => setActionToast(null), 3500);
    return () => clearTimeout(timer);
  }, [actionToast]);

  useEffect(() => {
    if (!vatContextMenu) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setVatContextMenu(null);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [vatContextMenu]);

  useEffect(() => {
    let isMounted = true;

    const loadRequesterOptions = async () => {
      setLoadingRequesterFilter(true);
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

        const ownVat = normalizeVatInput(profilePayload?.profile?.user_vat_number ?? '');
        if (isVatLike(ownVat)) {
          const companyName = profilePayload?.profile?.company_name?.trim() || '';
          const mainLabel = companyName || t.checker.include.requester.mainAccount;
          optionsByVat.set(ownVat, {
            value: ownVat,
            label: `${mainLabel} (${ownVat})`,
          });
        }

        for (const row of subaccountsPayload?.subaccounts || []) {
          const vat = normalizeVatInput(row.subuser_vat_number || '');
          if (!isVatLike(vat) || optionsByVat.has(vat)) {
            continue;
          }
          const name = typeof row.name === 'string' ? row.name.trim() : '';
          optionsByVat.set(vat, {
            value: vat,
            label: `${name || t.checker.include.requester.subaccountFallback} (${vat})`,
          });
        }

        const options: RequesterOption[] = [
          { value: '__all__', label: t.checker.monitoring.filters.allRequesters },
          ...Array.from(optionsByVat.values()),
        ];

        if (isMounted) {
          setRequesterOptions(options);
          setRequesterFilter((prev) =>
            options.some((option) => option.value === prev) ? prev : '__all__'
          );
        }
      } catch (error) {
        console.warn('Unable to load requester filter options:', error);
        if (isMounted) {
          setRequesterOptions([
            { value: '__all__', label: t.checker.monitoring.filters.allRequesters },
          ]);
          setRequesterFilter('__all__');
        }
      } finally {
        if (isMounted) {
          setLoadingRequesterFilter(false);
        }
      }
    };

    void loadRequesterOptions();
    return () => {
      isMounted = false;
    };
  }, [t.checker.include.requester.mainAccount, t.checker.include.requester.subaccountFallback, t.checker.monitoring.filters.allRequesters]);

  // --- Data Fetching Logic ---

  const updateCache = (p: number, pageData: MonitoredNumber[]) => {
      dataCacheRef.current[p] = pageData;
      setDataCache(prev => ({ ...prev, [p]: pageData }));
  };

  const clearCache = () => {
      dataCacheRef.current = {};
      setDataCache({});
  };

  const enrichWithLastCheckResult = async (items: MonitoredNumber[]): Promise<MonitoredNumber[]> => {
      if (!items.length) {
          return items;
      }

      const uuids = items.map((item) => item.uuid).filter(Boolean);
      if (uuids.length === 0) {
          return items;
      }

      const { data: checks, error: checksError } = await supabase
          .from('vat_checker_numbers_checks')
          .select('vat_number_uuid,valid,vat_check_date,name')
          .in('vat_number_uuid', uuids)
          .order('vat_check_date', { ascending: false });

      if (checksError) {
          console.warn('Unable to fetch latest check results:', checksError.message);
          return items;
      }

      const latestByVatUuid = new Map<string, LatestCheckRow>();
      const latestNameByVatUuid = new Map<string, string>();
      for (const row of (checks || []) as LatestCheckRow[]) {
          const vatNumberUuid = typeof row.vat_number_uuid === 'string' ? row.vat_number_uuid : null;
          if (!vatNumberUuid) {
              continue;
          }
          if (!latestByVatUuid.has(vatNumberUuid)) {
              latestByVatUuid.set(vatNumberUuid, row);
          }

          const checkName = typeof row.name === 'string' ? row.name.trim() : '';
          if (checkName.length > 0 && !latestNameByVatUuid.has(vatNumberUuid)) {
              latestNameByVatUuid.set(vatNumberUuid, checkName);
          }

          if (latestByVatUuid.has(vatNumberUuid) && latestNameByVatUuid.has(vatNumberUuid)) {
              continue;
          }
      }

      return items.map((item) => {
          const latest = latestByVatUuid.get(item.uuid);
          return {
              ...item,
              last_check_valid: typeof latest?.valid === 'boolean' ? latest.valid : null,
              last_check_checked_at: latest?.vat_check_date ?? null,
              last_check_name: latestNameByVatUuid.get(item.uuid) ?? null,
          };
      });
  };

  const toUniqueUuids = (values: Array<string | null | undefined>): string[] => {
      return Array.from(
        new Set(
          values
            .map((value) => (typeof value === 'string' ? value.trim() : ''))
            .filter((value) => value.length > 0)
        )
      );
  };

  const intersectUuids = (left: string[], right: string[]): string[] => {
      const rightSet = new Set(right);
      return left.filter((value) => rightSet.has(value));
  };

  const applyDirectColumnFilters = (query: any, inputFilters: Record<string, string>) => {
      let nextQuery = query;
      const periodicityValues = ['daily', 'weekly', 'monthly', 'inactive'] as const;

      Object.entries(inputFilters).forEach(([key, value]) => {
          const valStr = String(value || '').trim();
          if (!valStr || key === 'entity_name') {
              return;
          }

          if (key === 'number_of_checks') {
              const numericValue = Number(valStr);
              if (!Number.isNaN(numericValue)) {
                nextQuery = nextQuery.eq(key, numericValue);
              }
              return;
          }

          if (key === 'last_check_date') {
              if (isIsoDate(valStr)) {
                nextQuery = nextQuery.eq(key, valStr);
              }
              return;
          }

          if (key === 'created_at') {
              if (isIsoDate(valStr)) {
                const nextDate = getNextIsoDate(valStr);
                nextQuery = nextQuery
                  .gte('created_at', `${valStr}T00:00:00.000Z`)
                  .lt('created_at', `${nextDate}T00:00:00.000Z`);
              }
              return;
          }

          if (key === 'country_code') {
              const normalizedCountry = valStr.toUpperCase();
              if (isIsoCountryCodeLike(normalizedCountry)) {
                nextQuery = nextQuery.eq('country_code', normalizedCountry);
              }
              return;
          }

          if (key === 'periodicity') {
              const normalizedPeriodicity = valStr.toLowerCase();
              if (periodicityValues.includes(normalizedPeriodicity as typeof periodicityValues[number])) {
                nextQuery = nextQuery.eq('periodicity', normalizedPeriodicity);
              }
              return;
          }

          nextQuery = nextQuery.ilike(key, `%${valStr}%`);
      });

      return nextQuery;
  };

  const fetchMatchingVatUuidsFromVatNumbers = async (
      term: string,
      mode: 'search' | 'entity'
  ): Promise<string[]> => {
      if (!term) {
          return [];
      }

      const compactVatTerm = term.replace(/\s+/g, '');
      const normalizedCountryTerm = term.toUpperCase();
      const countryCodeSearchFilter =
        mode === 'search' && isIsoCountryCodeLike(normalizedCountryTerm)
          ? [`country_code.eq.${normalizedCountryTerm}`]
          : [];
      const filtersForSearch =
        mode === 'search'
          ? [
              `vat_number.ilike.%${term}%`,
              `vat_number.ilike.%${compactVatTerm}%`,
              ...countryCodeSearchFilter,
              `reference->>name.ilike.%${term}%`,
              `reference->>nom_complet.ilike.%${term}%`,
              `reference->>counterpart_name.ilike.%${term}%`,
              `reference->>address.ilike.%${term}%`,
              `reference->>counterpart_address.ilike.%${term}%`,
              `reference->>counterpart_address_line.ilike.%${term}%`,
              `reference->>counterpart_address_city.ilike.%${term}%`,
              `reference->>counterpart_address_postal_code.ilike.%${term}%`,
              `reference->>counterpart_address_country.ilike.%${term}%`,
            ]
          : [
              `reference->>name.ilike.%${term}%`,
              `reference->>nom_complet.ilike.%${term}%`,
              `reference->>counterpart_name.ilike.%${term}%`,
            ];

      const { data, error } = await supabase
        .from('vat_checker_numbers')
        .select('uuid')
        .or(filtersForSearch.join(','))
        .limit(2000);

      if (error) {
          console.warn(`Unable to resolve VAT UUIDs from vat_checker_numbers (${mode}):`, error.message);
          return [];
      }

      return toUniqueUuids(((data || []) as VatNumberUuidRow[]).map((row) => row.uuid));
  };

  const fetchMatchingVatUuidsFromChecks = async (term: string): Promise<string[]> => {
      if (!term) {
          return [];
      }

      const compactVatTerm = term.replace(/\s+/g, '');
      const normalizedCountryTerm = term.toUpperCase();
      const countryCodeSearchFilter = isIsoCountryCodeLike(normalizedCountryTerm)
        ? [`country_code_check.eq.${normalizedCountryTerm}`]
        : [];
      const checkSearchFilters = [
        `name.ilike.%${term}%`,
        `address.ilike.%${term}%`,
        `vat_number_check.ilike.%${term}%`,
        `vat_number_check.ilike.%${compactVatTerm}%`,
        ...countryCodeSearchFilter,
      ];

      const { data, error } = await supabase
        .from('vat_checker_numbers_checks')
        .select('vat_number_uuid')
        .or(checkSearchFilters.join(','))
        .not('vat_number_uuid', 'is', null)
        .limit(2000);

      if (error) {
          console.warn('Unable to resolve VAT UUIDs from vat_checker_numbers_checks:', error.message);
          return [];
      }

      return toUniqueUuids(((data || []) as VatCheckUuidRow[]).map((row) => row.vat_number_uuid));
  };

  const resolveVatUuidsForSearchTerm = async (term: string): Promise<string[]> => {
      const [fromVatNumbers, fromChecks] = await Promise.all([
        fetchMatchingVatUuidsFromVatNumbers(term, 'search'),
        fetchMatchingVatUuidsFromChecks(term),
      ]);

      return toUniqueUuids([...fromVatNumbers, ...fromChecks]);
  };

  const resolveVatUuidsForEntityFilter = async (term: string): Promise<string[]> => {
      const [fromVatNumbers, fromChecks] = await Promise.all([
        fetchMatchingVatUuidsFromVatNumbers(term, 'entity'),
        fetchMatchingVatUuidsFromChecks(term),
      ]);

      return toUniqueUuids([...fromVatNumbers, ...fromChecks]);
  };

  const fetchChecksHistoryForVat = async (
      vatNumberUuid: string,
      pageNumber: number,
      dateFrom: string,
      dateTo: string
  ): Promise<{ items: VatCheckHistoryItem[]; total: number }> => {
      const offset = (pageNumber - 1) * CHECKS_PAGE_SIZE;
      let query = supabase
        .from('vat_checker_numbers_checks')
        .select(
          'id,created_at,country_code_check,vat_number_check,country_code_requester_check,vat_number_requester_check,validation_code,name,address,valid,vat_number_uuid,verification_code,vat_check_date',
          { count: 'exact' }
        )
        .eq('vat_number_uuid', vatNumberUuid)
        .order('vat_check_date', { ascending: false })
        .range(offset, offset + CHECKS_PAGE_SIZE - 1);

      if (dateFrom) {
          query = query.gte('vat_check_date', `${dateFrom}T00:00:00.000Z`);
      }
      if (dateTo) {
          query = query.lte('vat_check_date', `${dateTo}T23:59:59.999Z`);
      }

      const { data, error, count } = await query;
      if (error) {
          throw error;
      }

      return {
          items: (data || []) as VatCheckHistoryItem[],
          total: count ?? 0,
      };
  };

  const fetchRawData = async (pageNum: number) => {
      const from = (pageNum - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
          .from('vat_checker_numbers')
          .select('*', { count: 'exact' });

      query = applyDirectColumnFilters(query, filters);

      if (requesterFilter !== '__all__') {
          const normalizedRequester = normalizeVatInput(requesterFilter);
          const requesterMatch = normalizedRequester.match(/^([A-Z]{2})([A-Z0-9]{2,14})$/);
          if (!requesterMatch) {
              return { data: [] as MonitoredNumber[], count: 0 };
          }

          query = query
            .eq('country_code_requester', requesterMatch[1])
            .eq('vat_number_requester', requesterMatch[2]);
      }

      if (statusFilter === 'deleted') {
          query = query.eq('reference->>status', 'deleted');
      } else if (statusFilter === 'inactive') {
          query = query
            .eq('periodicity', 'inactive')
            .not('reference->>status', 'eq', 'deleted');
      } else if (statusFilter === 'pending') {
          query = query
            .neq('periodicity', 'inactive')
            .not('reference->>status', 'eq', 'deleted')
            .or('number_of_checks.is.null,number_of_checks.eq.0');
      } else if (statusFilter === 'active') {
          query = query
            .neq('periodicity', 'inactive')
            .not('reference->>status', 'eq', 'deleted')
            .gt('number_of_checks', 0);
      }

      let constrainedUuids: string[] | null = null;

      const searchTerm = sanitizeSearchTerm(search);
      if (searchTerm.length > 0) {
          constrainedUuids = await resolveVatUuidsForSearchTerm(searchTerm);
      }

      const entityFilterValue = String(filters.entity_name || '').trim();
      if (entityFilterValue.length > 0) {
          const entityTerm = sanitizeSearchTerm(entityFilterValue);
          const entityUuids = await resolveVatUuidsForEntityFilter(entityTerm);
          constrainedUuids =
            constrainedUuids === null
              ? entityUuids
              : intersectUuids(constrainedUuids, entityUuids);
      }

      if (constrainedUuids !== null) {
          if (constrainedUuids.length === 0) {
              return { data: [] as MonitoredNumber[], count: 0 };
          }
          query = query.in('uuid', constrainedUuids);
      }

      const { data, count, error } = await query
          .order('created_at', { ascending: false })
          .range(from, to);

      if (error) throw error;
      const pageData = (data || []) as MonitoredNumber[];
      const pageDataWithResult = await enrichWithLastCheckResult(pageData);
      return { data: pageDataWithResult, count: count || 0 };
  };

  useEffect(() => {
      if (!selectedNumber?.uuid) {
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
      const loadChecksHistory = async () => {
          setChecksLoading(true);
          setChecksError(null);

          try {
              const { items, total } = await fetchChecksHistoryForVat(
                  selectedNumber.uuid,
                  checksPage,
                  checksDateFrom,
                  checksDateTo
              );
              if (!isMounted) return;

              setChecksHistory(items);
              setChecksTotal(total);
              setChecksTotalPages(Math.max(1, Math.ceil(total / CHECKS_PAGE_SIZE)));
          } catch (err: any) {
              if (!isMounted) return;
              setChecksHistory([]);
              setChecksTotal(0);
              setChecksTotalPages(1);
              setChecksError(err?.message || 'Failed to load check history.');
          } finally {
              if (isMounted) {
                  setChecksLoading(false);
              }
          }
      };

      void loadChecksHistory();
      return () => {
          isMounted = false;
      };
  }, [selectedNumber?.uuid, checksPage, checksDateFrom, checksDateTo]);

  const loadPageData = async (targetPage: number, forceRefresh = false) => {
      // Check Cache
      if (!forceRefresh && dataCacheRef.current[targetPage]) {
          setData(dataCacheRef.current[targetPage]);
          setLoading(false);
          prefetchNeighbors(targetPage);
          return;
      }

      setLoading(true);
      setError(null);

      try {
          const { data: pageData, count } = await fetchRawData(targetPage);
          
          setData(pageData);
          setTotalCount(count);
          const computedTotalPages = Math.ceil(count / pageSize) || 1;
          setTotalPages(computedTotalPages);
          
          updateCache(targetPage, pageData);
          prefetchNeighbors(targetPage, computedTotalPages);

      } catch (err: any) {
          console.error("Fetch error:", err);
          setError(err.message);
      } finally {
          setLoading(false);
      }
  };

  const prefetchNeighbors = async (currentPage: number, total?: number) => {
      const maxPage = total || totalPages;
      // Prefetch 2 pages before and 2 pages after
      const neighbors = [];
      for (let i = 1; i <= 2; i++) {
          if (currentPage - i > 0) neighbors.push(currentPage - i);
          if (currentPage + i <= maxPage) neighbors.push(currentPage + i);
      }

      for (const p of neighbors) {
          if (!dataCacheRef.current[p]) {
              try {
                  const { data: neighborData } = await fetchRawData(p);
                  updateCache(p, neighborData);
              } catch (e) {
                  // Ignore prefetch errors
              }
          }
      }
  };

  // --- Handlers ---

  const handlePageInputSubmit = () => {
      let newPage = parseInt(pageInput);
      if (isNaN(newPage) || newPage < 1) newPage = 1;
      if (newPage > totalPages) newPage = totalPages;
      setPage(newPage);
  };

  const handleFilterChange = (key: string, value: string) => {
      setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handlePrevPage = () => setPage(p => Math.max(1, p - 1));
  const handleNextPage = () => setPage(p => Math.min(totalPages, p + 1));

  const removeMonitoredNumberLocally = (uuid: string) => {
      const removeFromItems = (items: MonitoredNumber[]) =>
        items.filter((item) => item.uuid !== uuid);

      setData((prev) => removeFromItems(prev));
      setSelectedNumber((prev) => (prev?.uuid === uuid ? null : prev));

      const nextCache: Record<number, MonitoredNumber[]> = {};
      for (const [pageKey, items] of Object.entries(dataCacheRef.current) as Array<[string, MonitoredNumber[]]>) {
          nextCache[Number(pageKey)] = removeFromItems(items);
      }
      dataCacheRef.current = nextCache;
      setDataCache(nextCache);
      setChecksHistory([]);
      setChecksTotal(0);
      setChecksTotalPages(1);
      setChecksPage(1);

      const nextTotalCount = Math.max(0, totalCount - 1);
      const nextTotalPages = Math.max(1, Math.ceil(nextTotalCount / pageSize));
      setTotalCount(nextTotalCount);
      setTotalPages(nextTotalPages);
      if (page > nextTotalPages) {
          setPage(nextTotalPages);
      }
  };

  const applyPeriodicityLocally = (uuid: string, periodicity: Periodicity) => {
      const updateItems = (items: MonitoredNumber[]) =>
        items.map((item) => (item.uuid === uuid ? { ...item, periodicity } : item));

      setData((prev) => updateItems(prev));
      setSelectedNumber((prev) =>
        prev && prev.uuid === uuid ? { ...prev, periodicity } : prev
      );

      const nextCache: Record<number, MonitoredNumber[]> = {};
      for (const [pageKey, items] of Object.entries(dataCacheRef.current) as Array<[string, MonitoredNumber[]]>) {
        nextCache[Number(pageKey)] = updateItems(items);
      }
      dataCacheRef.current = nextCache;
      setDataCache(nextCache);
  };

  const savePeriodicity = async () => {
      if (!selectedNumber) return;

      const currentPeriodicity = normalizePeriodicity(selectedNumber.periodicity);
      const nextPeriodicity = periodicityDraft;

      if (currentPeriodicity === nextPeriodicity) {
          return;
      }

      setUpdatingPeriodicity(true);
      setError(null);

      applyPeriodicityLocally(selectedNumber.uuid, nextPeriodicity);

      try {
          const headers = await getAuthHeaders(true);
          const response = await fetch(
            `${CHECKER_DEV_BASE_URL}/vat/numbers/${selectedNumber.uuid}`,
            {
              method: 'PATCH',
              headers,
              body: JSON.stringify({
                periodicity: nextPeriodicity,
              }),
            }
          );
          const payload = (await response.json().catch(() => null)) as VatNumberPatchResponse | null;
          if (!response.ok) {
              throw new Error(extractApiErrorMessage(payload, 'Failed to update periodicity.'));
          }

          const confirmedPeriodicity = normalizePeriodicity(
            payload?.vat_number?.periodicity ?? nextPeriodicity
          );
          if (confirmedPeriodicity !== nextPeriodicity) {
              applyPeriodicityLocally(selectedNumber.uuid, confirmedPeriodicity);
              setPeriodicityDraft(confirmedPeriodicity);
          }
          setPeriodicityToast(t.checker.monitoring.detail.periodicityUpdated);
      } catch (err: any) {
          applyPeriodicityLocally(selectedNumber.uuid, currentPeriodicity);
          setPeriodicityDraft(currentPeriodicity);
          setError(err?.message || 'Failed to update periodicity.');
      } finally {
          setUpdatingPeriodicity(false);
      }
  };

  const softDeleteVatNumber = async () => {
      if (!selectedNumber || deletingVatNumber) return;

      const confirmed = window.confirm(
        t.checker.monitoring.detail.deleteConfirm || 'Are you sure you want to remove this VAT number from monitoring?'
      );
      if (!confirmed) return;

      setDeletingVatNumber(true);
      setError(null);

      const target = selectedNumber;
      const existingReference =
        target.reference && typeof target.reference === 'object' && !Array.isArray(target.reference)
          ? (target.reference as Record<string, unknown>)
          : {};

      const nextReference = {
        ...existingReference,
        status: 'deleted',
        deleted_at: new Date().toISOString(),
      };

      try {
          const { error } = await supabase
              .from('vat_checker_numbers')
              .update({
                reference: nextReference,
                periodicity: 'inactive',
              })
              .eq('uuid', target.uuid)
              .select('uuid')
              .single();

          if (error) throw error;
          removeMonitoredNumberLocally(target.uuid);
      } catch (err: any) {
          setError(err?.message || t.checker.monitoring.detail.deleteError || 'Failed to delete VAT number.');
      } finally {
          setDeletingVatNumber(false);
      }
  };

  const fetchLatestCheckForVat = async (vatNumberUuid: string): Promise<VatCheckHistoryItem | null> => {
      const { data, error } = await supabase
        .from('vat_checker_numbers_checks')
        .select(
          'id,created_at,country_code_check,vat_number_check,country_code_requester_check,vat_number_requester_check,validation_code,name,address,valid,vat_number_uuid,verification_code,vat_check_date'
        )
        .eq('vat_number_uuid', vatNumberUuid)
        .order('vat_check_date', { ascending: false })
        .limit(1)
        .maybeSingle<VatCheckHistoryItem>();

      if (error) {
          throw error;
      }

      return data ?? null;
  };

  const openVatContextMenu = (event: React.MouseEvent, item: MonitoredNumber) => {
      event.preventDefault();
      event.stopPropagation();

      const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 0;
      const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 0;
      const menuWidth = 260;
      const menuHeight = 120;
      const padding = 12;

      const x = Math.max(
        padding,
        Math.min(event.clientX, Math.max(padding, viewportWidth - menuWidth - padding))
      );
      const y = Math.max(
        padding,
        Math.min(event.clientY, Math.max(padding, viewportHeight - menuHeight - padding))
      );

      setVatContextMenu({ x, y, item });
  };

  const runManualVatCheck = async (item: MonitoredNumber): Promise<void> => {
      const headers = await getAuthHeaders(true);
      const response = await fetch(`${CHECKER_DEV_BASE_URL}/vat/check`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
              vat_number_uuid: item.uuid,
          }),
      });

      const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
      if (!response.ok) {
          throw new Error(extractApiErrorMessage(payload, 'Failed to run a manual VAT check.'));
      }
  };

  const downloadCertificateForRow = async (item: MonitoredNumber): Promise<void> => {
      const latestCheck = await fetchLatestCheckForVat(item.uuid);
      if (!latestCheck) {
          throw new Error(t.checker.monitoring.detail.emptyHistory || 'No checks performed yet.');
      }

      const requestId = latestCheck.validation_code || latestCheck.verification_code || null;
      await downloadVatCertificatePdf({
          countryCode: latestCheck.country_code_check || item.country_code,
          number: latestCheck.vat_number_check || item.vat_number,
          dateCheck: latestCheck.vat_check_date || latestCheck.created_at || item.last_check_date,
          validity: latestCheck.valid,
          name:
            latestCheck.name ||
            item.last_check_name ||
            item.reference?.name ||
            item.reference?.counterpart_name ||
            null,
          address: latestCheck.address,
          validationCode: requestId,
          countryCodeRequest:
            latestCheck.country_code_requester_check || item.country_code_requester || null,
          numberRequest:
            latestCheck.vat_number_requester_check || item.vat_number_requester || null,
      });
  };

  const handleDownloadFromContextMenu = async () => {
      const target = vatContextMenu?.item;
      if (!target || contextAction) {
          return;
      }

      setContextAction('download');
      setError(null);
      try {
          await downloadCertificateForRow(target);
          setActionToast(`Certificate downloaded for ${target.country_code}${target.vat_number}.`);
          setVatContextMenu(null);
      } catch (err: any) {
          setError(err?.message || 'Failed to download certificate.');
      } finally {
          setContextAction(null);
      }
  };

  const handleForceCheckFromContextMenu = async () => {
      const target = vatContextMenu?.item;
      if (!target || contextAction) {
          return;
      }

      const confirmed = window.confirm(
        `Run a manual VIES check now for ${target.country_code}${target.vat_number}?`
      );
      if (!confirmed) {
          return;
      }

      setContextAction('force');
      setError(null);
      try {
          await runManualVatCheck(target);
          clearCache();
          await loadPageData(page, true);
          setActionToast(`Manual check completed for ${target.country_code}${target.vat_number}.`);
          setVatContextMenu(null);
      } catch (err: any) {
          setError(err?.message || 'Failed to run manual VAT check.');
      } finally {
          setContextAction(null);
      }
  };

  return (
    <div className="flex flex-col gap-6 w-full pb-10 font-sans">
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
                  <X size={16}/>
              </button>
          </div>
      )}

      {actionToast && (
          <div className="fixed top-24 right-6 z-[150] px-5 py-4 rounded-2xl shadow-2xl border bg-indigo-50 border-indigo-200 text-indigo-900 flex items-start gap-4 max-w-sm animate-in slide-in-from-right-10 duration-300">
              <div className="mt-0.5 p-1 rounded-full bg-indigo-600 text-white">
                  <CheckCircle size={18} />
              </div>
              <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm leading-tight">{t.common.save}</p>
                  <p className="text-xs opacity-80 mt-1 leading-relaxed">{actionToast}</p>
              </div>
              <button
                onClick={() => setActionToast(null)}
                className="shrink-0 p-1 hover:bg-black/5 rounded-lg transition-colors"
              >
                  <X size={16}/>
              </button>
          </div>
      )}
      
      {/* Backdrop for closing filter popovers */}
      {activeFilterCol && (
          <div 
            className="fixed inset-0 z-20 bg-transparent" 
            onClick={() => setActiveFilterCol(null)} 
          />
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-[#141585]">{t.checker.monitoring.title}</h1>
          <p className="text-gray-500 text-sm mt-1">{t.checker.monitoring.subtitle}</p>
        </div>
      </div>

      {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
          </div>
      )}

      {/* Global Search */}
      <div className="bg-white p-4 rounded-xl shadow-[0_2px_12px_-4px_rgba(6,81,237,0.1)] border border-gray-50 flex flex-col lg:flex-row lg:items-center gap-4 shrink-0">
         <div className="flex-1 flex items-center gap-3 bg-gray-50 px-4 py-2.5 rounded-xl border border-gray-200 focus-within:ring-2 focus-within:ring-indigo-100 focus-within:border-indigo-300 focus-within:bg-white hover:border-indigo-200 transition-all shadow-sm">
             <Search size={18} className="text-gray-400" />
             <input 
                type="text" 
                className="bg-transparent outline-none text-sm text-gray-700 w-full placeholder-gray-400"
                placeholder={t.checker.monitoring.filters.search}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
             />
         </div>
         <div className="w-full lg:w-80">
             <label className="sr-only">{t.checker.monitoring.filters.requester}</label>
             <select
               value={requesterFilter}
               onChange={(e) => setRequesterFilter(e.target.value)}
               disabled={loadingRequesterFilter}
               className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 outline-none shadow-sm disabled:opacity-60"
             >
               {loadingRequesterFilter ? (
                 <option value="__all__">{t.common.loading}</option>
               ) : (
                 requesterOptions.map((option) => (
                   <option key={option.value} value={option.value}>
                     {option.label}
                   </option>
                 ))
               )}
             </select>
           </div>
         {search && (
             <button onClick={() => setSearch('')} className="p-2 text-gray-400 hover:text-gray-600 bg-gray-100 rounded-lg">
                 <X size={18} />
             </button>
         )}
      </div>

      <div className="flex gap-6">
          {/* Main Table */}
          <div className="flex-1 bg-white rounded-2xl shadow-[0_2px_12px_-4px_rgba(6,81,237,0.1)] border border-gray-50 overflow-hidden flex flex-col relative">
              
              {/* Loading Overlay */}
              {showTableOverlayLoader && (
                  <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-10 flex flex-col items-center justify-center text-indigo-600">
                      <Loader2 className="w-8 h-8 animate-spin mb-2" />
                      <p className="text-sm font-medium">{t.common.loading}</p>
                  </div>
              )}

              <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left border-collapse">
                      <thead className="bg-gray-50/80 text-gray-500 uppercase text-xs font-semibold sticky top-0 z-40 backdrop-blur-sm">
                          <tr>
                              {COL_KEYS.map((col) => (
                                  <th key={col.key} className="px-6 py-4 whitespace-nowrap border-b border-gray-100">
                                      <div className="flex items-center gap-2">
                                          <span>{col.label}</span>
                                          {!col.isJson && (
                                              <div className="relative">
                                                  <button 
                                                      onClick={() => setActiveFilterCol(activeFilterCol === col.key ? null : col.key)}
                                                      className={`p-1 rounded-md transition-colors hover:bg-gray-200 ${filters[col.key] ? 'text-indigo-600 bg-indigo-50' : 'text-gray-300'}`}
                                                  >
                                                      <Filter size={14} fill={filters[col.key] ? "currentColor" : "none"} />
                                                  </button>
                                                  
                                                  {/* Filter Popover */}
                                                  {activeFilterCol === col.key && (
                                                      <div className="absolute top-full left-0 mt-2 w-56 bg-[#141585] border border-indigo-900 shadow-xl rounded-xl p-3 z-50 animate-in fade-in zoom-in-95 duration-200 ring-1 ring-black/5">
                                                          <div className="flex flex-col gap-2">
                                                              <label className="text-[10px] uppercase font-bold text-indigo-200 tracking-wider">Filter by {col.label}</label>
                                                              <input 
                                                                  autoFocus
                                                                  className="w-full px-3 py-2 text-xs bg-white/10 border border-indigo-400/30 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 outline-none font-medium text-white placeholder-indigo-300/50" 
                                                                  placeholder={
                                                                    col.key === 'created_at' || col.key === 'last_check_date'
                                                                      ? 'YYYY-MM-DD'
                                                                      : col.key === 'number_of_checks'
                                                                        ? 'Number'
                                                                        : 'Type...'
                                                                  }
                                                                  value={filters[col.key] || ''}
                                                                  onChange={(e) => handleFilterChange(col.key, e.target.value)}
                                                              />
                                                              {filters[col.key] && (
                                                                  <button 
                                                                      onClick={() => handleFilterChange(col.key, '')}
                                                                      className="mt-1 flex items-center justify-center gap-1.5 w-full py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium text-white transition-colors border border-white/10"
                                                                  >
                                                                      <X size={12} /> Clear
                                                                  </button>
                                                              )}
                                                          </div>
                                                      </div>
                                                  )}
                                              </div>
                                          )}
                                      </div>
                                  </th>
                              ))}
                              <th className="px-6 py-4 border-b border-gray-100 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <span>Status</span>
                                  <div className="relative">
                                    <button
                                      onClick={() => setActiveFilterCol(activeFilterCol === 'status' ? null : 'status')}
                                      className={`p-1 rounded-md transition-colors hover:bg-gray-200 ${
                                        statusFilter !== '__all__' ? 'text-indigo-600 bg-indigo-50' : 'text-gray-300'
                                      }`}
                                    >
                                      <Filter size={14} fill={statusFilter !== '__all__' ? "currentColor" : "none"} />
                                    </button>

                                    {activeFilterCol === 'status' && (
                                      <div className="absolute top-full right-0 mt-2 w-48 bg-[#141585] border border-indigo-900 shadow-xl rounded-xl p-3 z-50 animate-in fade-in zoom-in-95 duration-200 ring-1 ring-black/5">
                                        <div className="flex flex-col gap-2">
                                          <label className="text-[10px] uppercase font-bold text-indigo-200 tracking-wider">Filter by Status</label>
                                          <div className="flex flex-col gap-1">
                                            {STATUS_FILTER_OPTIONS.map((option) => (
                                              <button
                                                key={option.value}
                                                type="button"
                                                onClick={() => {
                                                  setStatusFilter(option.value);
                                                  setActiveFilterCol(null);
                                                }}
                                                className={`px-2.5 py-1.5 rounded-lg text-xs text-left font-medium transition-colors border ${
                                                  statusFilter === option.value
                                                    ? 'bg-white text-[#141585] border-white'
                                                    : 'bg-white/10 text-white border-white/10 hover:bg-white/20'
                                                }`}
                                              >
                                                {option.label}
                                              </button>
                                            ))}
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                          {data.length === 0 && !loading ? (
                             <tr><td colSpan={COL_KEYS.length + 1} className="px-6 py-12 text-center text-gray-400 italic">No numbers found matching filters.</td></tr>
                          ) : (
                             data.map(item => {
                                 const entityName =
                                   item.last_check_name ||
                                   item.reference?.name ||
                                   item.reference?.nom_complet ||
                                   item.reference?.counterpart_name ||
                                   '-';
                                 return (
                                     <tr 
                                        key={item.uuid} 
                                        onClick={() => {
                                          setVatContextMenu(null);
                                          navigate(`/checker/checks/${item.uuid}`);
                                        }}
                                        onContextMenu={(event) => openVatContextMenu(event, item)}
                                        title="Right-click for VAT actions"
                                        className="cursor-pointer transition-colors hover:bg-gray-50"
                                     >
                                         <td className="px-6 py-4">
                                             <span className="font-medium text-gray-700">{item.country_code}</span>
                                         </td>
                                         <td className="px-6 py-4 font-mono font-medium text-indigo-900 select-none">
                                           {item.vat_number}
                                         </td>
                                         <td className="px-6 py-4 text-gray-700 truncate max-w-[200px]" title={entityName}>{entityName}</td>
                                         <td className="px-6 py-4 text-gray-500 text-xs">
                                             {item.created_at ? new Date(item.created_at).toLocaleDateString() : '-'}
                                         </td>
                                         <td className="px-6 py-4 text-gray-500 text-xs">
                                             {formatDateDDMMYYYY(item.last_check_date)}
                                         </td>
                                         <td className="px-6 py-4 text-gray-600 text-xs">
                                             <div className="flex items-center gap-1.5">
                                                 <Hash size={12} className="text-gray-300" />
                                                 {item.number_of_checks}
                                             </div>
                                         </td>
                                         <td className="px-6 py-4 text-gray-600 text-xs capitalize">
                                             <div className="flex items-center gap-1.5">
                                                 <RefreshCcw size={12} className="text-gray-300" />
                                                 {item.periodicity}
                                             </div>
                                         </td>
                                         <td className="px-6 py-4 text-center">
                                             {item.last_check_valid === true ? (
                                               <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                                 <CheckCircle size={12} /> {t.checker.status.valid}
                                               </span>
                                             ) : item.last_check_valid === false ? (
                                               <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
                                                 <XCircle size={12} /> {t.checker.status.invalid}
                                               </span>
                                             ) : (
                                               <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-700 border border-gray-200">
                                                 <AlertTriangle size={12} /> {t.checker.status.pending}
                                               </span>
                                             )}
                                         </td>
                                     </tr>
                                 );
                             })
                          )}
                      </tbody>
                  </table>
              </div>

              {/* Pagination Footer */}
              <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/30 shrink-0">
                  <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                      <span>Rows</span>
                      <select
                        value={pageSize}
                        onChange={(e) => setPageSize(Number(e.target.value))}
                        className="h-7 text-xs border border-gray-200 rounded px-1.5 bg-white focus:ring-1 focus:ring-indigo-500 outline-none"
                      >
                        {PAGE_SIZE_OPTIONS.map((size) => (
                          <option key={size} value={size}>
                            {size}
                          </option>
                        ))}
                      </select>
                      <span className="text-gray-300 mx-1">|</span>
                      <span>Page</span>
                      <input 
                        type="number" 
                        min={1} 
                        max={totalPages}
                        value={pageInput} 
                        onChange={(e) => setPageInput(e.target.value)}
                        onBlur={handlePageInputSubmit}
                        onKeyDown={(e) => e.key === 'Enter' && handlePageInputSubmit()}
                        className="w-12 h-7 text-center text-xs border border-gray-200 rounded focus:ring-1 focus:ring-indigo-500 outline-none transition-all bg-white"
                      />
                      <span>of {totalPages}</span>
                      <span className="text-gray-300 mx-1">|</span> 
                      <span>{totalCount} total</span>
                  </div>
                  <div className="flex gap-2">
                      <button 
                          onClick={handlePrevPage}
                          disabled={page === 1 || loading}
                          className="p-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                      >
                          <ChevronLeft size={16} />
                      </button>
                      <button 
                          onClick={handleNextPage}
                          disabled={page >= totalPages || loading}
                          className="p-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                      >
                          {loading ? <Loader2 size={16} className="animate-spin" /> : <ChevronRight size={16} />}
                      </button>
                  </div>
              </div>
          </div>

      </div>

      {vatContextMenu && (
          <>
              <div
                className="fixed inset-0 z-[120]"
                onClick={() => setVatContextMenu(null)}
                onContextMenu={(event) => {
                  event.preventDefault();
                  setVatContextMenu(null);
                }}
              />
              <div
                className="fixed z-[130] w-[260px] rounded-xl border border-gray-200 bg-white shadow-2xl p-2"
                style={{ left: vatContextMenu.x, top: vatContextMenu.y }}
                onClick={(event) => event.stopPropagation()}
                onContextMenu={(event) => event.preventDefault()}
              >
                  <button
                    type="button"
                    onClick={() => void handleDownloadFromContextMenu()}
                    disabled={contextAction !== null}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                      {contextAction === 'download' ? (
                        <Loader2 size={16} className="animate-spin text-indigo-600" />
                      ) : (
                        <FileText size={16} className="text-indigo-600" />
                      )}
                      Download PDF certificate
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleForceCheckFromContextMenu()}
                    disabled={contextAction !== null}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                      {contextAction === 'force' ? (
                        <Loader2 size={16} className="animate-spin text-emerald-600" />
                      ) : (
                        <RefreshCcw size={16} className="text-emerald-600" />
                      )}
                      Force VIES check now
                  </button>
              </div>
          </>
      )}
    </div>
  );
};
