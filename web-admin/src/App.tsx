import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import MenuPage from './pages/MenuPage';
import StockPage from './pages/StockPage';
import InvoicePage from './pages/InvoicePage';
import LoginPage from './pages/LoginPage';
import AuthGuard from './lib/AuthGuard';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/*"
          element={
            <AuthGuard>
              <div style={{ display: 'flex', minHeight: '100vh' }}>
                <nav style={{ width: 200, borderRight: '1px solid #ddd', padding: 16 }}>
                  <h3>Cafe Admin</h3>
                  <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <li><NavLink to="/menu">Kelola Menu</NavLink></li>
                    <li><NavLink to="/stock">Stok Harian</NavLink></li>
                    <li><NavLink to="/invoice">Riwayat Invoice</NavLink></li>
                  </ul>
                </nav>
                <main style={{ flex: 1, padding: 24 }}>
                  <Routes>
                    <Route path="/menu" element={<MenuPage />} />
                    <Route path="/stock" element={<StockPage />} />
                    <Route path="/invoice" element={<InvoicePage />} />
                    <Route path="/" element={<MenuPage />} />
                  </Routes>
                </main>
              </div>
            </AuthGuard>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;