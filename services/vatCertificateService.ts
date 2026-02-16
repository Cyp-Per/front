export interface VatCertificatePayload {
  countryCode: string;
  number: string;
  dateCheck?: string | null;
  validity?: boolean | null;
  name?: string | null;
  address?: string | null;
  validationCode?: string | null;
  countryCodeRequest?: string | null;
  numberRequest?: string | null;
  companyType?: string | null;
}

const VAT_CERTIFICATE_MAKE_ENDPOINT = 'https://pdf.cyplom.com/generate-pdf-make';

const safeFileDate = (value?: string | null): string => {
  if (typeof value === 'string' && value.trim()) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 10);
    }
  }
  return new Date().toISOString().slice(0, 10);
};

const safeFileVat = (countryCode: string, number: string): string => {
  return `${countryCode}${number}`.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 40) || 'VAT';
};

export async function downloadVatCertificatePdf(payload: VatCertificatePayload): Promise<void> {
  const a = document.createElement('a');
  const params = new URLSearchParams();
  params.set('countryCode', payload.countryCode ?? '');
  params.set('number', payload.number ?? '');
  params.set('dateCheck', payload.dateCheck ?? '');
  if (payload.validity === true) {
    params.set('validity', 'valid');
  } else if (payload.validity === false) {
    params.set('validity', 'invalid');
  } else {
    params.set('validity', '');
  }
  params.set('name', payload.name ?? '');
  params.set('address', payload.address ?? '');
  params.set('validationCode', payload.validationCode ?? '');
  params.set('countryCodeRequest', payload.countryCodeRequest ?? '');
  params.set('numberRequest', payload.numberRequest ?? '');
  params.set('companyType', payload.companyType ?? '');

  const vatPart = safeFileVat(payload.countryCode, payload.number);
  const datePart = safeFileDate(payload.dateCheck);
  a.href = `${VAT_CERTIFICATE_MAKE_ENDPOINT}?${params.toString()}`;
  a.download = `Cyplom-${vatPart}-${datePart}.pdf`;
  a.target = '_blank';
  a.rel = 'noopener';
  a.click();
}
