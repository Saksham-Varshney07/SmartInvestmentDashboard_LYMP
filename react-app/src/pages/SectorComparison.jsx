import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { formatINR, formatMarketCap } from '../utils/finance';

export default function SectorComparison() {
  const [data, setData] = useState({ sectors: {}, all_stocks: [], generated_at: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSector, setSelectedSector] = useState('ALL');
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'leaders'
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState('yearly_return');
  const [sortDirection, setSortDirection] = useState('desc');

  const fetchSectors = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('http://127.0.0.1:8000/api/top-sectors');
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const json = await res.json();
      if (json.status === 'success') {
        setData(json);
      } else {
        throw new Error(json.message || 'Failed to load sector data');
      }
    } catch (err) {
      console.error('Error fetching sectors:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSectors();
  }, []);

  const sectorList = useMemo(() => {
    const list = Object.keys(data.sectors || {});
    return list;
  }, [data.sectors]);

  // Filter stocks based on sector & search query
  const filteredStocks = useMemo(() => {
    let stocks = data.all_stocks || [];
    if (selectedSector !== 'ALL') {
      stocks = stocks.filter(s => s.sector === selectedSector);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      stocks = stocks.filter(
        s => s.name?.toLowerCase().includes(q) || s.symbol?.toLowerCase().includes(q)
      );
    }

    // Sort
    return [...stocks].sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (valA === null || valA === undefined) valA = -Infinity;
      if (valB === null || valB === undefined) valB = -Infinity;

      if (typeof valA === 'string') {
        return sortDirection === 'asc'
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }
      return sortDirection === 'asc' ? valA - valB : valB - valA;
    });
  }, [data.all_stocks, selectedSector, searchQuery, sortField, sortDirection]);

  // Sector stats
  const sectorStats = useMemo(() => {
    const all = data.all_stocks || [];
    if (!all.length) return null;

    const avgReturn = (all.reduce((acc, s) => acc + (s.yearly_return || 0), 0) / all.length).toFixed(1);

    // Best performer
    const best = [...all].sort((a, b) => (b.yearly_return || 0) - (a.yearly_return || 0))[0];

    // Value leader (lowest positive PE)
    const positivePE = all.filter(s => s.pe_ratio && s.pe_ratio > 0);
    const valueStock = positivePE.sort((a, b) => a.pe_ratio - b.pe_ratio)[0];

    return {
      totalStocks: all.length,
      totalSectors: sectorList.length,
      avgReturn,
      bestStock: best,
      valueStock
    };
  }, [data.all_stocks, sectorList]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const renderSortIcon = (field) => {
    if (sortField !== field) {
      return <span className="material-symbols-outlined text-[14px] text-slate-300 dark:text-slate-600 ml-1">unfold_more</span>;
    }
    return (
      <span className="material-symbols-outlined text-[14px] text-blue-600 dark:text-blue-400 ml-1">
        {sortDirection === 'asc' ? 'expand_less' : 'expand_more'}
      </span>
    );
  };

  const getRiskBadge = (risk) => {
    switch (risk) {
      case 'Low Risk':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Low Risk
          </span>
        );
      case 'High Risk':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
            High Risk
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            Moderate
          </span>
        );
    }
  };

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-2xl">table_chart</span>
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                Sector Comparison & Screener
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Screener.in inspired dense financial multiples, 52-week price channels, and quantitative ML risk tags.
              </p>
            </div>
          </div>
        </div>

        {/* View Mode Toggle & Refresh */}
        <div className="flex items-center gap-3">
          <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-lg flex items-center">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">format_list_bulleted</span>
              Full Screener
            </button>
            <button
              onClick={() => setViewMode('leaders')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                viewMode === 'leaders'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">stars</span>
              Sector Leaders
            </button>
          </div>

          <button
            onClick={fetchSectors}
            disabled={loading}
            className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
            title="Refresh Data"
          >
            <span className={`material-symbols-outlined text-lg ${loading ? 'animate-spin text-blue-600' : ''}`}>
              refresh
            </span>
          </button>
        </div>
      </div>

      {/* Highlights Bar */}
      {sectorStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 rounded-xl shadow-sm">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Coverage Universe</div>
            <div className="text-xl font-bold text-slate-900 dark:text-white">
              {sectorStats.totalStocks} Stocks <span className="text-xs font-normal text-slate-400">across {sectorStats.totalSectors} Sectors</span>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 rounded-xl shadow-sm">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Average 1Y Sector Return</div>
            <div className={`text-xl font-bold ${Number(sectorStats.avgReturn) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {Number(sectorStats.avgReturn) >= 0 ? '+' : ''}{sectorStats.avgReturn}%
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 rounded-xl shadow-sm">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Top 1Y Performer</div>
            <div className="text-lg font-bold text-slate-900 dark:text-white truncate">
              {sectorStats.bestStock?.name}
            </div>
            <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              +{sectorStats.bestStock?.yearly_return}% ({sectorStats.bestStock?.symbol})
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 rounded-xl shadow-sm">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Lowest P/E Leader</div>
            <div className="text-lg font-bold text-slate-900 dark:text-white truncate">
              {sectorStats.valueStock?.name || 'N/A'}
            </div>
            <div className="text-xs font-semibold text-blue-600 dark:text-blue-400">
              {sectorStats.valueStock?.pe_ratio}x P/E • {sectorStats.valueStock?.sector}
            </div>
          </div>
        </div>
      )}

      {/* Sector Leaders Cards View */}
      {viewMode === 'leaders' && (
        <div className="space-y-6 mb-8">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-500">workspace_premium</span>
              Top 2 Performers by Sector (1-Year Return)
            </h2>
            <span className="text-xs text-slate-400">Automated Yahoo Finance Batch Benchmark</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(data.sectors || {}).map(([sectorName, leaders]) => (
              <div
                key={sectorName}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm hover:border-blue-400 dark:hover:border-blue-600 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                      {sectorName}
                    </span>
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Top 2</span>
                  </div>

                  <div className="space-y-3">
                    {leaders.map((stock, idx) => (
                      <Link
                        key={stock.symbol}
                        to={`/search/${stock.symbol}`}
                        className="group flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 hover:bg-blue-50/60 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-700/50 transition-all"
                      >
                        <div className="min-w-0 pr-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-400 w-4">#{idx + 1}</span>
                            <span className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate">
                              {stock.name}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 ml-6">
                            {stock.symbol} • {stock.pe_ratio ? `${stock.pe_ratio}x P/E` : 'N/A P/E'}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="font-semibold text-sm text-slate-900 dark:text-white">
                            {formatINR(stock.current_price)}
                          </div>
                          <div
                            className={`text-xs font-bold flex items-center justify-end ${
                              stock.yearly_return >= 0
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[13px] mr-0.5">
                              {stock.yearly_return >= 0 ? 'arrow_upward' : 'arrow_downward'}
                            </span>
                            {stock.yearly_return >= 0 ? '+' : ''}
                            {stock.yearly_return}%
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex justify-between items-center text-xs">
                  <span className="text-slate-400">ML Risk Tag:</span>
                  {getRiskBadge(leaders[0]?.risk_flag)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Table View */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
        {/* Table Filters Toolbar */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Sector Pill Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              onClick={() => setSelectedSector('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                selectedSector === 'ALL'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              All Sectors ({data.all_stocks?.length || 0})
            </button>
            {sectorList.map(sec => (
              <button
                key={sec}
                onClick={() => setSelectedSector(sec)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedSector === sec
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {sec}
              </button>
            ))}
          </div>

          {/* Search box */}
          <div className="relative shrink-0">
            <span className="material-symbols-outlined text-slate-400 absolute left-3 top-2 text-base">search</span>
            <input
              type="text"
              placeholder="Filter company or ticker..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64"
            />
          </div>
        </div>

        {/* Dense Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400">
              <span className="material-symbols-outlined text-4xl animate-spin text-blue-600 mb-3">sync</span>
              <p className="text-sm font-medium">Fetching real-time Screener metrics from Yahoo Finance...</p>
            </div>
          ) : error ? (
            <div className="py-16 text-center text-rose-500">
              <span className="material-symbols-outlined text-4xl mb-2">error</span>
              <p className="text-sm font-semibold">{error}</p>
              <button
                onClick={fetchSectors}
                className="mt-3 px-4 py-1.5 text-xs font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-600 border border-rose-200 dark:border-rose-800 rounded-lg"
              >
                Retry
              </button>
            </div>
          ) : filteredStocks.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <span className="material-symbols-outlined text-4xl mb-2">search_off</span>
              <p className="text-sm">No stocks matching your criteria.</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 select-none">
                <tr>
                  <th
                    onClick={() => handleSort('name')}
                    className="py-3 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-white"
                  >
                    <div className="flex items-center">
                      Company {renderSortIcon('name')}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('sector')}
                    className="py-3 px-3 cursor-pointer hover:text-slate-900 dark:hover:text-white"
                  >
                    <div className="flex items-center">
                      Sector {renderSortIcon('sector')}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('current_price')}
                    className="py-3 px-3 cursor-pointer text-right hover:text-slate-900 dark:hover:text-white"
                  >
                    <div className="flex items-center justify-end">
                      Market Price {renderSortIcon('current_price')}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('yearly_return')}
                    className="py-3 px-3 cursor-pointer text-right hover:text-slate-900 dark:hover:text-white"
                  >
                    <div className="flex items-center justify-end">
                      1-Year Return % {renderSortIcon('yearly_return')}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('pe_ratio')}
                    className="py-3 px-3 cursor-pointer text-right hover:text-slate-900 dark:hover:text-white"
                  >
                    <div className="flex items-center justify-end">
                      P/E Ratio {renderSortIcon('pe_ratio')}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('market_cap')}
                    className="py-3 px-3 cursor-pointer text-right hover:text-slate-900 dark:hover:text-white"
                  >
                    <div className="flex items-center justify-end">
                      Market Cap {renderSortIcon('market_cap')}
                    </div>
                  </th>
                  <th className="py-3 px-4 text-center">
                    52W Price Channel
                  </th>
                  <th
                    onClick={() => handleSort('risk_flag')}
                    className="py-3 px-4 text-center cursor-pointer hover:text-slate-900 dark:hover:text-white"
                  >
                    <div className="flex items-center justify-center">
                      ML Risk Tag {renderSortIcon('risk_flag')}
                    </div>
                  </th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-xs">
                {filteredStocks.map((stock) => {
                  // Compute 52W position percentage
                  const low = stock.low_52w;
                  const high = stock.high_52w;
                  const curr = stock.current_price;
                  let posPct = 50;
                  if (low && high && high > low && curr) {
                    posPct = Math.min(Math.max(((curr - low) / (high - low)) * 100, 0), 100);
                  }

                  return (
                    <tr
                      key={stock.symbol}
                      className="hover:bg-blue-50/40 dark:hover:bg-slate-800/60 transition-colors group"
                    >
                      {/* Company Name & Symbol */}
                      <td className="py-3.5 px-4 font-sans font-medium text-slate-900 dark:text-white">
                        <Link
                          to={`/search/${stock.symbol}`}
                          className="font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex items-center gap-1.5"
                        >
                          {stock.name}
                          <span className="material-symbols-outlined text-[13px] opacity-0 group-hover:opacity-100 transition-opacity">
                            north_east
                          </span>
                        </Link>
                        <span className="text-[11px] font-mono text-slate-400 block mt-0.5">{stock.symbol}</span>
                      </td>

                      {/* Sector */}
                      <td className="py-3.5 px-3 font-sans">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] font-medium text-slate-700 dark:text-slate-300">
                          {stock.sector}
                        </span>
                      </td>

                      {/* Market Price */}
                      <td className="py-3.5 px-3 text-right font-bold text-slate-900 dark:text-white">
                        {formatINR(stock.current_price)}
                      </td>

                      {/* 1-Year Return % */}
                      <td className="py-3.5 px-3 text-right font-bold">
                        <span
                          className={`inline-flex items-center gap-0.5 ${
                            stock.yearly_return >= 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[14px]">
                            {stock.yearly_return >= 0 ? 'arrow_drop_up' : 'arrow_drop_down'}
                          </span>
                          {stock.yearly_return >= 0 ? '+' : ''}
                          {stock.yearly_return}%
                        </span>
                      </td>

                      {/* P/E Ratio */}
                      <td className="py-3.5 px-3 text-right text-slate-700 dark:text-slate-300">
                        {stock.pe_ratio ? `${stock.pe_ratio}x` : <span className="text-slate-400">N/A</span>}
                      </td>

                      {/* Market Cap */}
                      <td className="py-3.5 px-3 text-right text-slate-700 dark:text-slate-300">
                        {formatMarketCap(stock.market_cap)}
                      </td>

                      {/* 52W Range Bar */}
                      <td className="py-3.5 px-4 font-sans">
                        <div className="w-36 mx-auto">
                          <div className="flex justify-between text-[10px] text-slate-400 font-mono mb-1">
                            <span>₹{Math.round(low || 0)}</span>
                            <span>₹{Math.round(high || 0)}</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full relative overflow-visible">
                            <div
                              className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-blue-600 border border-white dark:border-slate-900 rounded-full shadow-sm"
                              style={{ left: `calc(${posPct}% - 5px)` }}
                              title={`Current: ₹${curr} (${Math.round(posPct)}% of 52W channel)`}
                            />
                          </div>
                        </div>
                      </td>

                      {/* ML Risk Tag */}
                      <td className="py-3.5 px-4 text-center font-sans">
                        {getRiskBadge(stock.risk_flag)}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-3 text-right font-sans">
                        <Link
                          to={`/search/${stock.symbol}`}
                          className="px-2.5 py-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-md transition-colors inline-flex items-center gap-1"
                        >
                          Analyze
                          <span className="material-symbols-outlined text-[12px]">chevron_right</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer info */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-400 flex flex-col sm:flex-row justify-between items-center gap-2">
          <span>
            Data generated at: {data.generated_at || 'Just now'} • Cached for 10 minutes to prevent API rate limits.
          </span>
          <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400 font-medium">
            <span className="material-symbols-outlined text-[14px] text-blue-500">info</span>
            ML Risk Tag is calculated using historical drawdown & volatility thresholds.
          </span>
        </div>
      </div>
    </div>
  );
}
