import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import SipPlanner from './pages/SipPlanner';
import StockSearch from './pages/StockSearch';
import RiskAnalysis from './pages/RiskAnalysis';
import Portfolio from './pages/Portfolio';
import AssetExplorer from './pages/AssetExplorer';
import Account from './pages/Account';

import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import Onboarding from './components/Onboarding';
import ScrollToTop from './components/ScrollToTop';

function App() {
  return (
    <AuthProvider>
      <Router>
        <ScrollToTop />
        <Onboarding />
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/account" element={<Account />} />
            <Route path="/sipplanner" element={<SipPlanner />} />
            <Route path="/search/:stockname" element={<StockSearch />} />
            <Route path="/riskanalysis" element={<RiskAnalysis />} />
            <Route path="/portfolio" element={<Portfolio />} />
            <Route path="/assetexplorer" element={<AssetExplorer />} />
            <Route path="/:stockname" element={<StockSearch />} />
          </Routes>
        </Layout>
      </Router>
    </AuthProvider>
  );
}

export default App;
