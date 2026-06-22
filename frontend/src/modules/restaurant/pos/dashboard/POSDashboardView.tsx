import { POSDashboard } from '../../../shared/pos/dashboard';

export default function RestaurantPOSDashboardView({
  onNavigate,
}: {
  onNavigate: (view: 'restaurant-create-order' | 'restaurant-reports' | 'restaurant-kitchen-queue') => void;
}) {
  return (
    <POSDashboard
      module="RESTAURANT"
      title="Dashboard"
      onCreateOrder={() => onNavigate('restaurant-create-order')}
      onOpenReports={() => onNavigate('restaurant-reports')}
      onOpenKitchen={() => onNavigate('restaurant-kitchen-queue')}
      showCreateOrder={false}
    />
  );
}
