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
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <div className="flex items-center gap-6 mb-8 pb-8 border-b border-slate-100">
           <div className="w-24 h-24 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center text-3xl font-bold uppercase">
             {currentUser.username[0]}
           </div>
           <div>
             <h1 className="text-3xl font-bold text-slate-900">{currentUser.full_name || currentUser.username}</h1>
             <p className="text-slate-500">@{currentUser.username}</p>
           </div>
        </div>

        <div className="space-y-6 mb-10">
           <div>
             <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">Investor Profile</h3>
             <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                   <p className="text-xs text-slate-500 mb-1">Risk Profile</p>
                   <p className="font-semibold text-slate-900">{currentUser.risk_profile || 'Not specified'}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                   <p className="text-xs text-slate-500 mb-1">Investment Horizon</p>
                   <p className="font-semibold text-slate-900">{currentUser.investment_horizon || 'Not specified'}</p>
                </div>
             </div>
           </div>
        </div>

        <div className="flex justify-end">
           <button 
             onClick={handleLogout}
             className="bg-rose-50 text-rose-600 hover:bg-rose-100 font-bold px-6 py-2.5 rounded-lg transition-colors flex items-center gap-2"
           >
             <span className="material-symbols-outlined text-[18px]">logout</span> Sign out
           </button>
        </div>
      </div>
    </div>
  );
}
