import React, { useEffect, useMemo, useState } from 'react';
import Chart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';
import { AlertTriangle, Activity, Search, XCircle, CheckCircle, Loader2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../services/supabaseClient';

interface VatChecksUserSummaryRow {
  user_uuid: string;
  number_of_vat_numbers_checked: number | string | null;
  last_vat_number: string | null;
  last_month_checks: number | string | null;
  last_14_days_checks: unknown;
}

interface Last14DaysCheckItem {
  date?: string;
  checks?: number | string;
}

interface RecentValidationRawRow {
  id?: number | string;
  name?: string | null;
  valid?: boolean | null;
  vat_check_date?: string | null;
  country_code_check?: string | null;
  vat_number_check?: string | null;
}

interface RecentValidation {
  id: number | string;
  date: string | null;
  name: string | null;
  status: boolean | null;
  country_code: string | null;
  vat_number_check: string | null;
}

const toNumber = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return 0;
};

const parseJsonArray = <T,>(value: unknown): T[] => {
  if (Array.isArray(value)) {
    return value as T[];
  }

  if (typeof value !== 'string') {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
};

const normalizeVatToken = (value: string): string => value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

const formatDateMMDDYYYY = (value: string | null | undefined): string => {
  if (!value) return '-';

  const parsed = new Date(value.replace(' ', 'T'));
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  const year = String(parsed.getFullYear());
  return `${month}/${day}/${year}`;
};

const formatShortDay = (isoDate: string): string => {
  const parsed = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return isoDate;
  }

  return parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

export const CheckerDashboard: React.FC = () => {
  const { t } = useLanguage();
  const [summary, setSummary] = useState<VatChecksUserSummaryRow | null>(null);
  const [recentValidations, setRecentValidations] = useState<RecentValidation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadSummary = async () => {
      setLoading(true);
      setError(null);

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const userId = session?.user?.id;
        if (!userId) {
          throw new Error('Missing active session. Please sign in again.');
        }

        const [summaryResult, recentChecksResult] = await Promise.all([
          supabase
            .from('vw_vat_checks_user_summary')
            .select(
              'user_uuid,number_of_vat_numbers_checked,last_vat_number,last_month_checks,last_14_days_checks'
            )
            .eq('user_uuid', userId)
            .maybeSingle<VatChecksUserSummaryRow>(),
          supabase
            .from('vat_checker_numbers_checks')
            .select('id,name,valid,vat_check_date,country_code_check,vat_number_check')
            .eq('user_uuid', userId)
            .order('vat_check_date', { ascending: false })
            .limit(10),
        ]);

        if (summaryResult.error) {
          throw summaryResult.error;
        }

        if (recentChecksResult.error) {
          throw recentChecksResult.error;
        }

        if (!isMounted) {
          return;
        }

        const mappedRecentValidations: RecentValidation[] = (
          (recentChecksResult.data ?? []) as RecentValidationRawRow[]
        ).map((row, index) => ({
          id: row.id ?? index,
          date: row.vat_check_date ?? null,
          name: row.name ?? null,
          status: typeof row.valid === 'boolean' ? row.valid : null,
          country_code: row.country_code_check ?? null,
          vat_number_check: row.vat_number_check ?? null,
        }));

        setSummary(summaryResult.data ?? null);
        setRecentValidations(mappedRecentValidations);
      } catch (err: unknown) {
        if (!isMounted) {
          return;
        }

        const message = err instanceof Error ? err.message : t.widget.error;
        setError(message);
        setSummary(null);
        setRecentValidations([]);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadSummary();

    return () => {
      isMounted = false;
    };
  }, [t.widget.error]);

  const totalChecks = useMemo(
    () => toNumber(summary?.number_of_vat_numbers_checked).toLocaleString(),
    [summary?.number_of_vat_numbers_checked]
  );

  const monthlyChecks = useMemo(
    () => toNumber(summary?.last_month_checks).toLocaleString(),
    [summary?.last_month_checks]
  );

  const lastVatNumber = useMemo(() => {
    const raw = typeof summary?.last_vat_number === 'string' ? summary.last_vat_number.trim() : '';
    return raw.length > 0 ? raw : '-';
  }, [summary?.last_vat_number]);

  const lastVatStatus = useMemo<boolean | null>(() => {
    if (lastVatNumber === '-') {
      return null;
    }

    const normalizedLastVat = normalizeVatToken(lastVatNumber);
    if (!normalizedLastVat) {
      return null;
    }

    const matchedRow = recentValidations.find((row) => {
      const country = typeof row.country_code === 'string' ? row.country_code.trim().toUpperCase() : '';
      const number = typeof row.vat_number_check === 'string' ? row.vat_number_check.trim() : '';
      const normalizedWithCountry = normalizeVatToken(`${country}${number}`);
      const normalizedWithoutCountry = normalizeVatToken(number);

      return (
        normalizedWithCountry === normalizedLastVat ||
        normalizedWithoutCountry === normalizedLastVat
      );
    });

    return typeof matchedRow?.status === 'boolean' ? matchedRow.status : null;
  }, [lastVatNumber, recentValidations]);

  const lastVatCard = useMemo(() => {
    if (lastVatStatus === true) {
      return {
        labelClass: 'text-emerald-500',
        valueClass: 'text-emerald-700',
        iconWrapperClass: 'bg-emerald-50 text-emerald-600',
        overlayClass: 'bg-emerald-50/30',
        Icon: CheckCircle,
      };
    }

    if (lastVatStatus === false) {
      return {
        labelClass: 'text-red-400',
        valueClass: 'text-red-600',
        iconWrapperClass: 'bg-red-50 text-red-500',
        overlayClass: 'bg-red-50/30',
        Icon: XCircle,
      };
    }

    return {
      labelClass: 'text-amber-500',
      valueClass: 'text-amber-700',
      iconWrapperClass: 'bg-amber-50 text-amber-600',
      overlayClass: 'bg-amber-50/30',
      Icon: AlertTriangle,
    };
  }, [lastVatStatus]);

  const trendData = useMemo(() => {
    const rows = parseJsonArray<Last14DaysCheckItem>(summary?.last_14_days_checks)
      .map((row) => ({
        date: typeof row.date === 'string' ? row.date : '',
        checks: toNumber(row.checks),
      }))
      .filter((row) => row.date.length > 0)
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      categories: rows.map((row) => formatShortDay(row.date)),
      checks: rows.map((row) => row.checks),
    };
  }, [summary?.last_14_days_checks]);

  const chartOptions: ApexOptions = {
    chart: { type: 'area', toolbar: { show: false }, fontFamily: 'Inter, sans-serif' },
    theme: { mode: 'light' },
    colors: ['#141585'],
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.7,
        opacityTo: 0.1,
        stops: [0, 90, 100],
      },
    },
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 2 },
    xaxis: {
      categories: trendData.categories,
      labels: { style: { colors: '#6B7280', fontSize: '12px' } },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: { style: { colors: '#6B7280', fontSize: '12px' } },
      min: 0,
      forceNiceScale: true,
    },
    grid: { borderColor: '#F3F4F6' },
    tooltip: { theme: 'light' },
  };

  const chartSeries = [
    {
      name: 'Checks',
      data: trendData.checks,
    },
  ];

  const getStatusBadge = (valid: boolean | null | undefined) => {
    if (valid === true) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
          <CheckCircle size={12} /> {t.checker.status.valid}
        </span>
      );
    }

    if (valid === false) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
          <XCircle size={12} /> {t.checker.status.invalid}
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
        <AlertTriangle size={12} /> {t.checker.status.pending}
      </span>
    );
  };

  return (
    <div className="flex flex-col gap-6 w-full pb-10">
      <div>
        <h1 className="text-2xl font-bold text-[#141585]">{t.checker.title}</h1>
        <p className="text-gray-500 text-sm mt-1">{t.checker.subtitle}</p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-[0_2px_12px_-4px_rgba(6,81,237,0.1)] border border-gray-50 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-400 mb-1">{t.checker.totalChecks}</p>
            <h4 className="text-2xl font-bold text-[#141585]">{totalChecks}</h4>
          </div>
          <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-[#141585]">
            <Search size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-[0_2px_12px_-4px_rgba(6,81,237,0.1)] border border-gray-50 flex items-center justify-between relative overflow-hidden group">
          <div className="relative z-10">
            <p className={`text-sm font-medium mb-1 ${lastVatCard.labelClass}`}>
              {t.checker.lastVatNumber || t.checker.lastInvalid}
            </p>
            <h4 className={`text-xl font-bold font-mono tracking-tight ${lastVatCard.valueClass}`}>{lastVatNumber}</h4>
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center relative z-10 ${lastVatCard.iconWrapperClass}`}>
            <lastVatCard.Icon size={24} />
          </div>
          <div className={`absolute inset-0 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300 ${lastVatCard.overlayClass}`}></div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-[0_2px_12px_-4px_rgba(6,81,237,0.1)] border border-gray-50 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-400 mb-1">{t.checker.monthlyChecks}</p>
            <h4 className="text-2xl font-bold text-[#141585]">{monthlyChecks}</h4>
          </div>
          <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
            <Activity size={24} />
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-[0_2px_12px_-4px_rgba(6,81,237,0.1)] border border-gray-50 relative">
        <h3 className="text-lg font-bold text-[#141585] mb-6">{t.checker.dailyActivity}</h3>

        {loading && (
          <div className="absolute inset-0 bg-white/65 backdrop-blur-[1px] flex items-center justify-center rounded-2xl z-10">
            <Loader2 className="w-6 h-6 animate-spin text-[#141585]" />
          </div>
        )}

        <div className="w-full h-[300px]">
          <Chart options={chartOptions} series={chartSeries} type="area" height="100%" width="100%" />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-[0_2px_12px_-4px_rgba(6,81,237,0.1)] border border-gray-50 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-[#141585]">{t.checker.recentValidations}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-center">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50/50">
              <tr>
                <th className="px-6 py-4 font-semibold text-center">{t.checker.table.number}</th>
                <th className="px-6 py-4 font-semibold text-center">{t.checker.table.entity}</th>
                <th className="px-6 py-4 font-semibold text-center">{t.checker.table.date}</th>
                <th className="px-6 py-4 font-semibold text-center">{t.checker.table.status}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentValidations.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-gray-500">
                    {loading ? t.common.loading : t.checker.monitoring.detail.emptyHistory}
                  </td>
                </tr>
              ) : (
                recentValidations.map((row, idx) => {
                  const vatNumber =
                    typeof row.vat_number_check === 'string' && row.vat_number_check.trim().length > 0
                      ? row.vat_number_check.trim()
                      : '-';
                  const entityName =
                    typeof row.name === 'string' && row.name.trim().length > 0 ? row.name.trim() : '-';
                  const countryCode =
                    typeof row.country_code === 'string' && row.country_code.trim().length > 0
                      ? row.country_code.trim().toUpperCase()
                      : '';
                  const vatWithCountry =
                    vatNumber !== '-' && countryCode.length > 0
                      ? `${countryCode}${vatNumber}`
                      : vatNumber;

                  return (
                    <tr key={String(row.id ?? idx)} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 text-center font-mono font-medium text-gray-700">{vatWithCountry}</td>
                      <td className="px-6 py-4 text-center text-gray-900 font-medium">
                        {entityName}
                      </td>
                      <td className="px-6 py-4 text-center text-gray-500">{formatDateMMDDYYYY(row.date)}</td>

                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-center">{getStatusBadge(row.status)}</div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
