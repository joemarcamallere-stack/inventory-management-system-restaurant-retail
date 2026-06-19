import { POSDashboard } from '../../../shared/pos/dashboard';

export default function RetailPOSDashboardView({
  onNavigate,
}: {
  onNavigate: (view: 'retail-create-order' | 'reports') => void;
}) {
  return (
    <POSDashboard
      module="RETAIL"
      title="Retail POS Dashboard"
      onCreateOrder={() => onNavigate('retail-create-order')}
      onOpenReports={() => onNavigate('reports')}
    />
  );
}
