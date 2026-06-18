import { GoodsReceived as GoodsReceivedShared } from '../shared/receiving/GoodsReceived';
import { useRestaurantReceivingConfig } from './receivingConfig';

export function GoodsReceived() {
  const config = useRestaurantReceivingConfig();
  return <GoodsReceivedShared config={config} />;
}
