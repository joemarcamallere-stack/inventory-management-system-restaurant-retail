import type { ApiBusinessSetting, ApiPOSSetting, BusinessModule } from '../../../../app/api/domainTypes';

export const BUSINESS_PROFILE_KEY = 'business.profile';
export const POS_PRICING_KEY = 'pos.pricing';
export const POS_RECEIPT_KEY = 'pos.receipt';
export const POS_PAYMENTS_KEY = 'pos.payments';
export const POS_FEATURES_KEY = 'pos.features';
export const POS_DISCOUNTS_KEY = 'pos.discounts';

export type BusinessProfileSetting = {
  displayName: string;
  businessDescription: string;
  logo: string;
  address: string;
  email: string;
  phone: string;
  tin: string;
  receiptHeader: string;
  receiptFooter: string;
  operatingHours: string;
  currency: string;
  themeColor: string;
};

export type POSPricingSetting = {
  taxEnabled: boolean;
  taxRate: number;
  serviceChargeEnabled: boolean;
  serviceChargeRate: number;
};

export type POSReceiptSetting = {
  showTin: boolean;
  showCashier: boolean;
  printAfterPayment: boolean;
};

export type POSPaymentSetting = {
  methods: string[];
};

export type POSFeatureSetting = {
  customerRecommendations: boolean;
  tableManagement: boolean;
  refundProcessing: boolean;
  voidTransactions: boolean;
  discounts: boolean;
};

export type POSDiscountSetting = {
  discounts: Array<{ id: string; name: string; percentage: number }>;
};

export const defaultBusinessProfile: BusinessProfileSetting = {
  displayName: 'Bukolabs.io',
  businessDescription: '',
  logo: '',
  address: '',
  email: '',
  phone: '',
  tin: '',
  receiptHeader: 'Official Receipt',
  receiptFooter: 'Thank you for your purchase.',
  operatingHours: '9:00 AM - 10:00 PM',
  currency: 'PHP',
  themeColor: '#008967',
};

export const defaultPOSPricing: POSPricingSetting = {
  taxEnabled: false,
  taxRate: 0,
  serviceChargeEnabled: false,
  serviceChargeRate: 0,
};

export const defaultPOSReceipt: POSReceiptSetting = {
  showTin: true,
  showCashier: true,
  printAfterPayment: false,
};

export const defaultPOSPayments: POSPaymentSetting = {
  methods: ['Cash', 'GCash', 'Maya', 'Bank Transfer'],
};

export const defaultPOSFeatures: POSFeatureSetting = {
  customerRecommendations: true,
  tableManagement: true,
  refundProcessing: true,
  voidTransactions: true,
  discounts: true,
};

export const defaultPOSDiscounts: POSDiscountSetting = {
  discounts: [
    { id: 'senior', name: 'Senior Citizen', percentage: 20 },
    { id: 'pwd', name: 'PWD', percentage: 20 },
  ],
};

export function getBusinessProfile(settings: ApiBusinessSetting[] = []) {
  return {
    ...defaultBusinessProfile,
    ...readSetting<Partial<BusinessProfileSetting>>(settings, BUSINESS_PROFILE_KEY),
  };
}

export function getPOSPricing(settings: ApiPOSSetting[] = []) {
  const value = readSetting<Partial<POSPricingSetting>>(settings, POS_PRICING_KEY);
  return {
    ...defaultPOSPricing,
    ...value,
    taxRate: Number(value?.taxRate ?? defaultPOSPricing.taxRate),
    serviceChargeRate: Number(value?.serviceChargeRate ?? defaultPOSPricing.serviceChargeRate),
  };
}

export function getPOSReceipt(settings: ApiPOSSetting[] = []) {
  return {
    ...defaultPOSReceipt,
    ...readSetting<Partial<POSReceiptSetting>>(settings, POS_RECEIPT_KEY),
  };
}

export function getPOSPayments(settings: ApiPOSSetting[] = []) {
  const value = readSetting<Partial<POSPaymentSetting>>(settings, POS_PAYMENTS_KEY);
  return {
    ...defaultPOSPayments,
    ...value,
    methods: Array.isArray(value?.methods) && value.methods.length > 0
      ? value.methods
      : defaultPOSPayments.methods,
  };
}

export function getPOSFeatures(settings: ApiPOSSetting[] = []) {
  return {
    ...defaultPOSFeatures,
    ...readSetting<Partial<POSFeatureSetting>>(settings, POS_FEATURES_KEY),
  };
}

export function getPOSDiscounts(settings: ApiPOSSetting[] = []) {
  const value = readSetting<Partial<POSDiscountSetting>>(settings, POS_DISCOUNTS_KEY);
  return {
    ...defaultPOSDiscounts,
    ...value,
    discounts: Array.isArray(value?.discounts)
      ? value.discounts.map((discount) => ({
          ...discount,
          percentage: Number(discount.percentage) || 0,
        }))
      : defaultPOSDiscounts.discounts,
  };
}

export function calculateConfiguredCharges(
  subtotal: number,
  discount: number,
  pricing: POSPricingSetting,
) {
  const taxableBase = Math.max(0, subtotal - discount);
  const tax = pricing.taxEnabled
    ? roundMoney(taxableBase * (Math.max(0, pricing.taxRate) / 100))
    : 0;
  const serviceCharge = pricing.serviceChargeEnabled
    ? roundMoney(taxableBase * (Math.max(0, pricing.serviceChargeRate) / 100))
    : 0;
  return { tax, serviceCharge };
}

export function settingScopeLabel(module: BusinessModule) {
  return module === 'RESTAURANT' ? 'Restaurant' : 'Retail';
}

function readSetting<T>(settings: Array<ApiBusinessSetting | ApiPOSSetting>, key: string): T | undefined {
  const value = settings.find((setting) => setting.key === key)?.value;
  return value && typeof value === 'object' ? value as T : undefined;
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
