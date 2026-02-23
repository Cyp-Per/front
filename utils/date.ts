const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const ISO_DATE_PREFIX_PATTERN = /^(\d{4})-(\d{2})-(\d{2})(?:$|[T\s])/;
const SLASH_DATE_PREFIX_PATTERN = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:$|\s)/;

const isValidDate = (value: Date): boolean => !Number.isNaN(value.getTime());

const formatFromDate = (value: Date): string => {
  const day = String(value.getDate()).padStart(2, '0');
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const year = String(value.getFullYear());
  return `${day}/${month}/${year}`;
};

const formatSlashDate = (leftRaw: string, rightRaw: string, yearRaw: string): string => {
  const left = Number(leftRaw);
  const right = Number(rightRaw);

  if (Number.isNaN(left) || Number.isNaN(right)) {
    return `${leftRaw}/${rightRaw}/${yearRaw}`;
  }

  const leftPadded = String(left).padStart(2, '0');
  const rightPadded = String(right).padStart(2, '0');

  if (left > 12 && right <= 12) {
    return `${leftPadded}/${rightPadded}/${yearRaw}`;
  }

  if (right > 12 && left <= 12) {
    return `${rightPadded}/${leftPadded}/${yearRaw}`;
  }

  // Ambiguous values (e.g. 02/03/2026): keep slash order and normalize padding.
  return `${leftPadded}/${rightPadded}/${yearRaw}`;
};

export const formatDateDDMMYYYY = (
  value: string | null | undefined,
  fallback = '-'
): string => {
  if (!value) {
    return fallback;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return fallback;
  }

  if (ISO_DATE_PATTERN.test(trimmed)) {
    const [year, month, day] = trimmed.split('-');
    return `${day}/${month}/${year}`;
  }

  const isoPrefixMatch = trimmed.match(ISO_DATE_PREFIX_PATTERN);
  if (isoPrefixMatch) {
    const [, year, month, day] = isoPrefixMatch;
    return `${day}/${month}/${year}`;
  }

  const slashPrefixMatch = trimmed.match(SLASH_DATE_PREFIX_PATTERN);
  if (slashPrefixMatch) {
    const [, left, right, year] = slashPrefixMatch;
    return formatSlashDate(left, right, year);
  }

  const normalizedDate = (
    trimmed.includes(' ') && !trimmed.includes('T')
      ? trimmed.replace(' ', 'T')
      : trimmed
  )
    .replace(/([+-]\d{2})$/, '$1:00')
    .replace(/([+-]\d{2})(\d{2})$/, '$1:$2');

  const parsed = new Date(normalizedDate);
  if (!isValidDate(parsed)) {
    return trimmed;
  }

  return formatFromDate(parsed);
};
