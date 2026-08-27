import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
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

const PageTransition = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, y: 15 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -15 }}
    transition={{ duration: 0.3, ease: "easeOut" }}
  >
    {children}
  </motion.div>
);

const AnimatedRoutes = () => {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageTransition><Dashboard /></PageTransition>} />
        <Route path="/account" element={<PageTransition><Account /></PageTransition>} />
        <Route path="/sipplanner" element={<PageTransition><SipPlanner /></PageTransition>} />
        <Route path="/search/:stockname" element={<PageTransition><StockSearch /></PageTransition>} />
        <Route path="/riskanalysis" element={<PageTransition><RiskAnalysis /></PageTransition>} />
        <Route path="/portfolio" element={<PageTransition><Portfolio /></PageTransition>} />
        <Route path="/assetexplorer" element={<PageTransition><AssetExplorer /></PageTransition>} />
        <Route path="/:stockname" element={<PageTransition><StockSearch /></PageTransition>} />
      </Routes>
    </AnimatePresence>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <ScrollToTop />
        <Onboarding />
        <Layout>
          <AnimatedRoutes />
        </Layout>
      </Router>
    </AuthProvider>
  );
}

export default App;
