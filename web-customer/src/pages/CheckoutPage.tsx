import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useCart } from '../context/CartContext';
import LocationPicker from '../components/LocationPicker';

export default function CheckoutPage() {
  const { items, totalPrice, clearCart } = useCart();
  const navigate = useNavigate();

  const [orderType] = useState<'online' | 'offline'>('online');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [addressNote, setAddressNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!name || !phone) {
      setErrorMsg('Nama dan nomor WA wajib diisi');
      return;
    }

    if (!lat || !lng) {
      setErrorMsg('Pilih titik lokasi pengantaran di peta dulu');
      return;
    }

    setSubmitting(true);

    const { data, error } = await supabase.rpc('create_order', {
      p_type: orderType,
      p_customer_name: name,
      p_customer_phone: phone,
      p_customer_email: email || null,
      p_items: items.map((i) => ({ menu_item_id: i.menuItemId, qty: i.qty })),
      p_delivery_lat: lat,
      p_delivery_lng: lng,
      p_delivery_address: addressNote || null,
    });

    setSubmitting(false);

    if (error) {
      setErrorMsg('Gagal membuat pesanan: ' + error.message);
      return;
    }

    const order = data[0];
    clearCart();
    navigate(`/payment/${order.order_id}`);
  };

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: 16 }}>
      <h2>Checkout</h2>

      <div style={{ marginBottom: 16 }}>
        <strong>Total: Rp{totalPrice.toLocaleString('id-ID')}</strong>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <label>
          Nama Lengkap
          <input value={name} onChange={(e) => setName(e.target.value)} style={{ width: '100%' }} />
        </label>
        <label>
          Nomor WA
          <input value={phone} onChange={(e) => setPhone(e.target.value)} style={{ width: '100%' }} />
        </label>
        <label>
          Email (buat notifikasi pesanan)
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: '100%' }}
          />
        </label>

        <div>
          <label style={{ display: 'block', marginBottom: 6 }}>Titik Lokasi Pengantaran</label>
          <LocationPicker
            onChange={(newLat, newLng) => {
              setLat(newLat);
              setLng(newLng);
            }}
          />
        </div>

        <label>
          Detail Alamat (patokan, no. rumah, dll)
          <input
            value={addressNote}
            onChange={(e) => setAddressNote(e.target.value)}
            style={{ width: '100%' }}
          />
        </label>

        {errorMsg && <p style={{ color: 'red' }}>{errorMsg}</p>}

        <button type="submit" disabled={submitting}>
          {submitting ? 'Memproses...' : 'Buat Pesanan & Lanjut Bayar'}
        </button>
      </form>
    </div>
  );
}