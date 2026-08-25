import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import * as XLSX from 'xlsx';

type OrderRow = {
  id: string;
  invoice_no: string;
  type: 'online' | 'offline';
  customer_name: string | null;
  status: string;
  total: number;
  created_at: string;
  payments: { method: string; status: string }[];
  order_items: { qty: number; price_at_order: number; menu_items: { name: string } }[];
};

function toExcelRows(orders: OrderRow[]) {
  const rows: Record<string, string | number>[] = [];
  orders.forEach((order) => {
    const payment = order.payments?.[0];
    order.order_items.forEach((item) => {
      rows.push({
        Tanggal: new Date(order.created_at).toLocaleString('id-ID'),
        'No. Invoice': order.invoice_no,
        Pembeli: order.customer_name || '-',
        Item: item.menu_items?.name || '-',
        Qty: item.qty,
        'Harga Satuan': item.price_at_order,
        Subtotal: item.qty * item.price_at_order,
        'Total Invoice': order.total,
        'Metode Bayar': payment?.method || '-',
        Status: order.status,
      });
    });
  });
  return rows;
}

export default function InvoicePage() {
  const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .split('T')[0];
  const todayStr = new Date().toISOString().split('T')[0];

  const [fromDate, setFromDate] = useState(firstDayOfMonth);
  const [toDate, setToDate] = useState(todayStr);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('orders')
      .select(
        `id, invoice_no, type, customer_name, status, total, created_at,
         payments ( method, status ),
         order_items ( qty, price_at_order, menu_items ( name ) )`
      )
      .gte('created_at', fromDate)
      .lte('created_at', toDate + 'T23:59:59')
      .order('created_at', { ascending: false });

    if (error) {
      alert('Gagal ambil data: ' + error.message);
      setLoading(false);
      return;
    }

    setOrders(data as unknown as OrderRow[]);
    setLoading(false);
  };

  const handleExport = () => {
    if (orders.length === 0) {
      alert('Gak ada data buat di-export. Klik "Tampilkan" dulu.');
      return;
    }

    const onlineOrders = orders.filter((o) => o.type === 'online');
    const offlineOrders = orders.filter((o) => o.type === 'offline');

    const wb = XLSX.utils.book_new();
    const wsOnline = XLSX.utils.json_to_sheet(toExcelRows(onlineOrders));
    const wsOffline = XLSX.utils.json_to_sheet(toExcelRows(offlineOrders));

    XLSX.utils.book_append_sheet(wb, wsOnline, 'Online');
    XLSX.utils.book_append_sheet(wb, wsOffline, 'Offline');

    XLSX.writeFile(wb, `invoice-${fromDate}_sampai_${toDate}.xlsx`);
  };

  return (
    <div>
      <h2>Riwayat Invoice</h2>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16 }}>
        <label>
          Dari:{' '}
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </label>
        <label>
          Sampai:{' '}
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </label>
        <button onClick={fetchOrders}>Tampilkan</button>
        <button onClick={handleExport}>Export Excel</button>
      </div>

      {loading ? (
        <p>Memuat data...</p>
      ) : (
        <table border={1} cellPadding={8} style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr>
              <th>Tanggal</th>
              <th>No. Invoice</th>
              <th>Tipe</th>
              <th>Pembeli</th>
              <th>Total</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td>{new Date(order.created_at).toLocaleString('id-ID')}</td>
                <td>{order.invoice_no}</td>
                <td>{order.type}</td>
                <td>{order.customer_name || '-'}</td>
                <td>Rp{order.total.toLocaleString('id-ID')}</td>
                <td>{order.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}