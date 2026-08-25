import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

type Order = {
  id: string;
  invoice_no: string;
  tracking_token: string;
  total: number;
  status: string;
};

export default function PaymentPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
const fetchOrder = async () => {
  const { data, error } = await supabase.rpc('get_order_by_id', { p_order_id: orderId });

  if (error || !data || data.length === 0) {
    console.error(error);
  } else {
    setOrder(data[0] as Order);
  }
  setLoading(false);
};
    fetchOrder();
  }, [orderId]);

  const handlePay = async () => {
    setPaying(true);
    const { error } = await supabase.rpc('simulate_payment', { p_order_id: orderId });
    setPaying(false);

    if (error) {
      alert('Gagal memproses pembayaran: ' + error.message);
      return;
    }

    navigate(`/track/${order?.tracking_token}`);
  };

  if (loading) return <p style={{ padding: 16 }}>Memuat...</p>;
  if (!order) return <p style={{ padding: 16 }}>Pesanan tidak ditemukan.</p>;

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: 16, textAlign: 'center' }}>
      <h2>Pembayaran</h2>
      <p>No. Invoice: <strong>{order.invoice_no}</strong></p>
      <p style={{ fontSize: 24, fontWeight: 'bold' }}>Rp{order.total.toLocaleString('id-ID')}</p>

      <div
        style={{
          border: '1px dashed #888',
          borderRadius: 8,
          padding: 24,
          margin: '24px 0',
          color: '#888',
        }}
      >
        (Simulasi Payment Gateway — belum terhubung ke provider asli)
      </div>

      <button onClick={handlePay} disabled={paying} style={{ padding: '12px 24px' }}>
        {paying ? 'Memproses...' : 'Bayar Sekarang'}
      </button>
    </div>
  );
}