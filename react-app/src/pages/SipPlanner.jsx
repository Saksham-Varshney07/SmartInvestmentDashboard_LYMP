import React from 'react';
import { Link } from 'react-router-dom';

export default function SipPlanner() {
  return (
    <div className="p-8">
      <Link to="/" className="text-blue-600 font-medium hover:underline mb-6 inline-block">← Back to Dashboard</Link>
      <h1 className="text-3xl font-bold mb-4">SIP Planner Tool</h1>
      <p className="text-slate-600">Simulate your wealth creation journey using data-driven asset allocation recommendations.</p>
    </div>
  );
}
