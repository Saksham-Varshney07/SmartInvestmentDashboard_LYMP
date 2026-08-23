import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import Shepherd from 'shepherd.js';
import 'shepherd.js/dist/css/shepherd.css';

export default function Onboarding() {
  const { currentUser } = useContext(AuthContext);
  const [showWelcome, setShowWelcome] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Trigger onboarding automatically on page load/refresh if user is logged in
    if (!currentUser) return;
    
    // Always show it on hard refresh as requested
    setShowWelcome(true);
    
    // Listen for manual trigger from the Guide button in the top nav
    const triggerHandler = () => setShowWelcome(true);
    window.addEventListener('trigger-onboarding', triggerHandler);
    
    const observer = new MutationObserver(() => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    setIsDarkMode(document.documentElement.classList.contains('dark'));
    
    return () => {
      observer.disconnect();
      window.removeEventListener('trigger-onboarding', triggerHandler);
    };
  }, [currentUser]);

  const handleStartTour = () => {
    setShowWelcome(false);
    
    setTimeout(() => {
      const tour = new Shepherd.Tour({
        useModalOverlay: true,
        defaultStepOptions: {
          classes: isDarkMode ? 'shepherd-dark' : 'shepherd-light',
          scrollTo: true,
          cancelIcon: {
            enabled: true
          }
        }
      });
      
      const btnBack = {
        text: 'Back',
        action: tour.back,
        classes: 'btn-secondary'
      };
      
      const btnNext = {
        text: 'Next',
        action: tour.next,
        classes: 'btn-primary ml-2'
      };
      
      const btnFinish = {
        text: 'Done',
        action: tour.complete,
        classes: 'btn-primary ml-2'
      };

      tour.addStep({
        id: 'dashboard',
        title: 'Your Dashboard',
        text: 'Get a bird\'s-eye view of your entire financial universe. See live metrics, total net worth, and quick insights in one place.',
        attachTo: { element: '#nav-dashboard', on: 'bottom' },
        buttons: [btnNext]
      });

      tour.addStep({
        id: 'portfolio',
        title: 'Track Your Portfolio',
        text: 'Monitor your holdings in real-time, track your profit/loss, and maintain a detailed transaction history with live pricing.',
        attachTo: { element: '#nav-portfolio', on: 'bottom' },
        buttons: [btnBack, btnNext]
      });

      tour.addStep({
        id: 'riskanalysis',
        title: 'AI Portfolio Doctor',
        text: 'Discover your investor profile. Let our ML engine analyze overlapping correlation risk to suggest the perfect asset allocation.',
        attachTo: { element: '#nav-riskanalysis', on: 'bottom' },
        buttons: [btnBack, btnNext]
      });

      tour.addStep({
        id: 'sipplanner',
        title: 'Advanced SIP Planner',
        text: 'Plan systematic investments with inflation adjustments and see AI-driven Monte Carlo simulations for future wealth.',
        attachTo: { element: '#nav-sipplanner', on: 'bottom' },
        buttons: [btnBack, btnNext]
      });

      tour.addStep({
        id: 'assetexplorer',
        title: 'Asset Explorer',
        text: 'A unified intelligence layer to search and analyze Stocks, Crypto, and Commodities, complete with AI risk scoring.',
        attachTo: { element: '#nav-assetexplorer', on: 'bottom' },
        buttons: [btnBack, btnNext]
      });

      tour.addStep({
        id: 'search',
        title: 'Global Search',
        text: 'Quickly find and analyze any stock or asset directly from anywhere in the app!',
        attachTo: { element: '#nav-search', on: 'bottom' },
        buttons: [btnBack, btnFinish]
      });

      tour.start();
    }, 300);
  };

  const handleSkipWelcome = () => {
    setShowWelcome(false);
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
    </>
  );
}
