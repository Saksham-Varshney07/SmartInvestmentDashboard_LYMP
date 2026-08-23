import React, { useState, useEffect } from 'react';
import { Joyride, STATUS, EVENTS, ACTIONS } from 'react-joyride';

const TOUR_STEPS = [
  {
    target: '#nav-dashboard',
    title: 'Your Dashboard',
    content: 'Get a bird\'s-eye view of your entire financial universe. See live metrics, total net worth, and quick insights in one place.',
    disableBeacon: true,
  },
  {
    target: '#nav-portfolio',
    title: 'Track Your Portfolio',
    content: 'Monitor your holdings in real-time, track your profit/loss, and maintain a detailed transaction history with live pricing.',
    disableBeacon: true,
  },
  {
    target: '#nav-riskanalysis',
    title: 'AI Portfolio Doctor',
    content: 'Discover your investor profile. Let our ML engine analyze overlapping correlation risk to suggest the perfect asset allocation.',
    disableBeacon: true,
  },
  {
    target: '#nav-sipplanner',
    title: 'Advanced SIP Planner',
    content: 'Plan systematic investments with inflation adjustments and see AI-driven Monte Carlo simulations for future wealth.',
    disableBeacon: true,
  },
  {
    target: '#nav-assetexplorer',
    title: 'Asset Explorer',
    content: 'A unified intelligence layer to search and analyze Stocks, Crypto, and Commodities, complete with AI risk scoring.',
    disableBeacon: true,
  },
  {
    target: '#nav-search',
    title: 'Global Search',
    content: 'Quickly find and analyze any stock or asset directly from anywhere in the app!',
    disableBeacon: true,
  }
];

export default function Onboarding() {
  const [showWelcome, setShowWelcome] = useState(false);
  const [runTour, setRunTour] = useState(false);
  
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding_v2');
    if (!hasSeenOnboarding) {
      setShowWelcome(true);
    }
    
    const observer = new MutationObserver(() => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    setIsDarkMode(document.documentElement.classList.contains('dark'));
    
    return () => observer.disconnect();
  }, []);

  const handleStartTour = () => {
    setShowWelcome(false);
    setTimeout(() => {
      setRunTour(true);
    }, 300);
  };

  const handleSkipWelcome = () => {
    setShowWelcome(false);
    localStorage.setItem('hasSeenOnboarding_v2', 'true');
  };

  const handleJoyrideCallback = (data) => {
    const { status } = data;
    const finishedStatuses = [STATUS.FINISHED, STATUS.SKIPPED];
    
    if (finishedStatuses.includes(status)) {
      setRunTour(false);
      localStorage.setItem('hasSeenOnboarding_v2', 'true');
    }
  };

  return (
    <>
      {showWelcome && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col relative transition-colors duration-300">
            
            <button 
              onClick={handleSkipWelcome}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 transition-colors z-10"
              aria-label="Skip"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>

            <div className="px-8 pt-10 pb-8 flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mb-6 shadow-inner">
                <span className="material-symbols-outlined text-4xl">rocket_launch</span>
              </div>
              
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3 tracking-tight">
                Welcome to Smart Investment Dashboard
              </h2>
              
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed mb-8">
                Your unified platform for AI-driven portfolio management, risk analysis, and asset exploration.
              </p>

              <button 
                onClick={handleStartTour}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl shadow-md hover:shadow-lg transition-all text-sm"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      )}

      <Joyride
        steps={TOUR_STEPS}
        run={runTour}
        continuous={true}
        disableBeacon={true}
        showProgress={true}
        showSkipButton={true}
        callback={handleJoyrideCallback}
        disableOverlayClose={true}
        spotlightPadding={4}
        styles={{
          options: {
            arrowColor: isDarkMode ? '#1e293b' : '#ffffff',
            backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
            overlayColor: 'rgba(15, 23, 42, 0.75)',
            primaryColor: '#2563eb',
            textColor: isDarkMode ? '#f8fafc' : '#0f172a',
            zIndex: 1000,
          },
          tooltipContainer: {
            textAlign: 'left'
          },
          buttonNext: {
            backgroundColor: '#2563eb',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 'bold',
            padding: '10px 18px',
          },
          buttonBack: {
            color: isDarkMode ? '#cbd5e1' : '#64748b',
            marginRight: '10px',
            fontSize: '14px',
            fontWeight: '600'
          },
          buttonSkip: {
            color: isDarkMode ? '#94a3b8' : '#94a3b8',
            fontSize: '14px',
            fontWeight: '500'
          }
        }}
      />
    </>
  );
}
