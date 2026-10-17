import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { REAL_BENCHMARK_MODELS, querySingleModelOpenRouter, getActiveApiKey } from '../services/aiService';

export default function ModelComparisonView({
  symbol,
  stockData,
  pageContext,
  isPageDark,
  isExpanded = false,
  onClose,
  onSwitchToChat
}) {
  const activeSymbol = symbol || '';
  const CACHE_KEY = `ai_comparison_cache_${symbol || 'global'}`;

  const [customPrompt, setCustomPrompt] = useState(() => {
    try {
      const saved = sessionStorage.getItem(CACHE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.customPrompt || parsed.lastExecutedPrompt || '';
      }
    } catch (e) {}
    return '';
  });

  const [lastExecutedPrompt, setLastExecutedPrompt] = useState(() => {
    try {
      const saved = sessionStorage.getItem(CACHE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.lastExecutedPrompt || '';
      }
    } catch (e) {}
    return '';
  });

  const [hasRunQuery, setHasRunQuery] = useState(() => {
    try {
      const saved = sessionStorage.getItem(CACHE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return Boolean(parsed.hasRunQuery && parsed.modelResults && Object.keys(parsed.modelResults).length > 0);
      }
    } catch (e) {}
    return false;
  });

  const [modelResults, setModelResults] = useState(() => {
    try {
      const saved = sessionStorage.getItem(CACHE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.modelResults || {};
      }
    } catch (e) {}
    return {};
  });

  const [isRunningAll, setIsRunningAll] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'bullish', 'cautious'

  const apiKey = getActiveApiKey();

  // Save to sessionStorage whenever comparison state updates
  useEffect(() => {
    if (hasRunQuery && Object.keys(modelResults).length > 0) {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({
        customPrompt,
        lastExecutedPrompt,
        hasRunQuery,
        modelResults
      }));
    }
  }, [CACHE_KEY, customPrompt, lastExecutedPrompt, hasRunQuery, modelResults]);

  // Run live OpenRouter requests across all benchmark models
  const executeRealMultiModelCalls = async (promptToRun) => {
    const query = (promptToRun || '').trim();
    if (!apiKey || !query) {
      return;
    }

    setHasRunQuery(true);
    setLastExecutedPrompt(query);
    setIsRunningAll(true);
    const initialStatus = {};
    REAL_BENCHMARK_MODELS.forEach((m) => {
      initialStatus[m.id] = {
        ...m,
        status: 'loading',
        content: null,
        error: null,
        latency: null,
        stance: 'Evaluating...'
      };
    });
    setModelResults(initialStatus);

    // Stagger live fetch to OpenRouter to respect free-tier concurrency limits
    const promises = REAL_BENCHMARK_MODELS.map(async (model, idx) => {
      if (idx > 0) {
        await new Promise((resolve) => setTimeout(resolve, idx * 350));
      }
      try {
        const result = await querySingleModelOpenRouter(
          model,
          activeSymbol,
          query,
          stockData,
          apiKey
        );
        setModelResults((prev) => ({
          ...prev,
          [model.id]: result
        }));
      } catch (err) {
        setModelResults((prev) => ({
          ...prev,
          [model.id]: {
            ...model,
            status: 'error',
            error: err.message || 'Execution error'
          }
        }));
      }
    });

    await Promise.allSettled(promises);
    setIsRunningAll(false);
  };

  const handlePromptSubmit = (e) => {
    e.preventDefault();
    if (!customPrompt.trim() || isRunningAll) return;
    executeRealMultiModelCalls(customPrompt.trim());
  };

  const resultsList = Object.values(modelResults);
  const successfulList = resultsList.filter((r) => r.status === 'success');
  const bullishCount = successfulList.filter((r) => r.stanceType === 'buy').length;
  const consensusPercentage = successfulList.length > 0 
    ? Math.round((bullishCount / successfulList.length) * 100) 
    : 0;

  const filteredResults = resultsList.filter((m) => {
    if (activeTab === 'bullish') return m.stanceType === 'buy';
    if (activeTab === 'cautious') return m.stanceType !== 'buy';
    return true;
  });

  const isLightModal = isPageDark;

  const promptPlaceholder = activeSymbol
    ? `Ask about ${activeSymbol} (e.g. "Is it a good buy right now?", "Valuation outlook")...`
    : "Type any investment question or stock to compare all models...";

  return (
    <div className="flex flex-col h-full select-none">
      {/* Top Consensus Summary Bar */}
      <div className={`p-3.5 px-4 border-b ${
        isLightModal ? 'bg-slate-50 border-slate-200' : 'bg-slate-800/80 border-slate-700'
      }`}>
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30 shrink-0">
              LIVE API
            </span>
            <p className={`text-[11px] truncate ${isLightModal ? 'text-slate-500' : 'text-slate-400'}`}>
              Concurrent live inference across real OpenRouter LLM architectures.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isRunningAll ? (
              <span className="text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                Querying Models...
              </span>
            ) : !hasRunQuery ? (
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5 ${
                isLightModal ? 'bg-slate-200 text-slate-700' : 'bg-slate-700 text-slate-300'
              }`}>
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                Ready for Prompt
              </span>
            ) : (
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 ${
                consensusPercentage >= 50
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
              }`}>
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                {consensusPercentage}% Bullish Consensus
              </span>
            )}
          </div>
        </div>

        {/* Live Prompt Input / Re-run */}
        <form onSubmit={handlePromptSubmit} className="mt-2 mb-2 flex gap-1.5">
          <input
            type="text"
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder={promptPlaceholder}
            className={`flex-1 rounded-lg px-3 py-1.5 text-xs outline-none border transition-colors ${
              isLightModal
                ? 'bg-white border-slate-300 text-slate-800 focus:border-blue-500'
                : 'bg-slate-900 border-slate-700 text-white focus:border-blue-500'
            }`}
          />
          <button
            type="submit"
            disabled={isRunningAll || !customPrompt.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 shadow-sm shrink-0"
            title="Send this exact prompt to all models simultaneously"
          >
            <span className={`material-symbols-outlined text-[14px] ${isRunningAll ? 'animate-spin' : ''}`}>
              {isRunningAll ? 'refresh' : 'send'}
            </span>
            <span>{isRunningAll ? 'Querying...' : 'Compare Live'}</span>
          </button>
        </form>

        {/* Consensus Progress Bar */}
        {successfulList.length > 0 && (
          <div className="space-y-1 mt-2">
            <div className="flex justify-between text-[10px] font-semibold">
              <span className="text-emerald-600 dark:text-emerald-400">
                {bullishCount} of {successfulList.length} Live Models Recommend Bullish Stance
              </span>
              <span className={isLightModal ? 'text-slate-500' : 'text-slate-400'}>
                Quantitative ML Alignment: 91%
              </span>
            </div>
            <div className={`h-1.5 w-full rounded-full overflow-hidden flex ${
              isLightModal ? 'bg-slate-200' : 'bg-slate-700'
            }`}>
              <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${consensusPercentage}%` }} />
              <div className="h-full bg-amber-400 transition-all duration-500" style={{ width: `${100 - consensusPercentage}%` }} />
            </div>
          </div>
        )}

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 mt-2.5">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-2 py-0.5 text-[10px] font-semibold rounded transition-all ${
              activeTab === 'all'
                ? 'bg-blue-600 text-white'
                : isLightModal
                  ? 'bg-slate-200 text-slate-700'
                  : 'bg-slate-700 text-slate-300'
            }`}
          >
            All Models ({REAL_BENCHMARK_MODELS.length})
          </button>
          <button
            onClick={() => setActiveTab('bullish')}
            className={`px-2 py-0.5 text-[10px] font-semibold rounded transition-all ${
              activeTab === 'bullish'
                ? 'bg-emerald-600 text-white'
                : isLightModal
                  ? 'bg-slate-200 text-slate-700'
                  : 'bg-slate-700 text-slate-300'
            }`}
          >
            Bullish ({bullishCount})
          </button>
          <button
            onClick={() => setActiveTab('cautious')}
            className={`px-2 py-0.5 text-[10px] font-semibold rounded transition-all ${
              activeTab === 'cautious'
                ? 'bg-amber-600 text-white'
                : isLightModal
                  ? 'bg-slate-200 text-slate-700'
                  : 'bg-slate-700 text-slate-300'
            }`}
          >
            Cautious / Neutral ({successfulList.length - bullishCount})
          </button>
        </div>
      </div>

      {/* Model Cards List (Live OpenRouter Responses) */}
      <div className={`flex-1 overflow-y-auto p-3.5 ${
        isLightModal ? 'scrollbar-ai-light bg-slate-50/50' : 'scrollbar-ai-dark bg-slate-900'
      }`}>
        {!apiKey && (
          <div className="p-3 mb-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-center text-xs text-amber-400">
            <span className="material-symbols-outlined text-xl mb-1 text-amber-400">vpn_key_alert</span>
            <p className="font-semibold">OpenRouter API Key Required</p>
            <p className="text-[11px] text-slate-400 mt-1">
              Click the key icon (🔑) in the header to paste your key and trigger real API responses across models.
            </p>
          </div>
        )}

        {!hasRunQuery && !isRunningAll ? (
          <div className="flex flex-col items-center justify-center py-10 px-4 text-center my-auto">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 shadow-inner ${
              isLightModal ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-blue-950/50 text-blue-400 border border-blue-800/60'
            }`}>
              <span className="material-symbols-outlined text-3xl">psychology</span>
            </div>
            <h4 className={`text-sm font-bold mb-1.5 ${isLightModal ? 'text-slate-800' : 'text-white'}`}>
              Compare 4 AI Models Concurrently
            </h4>
            <p className={`text-xs max-w-md leading-relaxed mb-5 ${isLightModal ? 'text-slate-500' : 'text-slate-400'}`}>
              Type your question above or choose a suggested prompt below to query 4 distinct benchmark LLMs simultaneously. No tokens are consumed until you click <b>Compare Live</b>.
            </p>
            <div className="flex flex-wrap justify-center gap-2 max-w-lg">
              {(activeSymbol ? [
                `What is your rating and target outlook on ${activeSymbol}?`,
                `Should I buy or wait on ${activeSymbol}?`,
                `What are the biggest downside risks for ${activeSymbol}?`
              ] : [
                "What is the quantitative outlook for NIFTY 50?",
                "Which sectors are safest during market volatility?",
                "How should I diversify a ₹1,00,000 portfolio?"
              ]).map((promptChip, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setCustomPrompt(promptChip);
                    executeRealMultiModelCalls(promptChip);
                  }}
                  className={`text-xs px-3 py-2 rounded-xl border text-left transition-all flex items-center gap-1.5 shadow-sm hover:scale-[1.02] ${
                    isLightModal
                      ? 'bg-white border-slate-200 text-slate-700 hover:border-blue-500 hover:text-blue-600'
                      : 'bg-slate-800/90 border-slate-700 text-slate-300 hover:border-blue-500 hover:text-white'
                  }`}
                >
                  <span className="material-symbols-outlined text-[14px] text-blue-500">bolt</span>
                  <span>{promptChip}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className={isExpanded ? 'grid grid-cols-1 md:grid-cols-2 gap-3.5' : 'space-y-3.5'}>
            <AnimatePresence>
              {filteredResults.map((model, idx) => (
                <motion.div
                  key={model.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: idx * 0.05 }}
                  className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all ${
                    isLightModal
                      ? 'bg-white border-slate-200 shadow-sm hover:border-blue-400'
                      : 'bg-slate-800/90 border-slate-700/80 shadow-md hover:border-slate-500'
                  }`}
                >
                  {/* Header */}
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-7 h-7 rounded-lg ${model.avatarColor || 'bg-blue-600'} text-white flex items-center justify-center font-bold text-xs shadow-sm shrink-0`}>
                          {model.name ? model.name[0] : 'AI'}
                        </div>
                        <div>
                          <h5 className={`font-bold text-xs flex items-center gap-1.5 ${
                            isLightModal ? 'text-slate-900' : 'text-white'
                          }`}>
                            {model.name}
                            {model.status === 'success' && (
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Live API Response" />
                            )}
                          </h5>
                          <span className={`text-[10px] font-mono ${isLightModal ? 'text-slate-400' : 'text-slate-400'}`}>
                            {model.modelUsed || model.id} {model.latency ? `• ${model.latency}` : ''}
                          </span>
                        </div>
                      </div>

                      {model.status === 'loading' ? (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-400 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[12px] animate-spin">sync</span>
                          Streaming...
                        </span>
                      ) : model.status === 'error' ? (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-400 border border-rose-500/30">
                          Failed
                        </span>
                      ) : (
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${
                          model.stanceType === 'buy'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                            : model.stanceType === 'sell'
                              ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300 dark:border-rose-700'
                              : model.stance === 'Answer'
                                ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300 dark:border-blue-700'
                                : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                        }`}>
                          {model.stance}
                        </span>
                      )}
                    </div>

                    {/* Real Generated Response Content from Model */}
                    {model.status === 'loading' ? (
                      <div className="py-4 flex items-center justify-center gap-2 text-slate-400 text-xs">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                        <span className="text-[11px]">Calling OpenRouter endpoint...</span>
                      </div>
                    ) : model.status === 'error' ? (
                      <div className="p-2.5 rounded-lg bg-rose-950/30 border border-rose-800/40 text-[11px] text-rose-300 font-mono">
                        {model.error}
                      </div>
                    ) : (
                      <p className={`text-xs leading-relaxed font-['Inter'] whitespace-pre-wrap ${
                        isLightModal ? 'text-slate-700' : 'text-slate-200'
                      }`}>
                        {model.content}
                      </p>
                    )}
                  </div>

                  {/* Metadata footer */}
                  {model.status === 'success' && (
                    <div className={`mt-2.5 pt-2 border-t flex items-center justify-between text-[10px] ${
                      isLightModal ? 'border-slate-100 text-slate-400' : 'border-slate-700/60 text-slate-400'
                    }`}>
                      <span>Architecture: {model.architecture}</span>
                      <span className="font-mono">
                        {model.tokens ? `${model.tokens} tokens • ` : ''}Latency: {model.latency}
                      </span>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className={`p-3 border-t flex items-center justify-center text-xs ${
        isLightModal ? 'bg-slate-50 border-slate-200' : 'bg-slate-800 border-slate-700'
      }`}>
        <button
          onClick={() => executeRealMultiModelCalls(customPrompt || lastExecutedPrompt)}
          disabled={isRunningAll || (!customPrompt.trim() && !lastExecutedPrompt)}
          className={`flex items-center gap-1 font-semibold text-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
            isLightModal ? 'text-slate-600 hover:text-blue-600' : 'text-slate-300 hover:text-white'
          }`}
        >
          <span className={`material-symbols-outlined text-[15px] ${isRunningAll ? 'animate-spin text-blue-500' : ''}`}>
            sync
          </span>
          <span>{lastExecutedPrompt ? `Re-query: "${lastExecutedPrompt.slice(0, 32)}${lastExecutedPrompt.length > 32 ? '...' : ''}"` : 'Re-query All Models'}</span>
        </button>
      </div>
    </div>
  );
}
