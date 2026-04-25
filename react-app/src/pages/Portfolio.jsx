import React from 'react';
import { Link } from 'react-router-dom';

export default function Portfolio() {
  return (
    <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center p-6 text-center antialiased font-['Inter']">
      <div>
        <span className="material-symbols-outlined text-6xl text-slate-300 mb-4 block">pie_chart</span>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Portfolio Manager</h1>
        <p className="text-slate-500 mb-6 max-w-md mx-auto">This module is currently under construction. Track and optimize your investments and holdings from this single pane of glass.</p>
        <Link to="/" className="bg-[#059669] text-white px-6 py-2 rounded-lg font-bold hover:bg-[#047857]">Return to Dashboard</Link>
      </div>
    </div>
  );
}
