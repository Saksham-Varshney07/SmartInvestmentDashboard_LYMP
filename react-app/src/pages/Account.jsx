import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

export default function Account() {
  const { currentUser, setCurrentUser } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    setCurrentUser(null);
    navigate('/');
  };

  if (!currentUser) return null;

  return (
    <div className="max-w-[1440px] mx-auto px-6 py-12">
      <div className="max-w-2xl mx-auto bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-8 transition-colors">
        <div className="flex items-center gap-6 mb-8 pb-8 border-b border-slate-100 dark:border-slate-800">
           <div className="w-24 h-24 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-3xl font-bold uppercase">
             {currentUser.username[0]}
           </div>
           <div>
             <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{currentUser.full_name || currentUser.username}</h1>
             <p className="text-slate-500 dark:text-slate-400">@{currentUser.username}</p>
           </div>
        </div>

        <div className="space-y-6 mb-10">
           <div>
             <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3">Investor Profile</h3>
             <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                   <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Risk Profile</p>
                   <p className="font-semibold text-slate-900 dark:text-white">{currentUser.risk_profile || 'Not specified'}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                   <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Investment Horizon</p>
                   <p className="font-semibold text-slate-900 dark:text-white">{currentUser.investment_horizon || 'Not specified'}</p>
                </div>
             </div>
           </div>
        </div>

        <div className="flex justify-end">
           <button 
             onClick={handleLogout}
             className="bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/50 font-bold px-6 py-2.5 rounded-lg transition-colors flex items-center gap-2"
           >
             <span className="material-symbols-outlined text-[18px]">logout</span> Sign out
           </button>
        </div>
      </div>
    </div>
  );
}
