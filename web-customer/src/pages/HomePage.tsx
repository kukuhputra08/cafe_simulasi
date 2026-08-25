import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useCart } from '../context/CartContext';

type MenuItem = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  price: number;
};

export default function HomePage() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { addItem, totalQty, totalPrice } = useCart();

  useEffect(() => {
    const fetchMenu = async () => {
      const { data, error } = await supabase
        .from('menu_items')
        .select('id, name, description, category, price')
        .eq('is_active', true)
        .order('category');

      if (error) {
        console.error(error);
      } else {
        setMenuItems(data as MenuItem[]);
      }
      setLoading(false);
    };
    fetchMenu();
  }, []);

  // kelompokkan menu per kategori
  const grouped = menuItems.reduce((acc, item) => {
    const cat = item.category || 'Lainnya';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {} as Record<string, MenuItem[]>);

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: 16, paddingBottom: 80 }}>
      <h1>Cafe Kamu ☕</h1>

      {loading ? (
        <p>Memuat menu...</p>
      ) : (
        Object.entries(grouped).map(([category, items]) => (
          <div key={category} style={{ marginBottom: 24 }}>
            <h3>{category}</h3>
            {items.map((item) => (
              <div
                key={item.id}
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
                  <div style={{ fontSize: 13, color: '#888' }}>{item.description}</div>
                  <div>Rp{item.price.toLocaleString('id-ID')}</div>
                </div>
                <button onClick={() => addItem({ menuItemId: item.id, name: item.name, price: item.price })}>
                  Tambah
                </button>
              </div>
            ))}
          </div>
        ))
      )}

      {totalQty > 0 && (
        <Link
          to="/cart"
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
            display: 'flex',
            justifyContent: 'space-between',
            textDecoration: 'none',
          }}
        >
          <span>{totalQty} item di keranjang</span>
          <span>Rp{totalPrice.toLocaleString('id-ID')}</span>
        </Link>
      )}
    </div>
  );
}