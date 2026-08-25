import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';

export default function CartPage() {
  const { items, updateQty, removeItem, totalPrice } = useCart();
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <div style={{ maxWidth: 480, margin: '0 auto', padding: 16, textAlign: 'center' }}>
        <p>Keranjang kamu masih kosong.</p>
        <Link to="/">Kembali ke menu</Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: 16, paddingBottom: 100 }}>
      <h2>Keranjang</h2>

      {items.map((item) => (
        <div
          key={item.menuItemId}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 0',
            borderBottom: '1px solid #eee',
          }}
        >
          <div>
            <div style={{ fontWeight: 'bold' }}>{item.name}</div>
            <div>Rp{item.price.toLocaleString('id-ID')}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => updateQty(item.menuItemId, item.qty - 1)}>-</button>
            <span>{item.qty}</span>
            <button onClick={() => updateQty(item.menuItemId, item.qty + 1)}>+</button>
            <button onClick={() => removeItem(item.menuItemId)} style={{ marginLeft: 8 }}>
              Hapus
            </button>
          </div>
        </div>
      ))}

      <div style={{ marginTop: 16, fontWeight: 'bold', fontSize: 18 }}>
        Total: Rp{totalPrice.toLocaleString('id-ID')}
      </div>

      <button
        onClick={() => navigate('/checkout')}
        style={{
          position: 'fixed',
          bottom: 16,
          left: 16,
          right: 16,
          maxWidth: 448,
          margin: '0 auto',
          background: '#111',
          color: '#fff',
          padding: 16,
          borderRadius: 8,
          border: 'none',
        }}
      >
        Lanjut ke Checkout
      </button>
    </div>
  );
}