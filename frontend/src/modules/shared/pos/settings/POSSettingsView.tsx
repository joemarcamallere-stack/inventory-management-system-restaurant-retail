import { useEffect, useMemo, useState } from 'react';
import { CreditCard, ReceiptText, Save, Settings2, Store } from 'lucide-react';
import type { BusinessModule } from '../../../../app/api/domainTypes';
import {
  useBusinessSettingsQuery,
  usePOSSettingsQuery,
  useUpsertBusinessSettingMutation,
  useUpsertPOSSettingMutation,
} from '../../../lib/domainQueries';
import {
  BUSINESS_PROFILE_KEY,
  POS_PAYMENTS_KEY,
  POS_PRICING_KEY,
  POS_RECEIPT_KEY,
  defaultBusinessProfile,
  defaultPOSPayments,
  defaultPOSPricing,
  defaultPOSReceipt,
  getBusinessProfile,
  getPOSPayments,
  getPOSPricing,
  getPOSReceipt,
  settingScopeLabel,
  type BusinessProfileSetting,
  type POSPaymentSetting,
  type POSPricingSetting,
  type POSReceiptSetting,
} from './posSettings';

type Props = {
  module: BusinessModule;
};

const paymentOptions = ['Cash', 'GCash', 'Card', 'Bank Transfer', 'PayMaya', 'Check'];

export function POSSettingsView({ module }: Props) {
  const scope = settingScopeLabel(module);
  const { data: businessSettings = [], isLoading: loadingBusiness } = useBusinessSettingsQuery();
  const { data: posSettings = [], isLoading: loadingPOS } = usePOSSettingsQuery({ module });
  const upsertBusinessSetting = useUpsertBusinessSettingMutation();
  const upsertPOSSetting = useUpsertPOSSettingMutation();

  const loadedProfile = useMemo(() => getBusinessProfile(businessSettings), [businessSettings]);
  const loadedPricing = useMemo(() => getPOSPricing(posSettings), [posSettings]);
  const loadedReceipt = useMemo(() => getPOSReceipt(posSettings), [posSettings]);
  const loadedPayments = useMemo(() => getPOSPayments(posSettings), [posSettings]);

  const [profile, setProfile] = useState<BusinessProfileSetting>(defaultBusinessProfile);
  const [pricing, setPricing] = useState<POSPricingSetting>(defaultPOSPricing);
  const [receipt, setReceipt] = useState<POSReceiptSetting>(defaultPOSReceipt);
  const [payments, setPayments] = useState<POSPaymentSetting>(defaultPOSPayments);
  const [savedMessage, setSavedMessage] = useState('');

  useEffect(() => {
    setProfile(loadedProfile);
  }, [loadedProfile]);

  useEffect(() => {
    setPricing(loadedPricing);
    setReceipt(loadedReceipt);
    setPayments(loadedPayments);
  }, [loadedPayments, loadedPricing, loadedReceipt]);

  const loading = loadingBusiness || loadingPOS;
  const saving = upsertBusinessSetting.isPending || upsertPOSSetting.isPending;

  const handleSave = async () => {
    setSavedMessage('');
    await Promise.all([
      upsertBusinessSetting.mutateAsync({ key: BUSINESS_PROFILE_KEY, value: profile }),
      upsertPOSSetting.mutateAsync({ module, key: POS_PRICING_KEY, value: pricing }),
      upsertPOSSetting.mutateAsync({ module, key: POS_RECEIPT_KEY, value: receipt }),
      upsertPOSSetting.mutateAsync({ module, key: POS_PAYMENTS_KEY, value: payments }),
    ]);
    setSavedMessage(`${scope} POS settings saved.`);
  };

  const togglePaymentMethod = (method: string) => {
    setPayments((current) => {
      const exists = current.methods.includes(method);
      const methods = exists
        ? current.methods.filter((item) => item !== method)
        : [...current.methods, method];
      return { methods: methods.length > 0 ? methods : ['Cash'] };
    });
  };

  if (loading) {
    return <div className="flex h-64 items-center justify-center text-muted-foreground">Loading POS settings...</div>;
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{scope} POS Settings</h1>
          <p className="text-sm text-muted-foreground">Configure receipt identity, tax, service charge, and payment methods.</p>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {savedMessage && (
        <div className="mb-5 rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-sm font-medium text-primary">
          {savedMessage}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="rounded-lg border border-border bg-card p-5">
          <div className="mb-4 flex items-center gap-2">
            <Store className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold text-foreground">Store Information</h2>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label="Display name" value={profile.displayName} onChange={(value) => setProfile({ ...profile, displayName: value })} />
            <Field label="Phone" value={profile.phone} onChange={(value) => setProfile({ ...profile, phone: value })} />
            <Field label="TIN" value={profile.tin} onChange={(value) => setProfile({ ...profile, tin: value })} />
            <Field label="Address" value={profile.address} onChange={(value) => setProfile({ ...profile, address: value })} />
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card p-5">
          <div className="mb-4 flex items-center gap-2">
            <ReceiptText className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold text-foreground">Receipt</h2>
          </div>
          <div className="space-y-3">
            <Field label="Header" value={profile.receiptHeader} onChange={(value) => setProfile({ ...profile, receiptHeader: value })} />
            <Field label="Footer" value={profile.receiptFooter} onChange={(value) => setProfile({ ...profile, receiptFooter: value })} />
            <Toggle label="Show TIN" checked={receipt.showTin} onChange={(checked) => setReceipt({ ...receipt, showTin: checked })} />
            <Toggle label="Show cashier" checked={receipt.showCashier} onChange={(checked) => setReceipt({ ...receipt, showCashier: checked })} />
            <Toggle label="Mark printed after payment" checked={receipt.printAfterPayment} onChange={(checked) => setReceipt({ ...receipt, printAfterPayment: checked })} />
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card p-5">
          <div className="mb-4 flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold text-foreground">Tax & Service Charge</h2>
          </div>
          <div className="space-y-4">
            <Toggle label="Enable tax" checked={pricing.taxEnabled} onChange={(checked) => setPricing({ ...pricing, taxEnabled: checked })} />
            <NumberField label="Tax rate (%)" value={pricing.taxRate} onChange={(value) => setPricing({ ...pricing, taxRate: value })} disabled={!pricing.taxEnabled} />
            <Toggle label="Enable service charge" checked={pricing.serviceChargeEnabled} onChange={(checked) => setPricing({ ...pricing, serviceChargeEnabled: checked })} />
            <NumberField label="Service charge rate (%)" value={pricing.serviceChargeRate} onChange={(value) => setPricing({ ...pricing, serviceChargeRate: value })} disabled={!pricing.serviceChargeEnabled} />
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card p-5">
          <div className="mb-4 flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold text-foreground">Payment Methods</h2>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {paymentOptions.map((method) => (
              <label key={method} className="flex items-center gap-2 rounded-lg border border-border p-3 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={payments.methods.includes(method)}
                  onChange={() => togglePaymentMethod(method)}
                  className="h-4 w-4"
                />
                {method}
              </label>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-input bg-input-background px-3 py-2 text-sm outline-none focus:border-primary"
      />
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      <input
        type="number"
        min={0}
        step={0.01}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Math.max(0, Number(event.target.value) || 0))}
        className="w-full rounded-lg border border-input bg-input-background px-3 py-2 text-sm outline-none focus:border-primary disabled:opacity-50"
      />
    </label>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm text-foreground">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4"
      />
    </label>
  );
}
