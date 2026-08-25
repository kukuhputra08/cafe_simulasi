import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

type MenuItem = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  price: number;
  is_active: boolean;
};

export default function MenuPage() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  // form state buat tambah menu baru
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');

  const fetchMenu = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error(error);
    } else {
      setMenuItems(data as MenuItem[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMenu();
  }, []);

  const handleAddMenu = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !price) {
      alert('Nama dan harga wajib diisi');
      return;
    }

    const { error } = await supabase.from('menu_items').insert({
      name,
      description,
      category,
      price: Number(price),
      is_active: true,
    });

    if (error) {
      alert('Gagal nambah menu: ' + error.message);
      return;
    }

    // reset form
    setName('');
    setDescription('');
    setCategory('');
    setPrice('');
    fetchMenu();
  };

  const toggleActive = async (item: MenuItem) => {
    const { error } = await supabase
      .from('menu_items')
      .update({ is_active: !item.is_active })
      .eq('id', item.id);

    if (error) {
      alert('Gagal update status: ' + error.message);
      return;
    }
    fetchMenu();
  };

  const handleDelete = async (id: string) => {
    const confirmDelete = confirm('Yakin mau hapus menu ini?');
    if (!confirmDelete) return;

    const { error } = await supabase.from('menu_items').delete().eq('id', id);
    if (error) {
      alert('Gagal hapus menu: ' + error.message);
      return;
    }
    fetchMenu();
  };

  return (
    <div>
      <h2>Kelola Menu</h2>

      <form onSubmit={handleAddMenu} style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        <input placeholder="Nama menu" value={name} onChange={(e) => setName(e.target.value)} />
        <input placeholder="Kategori" value={category} onChange={(e) => setCategory(e.target.value)} />
        <input placeholder="Deskripsi" value={description} onChange={(e) => setDescription(e.target.value)} />
        <input placeholder="Harga" type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
        <button type="submit">Tambah Menu</button>
      </form>

      {loading ? (
        <p>Memuat data...</p>
      ) : (
        <table border={1} cellPadding={8} style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr>
              <th>Nama</th>
              <th>Kategori</th>
              <th>Harga</th>
              <th>Status</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {menuItems.map((item) => (
              <tr key={item.id}>
                <td>{item.name}</td>
                <td>{item.category}</td>
                <td>Rp{item.price.toLocaleString('id-ID')}</td>
                <td>{item.is_active ? 'Aktif' : 'Nonaktif'}</td>
                <td>
                  <button onClick={() => toggleActive(item)}>
                    {item.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                  </button>{' '}
                  <button onClick={() => handleDelete(item.id)}>Hapus</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}