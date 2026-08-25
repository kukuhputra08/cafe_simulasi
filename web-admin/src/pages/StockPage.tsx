import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

type MenuItem = {
  id: string;
  name: string;
  is_active: boolean;
};

type StockRow = {
  id: string;
  menu_item_id: string;
  initial_qty: number;
  remaining_qty: number;
};

const today = new Date().toISOString().split('T')[0]; // format YYYY-MM-DD

export default function StockPage() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [stocks, setStocks] = useState<Record<string, StockRow>>({});
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);

    const { data: menuData, error: menuError } = await supabase
      .from('menu_items')
      .select('id, name, is_active')
      .order('name');

    if (menuError) {
      console.error(menuError);
      setLoading(false);
      return;
    }

    const { data: stockData, error: stockError } = await supabase
      .from('daily_stock')
      .select('id, menu_item_id, initial_qty, remaining_qty')
      .eq('stock_date', today);

    if (stockError) {
      console.error(stockError);
      setLoading(false);
      return;
    }

    const stockMap: Record<string, StockRow> = {};
    (stockData as StockRow[]).forEach((s) => {
      stockMap[s.menu_item_id] = s;
    });

    setMenuItems(menuData as MenuItem[]);
    setStocks(stockMap);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSetStock = async (menuItemId: string) => {
    const qty = Number(inputValues[menuItemId]);
    if (!qty || qty <= 0) {
      alert('Isi jumlah stok yang valid');
      return;
    }

    // upsert: kalau stok hari ini buat menu ini udah ada, update. Kalau belum, insert baru.
    const { error } = await supabase.from('daily_stock').upsert(
      {
        menu_item_id: menuItemId,
        stock_date: today,
        initial_qty: qty,
        remaining_qty: qty,
      },
      { onConflict: 'menu_item_id,stock_date' }
    );

    if (error) {
      alert('Gagal set stok: ' + error.message);
      return;
    }

    // kalau stok di-set ulang (misal restock), otomatis aktifkan lagi menunya
    await supabase.from('menu_items').update({ is_active: true }).eq('id', menuItemId);

    fetchData();
  };

  return (
    <div>
      <h2>Stok Harian — {today}</h2>
      <p style={{ color: '#888' }}>
        Input jumlah stok yang tersedia hari ini untuk tiap menu. Stok akan otomatis berkurang
        setiap ada pesanan masuk (online maupun offline).
      </p>

      {loading ? (
        <p>Memuat data...</p>
      ) : (
        <table border={1} cellPadding={8} style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr>
              <th>Nama Menu</th>
              <th>Stok Awal</th>
              <th>Sisa Stok</th>
              <th>Status</th>
              <th>Set Stok Baru</th>
            </tr>
          </thead>
          <tbody>
            {menuItems.map((item) => {
              const stock = stocks[item.id];
              const isLow = stock && stock.remaining_qty <= 5 && stock.remaining_qty > 0;
              const isEmpty = stock && stock.remaining_qty <= 0;

              return (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td>{stock ? stock.initial_qty : '-'}</td>
                  <td
                    style={{
                      color: isEmpty ? 'red' : isLow ? 'orange' : undefined,
                      fontWeight: isEmpty || isLow ? 'bold' : undefined,
                    }}
                  >
                    {stock ? stock.remaining_qty : '-'}
                  </td>
                  <td>
                    {!stock
                      ? 'Belum di-set'
                      : isEmpty
                      ? 'Habis'
                      : isLow
                      ? 'Menipis'
                      : 'Aman'}
                  </td>
                  <td>
                    <input
                      type="number"
                      placeholder="jumlah"
                      style={{ width: 80 }}
                      value={inputValues[item.id] || ''}
                      onChange={(e) =>
                        setInputValues({ ...inputValues, [item.id]: e.target.value })
                      }
                    />
                    <button onClick={() => handleSetStock(item.id)}>Set</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}