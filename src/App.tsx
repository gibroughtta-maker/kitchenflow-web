import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Scan from './pages/Scan';
import ScanResults from './pages/ScanResults';
import Cravings from './pages/Cravings';
import ShoppingList from './pages/ShoppingList';
import Inventory from './pages/Inventory';
import Pantry from './pages/Pantry';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/scan" element={<Scan />} />
        <Route path="/scan-results" element={<ScanResults />} />
        <Route path="/cravings" element={<Cravings />} />
        <Route path="/shopping" element={<ShoppingList />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/pantry" element={<Pantry />} />
      </Routes>
    </Layout>
  );
}
