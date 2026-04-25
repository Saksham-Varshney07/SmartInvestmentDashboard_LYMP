import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import SipPlanner from './pages/SipPlanner';
import StockSearch from './pages/StockSearch';
import RiskAnalysis from './pages/RiskAnalysis';
import Portfolio from './pages/Portfolio';
import AssetExplorer from './pages/AssetExplorer';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/sipplanner" element={<SipPlanner />} />
        <Route path="/search/:stockname" element={<StockSearch />} />
        
        <Route path="/riskanalysis" element={<RiskAnalysis />} />
        <Route path="/portfolio" element={<Portfolio />} />
        <Route path="/assetexplorer" element={<AssetExplorer />} />
        <Route path="/:stockname" element={<StockSearch />} />
      </Routes>
    </Router>
  );
}

export default App;
