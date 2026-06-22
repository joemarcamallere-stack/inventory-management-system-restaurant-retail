import RetailCreateOrderView from './create-order/RetailCreateOrderView';

export default function POSView({
  currentUser,
}: {
  currentUser: { email: string; role: string } | null;
}) {
  return <RetailCreateOrderView currentUser={currentUser} />;
}
