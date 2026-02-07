import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Scan from './pages/Scan';
import ScanResults from './pages/ScanResults';
import Cravings from './pages/Cravings';
import ShoppingList from './pages/ShoppingList';
import Inventory from './pages/Inventory';
<<<<<<< HEAD
import { CameraProvider, useCamera } from './contexts/CameraContext';
import CameraBackground from './components/CameraBackground';

function AppContent() {
  const { isCameraActive } = useCamera();

  return (
    <>
      {isCameraActive && <CameraBackground />}
      <div className="relative z-10 w-full h-full">
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/scan" element={<Scan />} />
            <Route path="/scan-results" element={<ScanResults />} />
            <Route path="/cravings" element={<Cravings />} />
            <Route path="/shopping" element={<ShoppingList />} />
            <Route path="/inventory" element={<Inventory />} />
          </Routes>
        </Layout>
      </div>
    </>
  );
}

export default function App() {
  return (
    <CameraProvider>
      <AppContent />
    </CameraProvider>
=======
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
>>>>>>> feature/web-pantry-staples
  );
}
