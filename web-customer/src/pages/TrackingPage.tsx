import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import LiveTrackingMap from '../components/LiveTrackingMap';

type Order = {
  id: string;
  invoice_no: string;
  status: string;
  total: number;
  customer_name: string;
  created_at: string;
  delivery_lat: number | null;
  delivery_lng: number | null;
};

const statusSteps = [
  { key: 'dibayar', label: 'Pesanan Diterima' },
  { key: 'disiapkan', label: 'Sedang Disiapkan' },
  { key: 'siap_diantar', label: 'Siap Diantar' },
  { key: 'diambil_driver', label: 'Driver Mengambil Pesanan' },
  { key: 'dalam_perjalanan', label: 'Dalam Perjalanan' },
  { key: 'selesai', label: 'Selesai' },
];

export default function TrackingPage() {
  const { token } = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOrder = async () => {
    const { data, error } = await supabase.rpc('get_order_by_token', { token });
    if (error) {
      console.error(error);
    } else if (data && data.length > 0) {
      setOrder(data[0] as Order);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchOrder();

    // subscribe realtime: kalau ada perubahan status, otomatis update tanpa refresh
    const channel = supabase
      .channel('order-tracking')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders' },
        (payload) => {
          setOrder((prev) =>
            prev && payload.new.id === prev.id ? (payload.new as Order) : prev
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [token]);

  if (loading) return <p style={{ padding: 16 }}>Memuat...</p>;
  if (!order) return <p style={{ padding: 16 }}>Pesanan tidak ditemukan.</p>;

  const currentStepIndex = statusSteps.findIndex((s) => s.key === order.status);

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: 16 }}>
      <h2>Lacak Pesanan</h2>
      <p>No. Invoice: <strong>{order.invoice_no}</strong></p>
      <p>Total: Rp{order.total.toLocaleString('id-ID')}</p>

      <div style={{ marginTop: 24 }}>
        {statusSteps.map((step, index) => {
          const isDone = currentStepIndex >= index;
          return (
            <div key={step.key} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  background: isDone ? '#22c55e' : '#333',
                  flexShrink: 0,
                }}
              />
              <span style={{ color: isDone ? undefined : '#888', fontWeight: isDone ? 'bold' : undefined }}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

{(order.status === 'diambil_driver' || order.status === 'dalam_perjalanan') &&
        order.delivery_lat &&
        order.delivery_lng && (
          <div style={{ marginTop: 16 }}>
            <h4>Lokasi Driver</h4>
            <LiveTrackingMap
              token={token!}
              destLat={order.delivery_lat}
              destLng={order.delivery_lng}
            />
          </div>
        )}
    </div>
  );
}