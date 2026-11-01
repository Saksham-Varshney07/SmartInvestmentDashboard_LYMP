import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { askAiChat } from '../services/aiService';
import ModelComparisonView from './ModelComparisonView';

export default function AskAiModal({ symbol, stockData, pageContext, livePageData, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState('chat'); // 'chat' or 'compare'
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [customKey, setCustomKey] = useState(() => {
    return localStorage.getItem('openRouterApiKey') || '';
  });
  const [hasApiKey, setHasApiKey] = useState(() => {
    return Boolean(
      (import.meta.env.VITE_OPENROUTER_API_KEY && import.meta.env.VITE_OPENROUTER_API_KEY !== 'your_openrouter_api_key_here') ||
      localStorage.getItem('openRouterApiKey')
    );
  });

  // Track parent website dark/light mode for inverted contrast styling:
  // When website is White (light), assistant is Dark
  // When website is Dark, assistant is White
  const [isPageDark, setIsPageDark] = useState(() => {
    return document.documentElement.classList.contains('dark');
  });

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsPageDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const isLightModal = isPageDark; // Inverted theme logic requested by user

  const messagesEndRef = useRef(null);

  const saveApiKey = (e) => {
    e.preventDefault();
    if (customKey.trim()) {
      localStorage.setItem('openRouterApiKey', customKey.trim());
      setHasApiKey(true);
      setShowKeyInput(false);
    } else {
      localStorage.removeItem('openRouterApiKey');
      setHasApiKey(Boolean(import.meta.env.VITE_OPENROUTER_API_KEY && import.meta.env.VITE_OPENROUTER_API_KEY !== 'your_openrouter_api_key_here'));
      setShowKeyInput(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (viewMode === 'chat') {
      scrollToBottom();
    }
  }, [messages, isLoading, viewMode]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    const answer = await askAiChat(symbol, newMessages, stockData, pageContext, livePageData);

    setMessages([...newMessages, { role: 'assistant', content: answer }]);
    setIsLoading(false);
  };

  const [isExpanded, setIsExpanded] = useState(false);

  // Dynamic window dimensions & positioning
  const [dimensions, setDimensions] = useState(() => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
    const defaultW = isMobile ? Math.min(390, window.innerWidth - 32) : 420;
    const defaultH = 540;
    return {
      width: defaultW,
      height: defaultH,
      right: 24,
      bottom: 96
    };
  });

  const [isResizing, setIsResizing] = useState(false);
  const [activeCursor, setActiveCursor] = useState('');

  // Auto-clamp dimensions if the browser window shrinks
  useEffect(() => {
    const handleWindowResize = () => {
      setDimensions(prev => {
        const maxW = Math.max(340, window.innerWidth - 32);
        const maxH = Math.max(340, window.innerHeight - 32);
        const nextW = Math.min(prev.width, maxW);
        const nextH = Math.min(prev.height, maxH);
        const nextR = Math.min(prev.right, Math.max(16, window.innerWidth - nextW - 16));
        const nextB = Math.min(prev.bottom, Math.max(16, window.innerHeight - nextH - 16));
        return {
          width: nextW,
          height: nextH,
          right: Math.max(16, nextR),
          bottom: Math.max(16, nextB)
        };
      });
    };
    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  }, []);

  // Universal 8-direction smooth resize handler
  const startResize = (direction, e) => {
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const startY = e.clientY;
    const startW = dimensions.width;
    const startH = dimensions.height;
    const startR = dimensions.right;
    const startB = dimensions.bottom;

    const cursorMap = {
      n: 'ns-resize',
      s: 'ns-resize',
      e: 'ew-resize',
      w: 'ew-resize',
      nw: 'nwse-resize',
      ne: 'nesw-resize',
      sw: 'nesw-resize',
      se: 'nwse-resize',
    };

    const cursor = cursorMap[direction] || 'default';
    setActiveCursor(cursor);
    setIsResizing(true);

    const onPointerMove = (moveEvent) => {
      moveEvent.preventDefault();
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;

      const viewportW = window.innerWidth;
      const viewportH = window.innerHeight;
      const margin = 16;
      const minW = 360;
      const minH = 340;

      // Viewport bounds of window
      const rectLeft = viewportW - startR - startW;
      const rectRight = viewportW - startR;
      const rectTop = viewportH - startB - startH;
      const rectBottom = viewportH - startB;

      let newRectLeft = rectLeft;
      let newRectRight = rectRight;
      let newRectTop = rectTop;
      let newRectBottom = rectBottom;

      if (direction.includes('w')) {
        newRectLeft = Math.max(margin, Math.min(rectLeft + deltaX, rectRight - minW));
      }
      if (direction.includes('e')) {
        newRectRight = Math.min(viewportW - margin, Math.max(rectRight + deltaX, rectLeft + minW));
      }
      if (direction.includes('n')) {
        newRectTop = Math.max(margin, Math.min(rectTop + deltaY, rectBottom - minH));
      }
      if (direction.includes('s')) {
        newRectBottom = Math.min(viewportH - margin, Math.max(rectBottom + deltaY, rectTop + minH));
      }

      const nextW = Math.round(newRectRight - newRectLeft);
      const nextH = Math.round(newRectBottom - newRectTop);
      const nextR = Math.round(viewportW - newRectRight);
      const nextB = Math.round(viewportH - newRectBottom);

      setDimensions({
        width: nextW,
        height: nextH,
        right: Math.max(0, nextR),
        bottom: Math.max(0, nextB),
      });
    };

    const onPointerUp = () => {
      setIsResizing(false);
      setActiveCursor('');
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  const openComparisonView = () => {
    setViewMode('compare');
    setIsExpanded(true);
    setDimensions(prev => ({
      ...prev,
      width: Math.min(840, window.innerWidth - 32),
      height: Math.min(600, window.innerHeight - 48),
      right: 24,
      bottom: 32
    }));
  };

  const titleText = symbol ? `Ask AI about ${symbol}` : 'Ask AInvestor';
  const welcomeText = symbol
    ? `Ask anything about ${symbol}. I can analyze real-time market data or compare viewpoints across multiple AI models.`
    : 'Ask me anything about your portfolio, risk analysis, or compare recommendations across multiple AI architectures!';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.95 }}
        style={{
          width: `${dimensions.width}px`,
          height: `${dimensions.height}px`,
          right: `${dimensions.right}px`,
          bottom: `${dimensions.bottom}px`,
          maxWidth: 'calc(100vw - 2rem)',
          maxHeight: 'calc(100vh - 2rem)',
        }}
        className={`fixed shadow-2xl rounded-2xl overflow-hidden z-50 flex flex-col border ${isResizing ? 'select-none transition-none' : 'transition-[box-shadow,border-color] duration-200'
          } ${isLightModal
            ? 'bg-white border-slate-200/90 text-slate-800 shadow-[0_20px_50px_rgba(0,0,0,0.15)]'
            : 'bg-slate-900 border-slate-700/80 text-white shadow-[0_20px_50px_rgba(0,0,0,0.6)]'
          }`}
      >
        {/* Full-screen drag overlay while resizing to guarantee zero mouse-capture hindrance */}
        {isResizing && (
          <div
            className="fixed inset-0 z-[9999]"
            style={{ cursor: activeCursor, userSelect: 'none' }}
          />
        )}

        {/* --- Multi-Directional Resize Handles --- */}
        {/* Top Edge */}
        <div
          onPointerDown={(e) => startResize('n', e)}
          className="absolute top-0 left-3 right-3 h-2 cursor-ns-resize z-20 hover:bg-blue-500/25 active:bg-blue-500/40 transition-colors"
          title="Drag to resize height"
        />
        {/* Bottom Edge */}
        <div
          onPointerDown={(e) => startResize('s', e)}
          className="absolute bottom-0 left-3 right-3 h-2 cursor-ns-resize z-20 hover:bg-blue-500/25 active:bg-blue-500/40 transition-colors"
          title="Drag to resize height"
        />
        {/* Left Edge */}
        <div
          onPointerDown={(e) => startResize('w', e)}
          className="absolute left-0 top-3 bottom-3 w-2 cursor-ew-resize z-20 hover:bg-blue-500/25 active:bg-blue-500/40 transition-colors"
          title="Drag to resize width"
        />
        {/* Right Edge */}
        <div
          onPointerDown={(e) => startResize('e', e)}
          className="absolute right-0 top-3 bottom-3 w-2 cursor-ew-resize z-20 hover:bg-blue-500/25 active:bg-blue-500/40 transition-colors"
          title="Drag to resize width"
        />
        {/* Top-Left Corner */}
        <div
          onPointerDown={(e) => startResize('nw', e)}
          className="absolute top-0 left-0 w-3.5 h-3.5 cursor-nwse-resize z-20 rounded-tl-2xl hover:bg-blue-500/30 active:bg-blue-500/50 transition-colors"
          title="Drag to resize"
        />
        {/* Top-Right Corner */}
        <div
          onPointerDown={(e) => startResize('ne', e)}
          className="absolute top-0 right-0 w-3.5 h-3.5 cursor-nesw-resize z-20 rounded-tr-2xl hover:bg-blue-500/30 active:bg-blue-500/50 transition-colors"
          title="Drag to resize"
        />
        {/* Bottom-Left Corner */}
        <div
          onPointerDown={(e) => startResize('sw', e)}
          className="absolute bottom-0 left-0 w-3.5 h-3.5 cursor-nesw-resize z-20 rounded-bl-2xl hover:bg-blue-500/30 active:bg-blue-500/50 transition-colors"
          title="Drag to resize"
        />
        {/* Bottom-Right Corner with Grip Dots */}
        <div
          onPointerDown={(e) => startResize('se', e)}
          className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize z-20 rounded-br-2xl hover:bg-blue-500/30 active:bg-blue-500/50 transition-colors flex items-end justify-end p-0.5"
          title="Drag to resize"
        >
          <svg className="w-2.5 h-2.5 text-slate-400 opacity-60 pointer-events-none" viewBox="0 0 6 6" fill="currentColor">
            <circle cx="5" cy="5" r="0.75" />
            <circle cx="5" cy="2.5" r="0.75" />
            <circle cx="2.5" cy="5" r="0.75" />
          </svg>
        </div>

        {/* Header */}
              ? 'bg-slate-50 border-slate-200'
              : 'bg-slate-800/95 border-slate-700'
            }`}>
              <div className="flex items-center gap-2 min-w-0 relative z-30">
                {viewMode === 'compare' ? (
                  <button
                    onClick={() => setViewMode('chat')}
                    className={`px-2 py-1 rounded-lg flex items-center gap-1 text-xs font-semibold transition-all border shrink-0 ${isLightModal
                        ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-blue-600 shadow-sm'
                        : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 hover:text-white'
                      }`}
                    title="Back to Chat"
                  >
                    <span className="material-symbols-outlined text-[15px]">arrow_back</span>
                    <span>Back</span>
                  </button>
                ) : (
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isLightModal ? 'bg-blue-100 text-blue-600' : 'bg-blue-500/20 text-blue-400'
                    }`}>
                    <span className="material-symbols-outlined text-lg">smart_toy</span>
                  </div>
                )}

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className={`font-bold text-xs sm:text-sm tracking-tight truncate ${isLightModal ? 'text-slate-900' : 'text-white'}`}>
                      {viewMode === 'compare' ? `Real Multi-Model AI Comparison • ${symbol || 'Market'}` : titleText}
                    </h3>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <span className={`w-1.5 h-1.5 rounded-full ${hasApiKey ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                    <span className={`truncate ${isLightModal ? 'text-slate-500' : 'text-slate-400'}`}>
                      {hasApiKey ? 'OpenRouter LLM Active' : 'Offline Smart Assistant'}
                    </span>
                  </div>
                </div>
              </div>

                <div className="flex items-center gap-1 shrink-0 ml-2 relative z-30">
                  {/* Expand / Double Width Button beside Globe */}
                  <button
                    onClick={() => {
                      const nextExpanded = !isExpanded;
                      setIsExpanded(nextExpanded);
                      if (nextExpanded) {
                        setDimensions(prev => ({
                          ...prev,
                          width: Math.min(840, window.innerWidth - 32),
                          height: Math.min(600, window.innerHeight - 48),
                          right: 24,
                          bottom: 32
                        }));
                      } else {
                        setDimensions(prev => ({
                          ...prev,
                          width: Math.min(420, window.innerWidth - 32),
                          height: Math.min(540, window.innerHeight - 48),
                          right: 24,
                          bottom: 96
                        }));
                      }
                    }}
                    className={`p-1.5 rounded-lg transition-all flex items-center justify-center ${isExpanded
                        ? 'bg-blue-600 text-white shadow-sm'
                        : isLightModal
                          ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                          : 'text-slate-400 hover:text-white hover:bg-slate-700'
                      }`}
                    title={isExpanded ? 'Restore compact window' : 'Expand window width & height'}
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {isExpanded ? 'close_fullscreen' : 'open_in_full'}
                    </span>
                  </button>

                  {/* Globe: Multi-Model AI Comparison Toggle */}
                  <button
                    onClick={() => {
                      if (viewMode === 'compare') {
                        setViewMode('chat');
                      } else {
                        openComparisonView();
                      }
                    }}
                    className={`p-1.5 rounded-lg transition-all flex items-center gap-1 text-xs font-semibold ${viewMode === 'compare'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : isLightModal
                          ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                          : 'text-slate-400 hover:text-white hover:bg-slate-700'
                      }`}
                    title="Real Multi-Model AI Comparison"
                  >
                    <span className="material-symbols-outlined text-[18px]">public</span>
                  </button>

                  {/* Key: OpenRouter API Key Config */}
                  <button
                    onClick={() => setShowKeyInput(!showKeyInput)}
                    className={`p-1.5 rounded-lg transition-colors ${showKeyInput
                        ? 'bg-blue-600 text-white'
                        : isLightModal
                          ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                          : 'text-slate-400 hover:text-white hover:bg-slate-700'
                      }`}
                    title="Configure OpenRouter API Key"
                  >
                    <span className="material-symbols-outlined text-[18px]">key</span>
                  </button>

                  {/* Close Modal */}
                  <button
                    onClick={onClose}
                    className={`p-1.5 rounded-lg transition-colors ${isLightModal
                        ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/70'
                        : 'text-slate-400 hover:text-white hover:bg-slate-700'
                      }`}
                    title="Close Assistant"
                  >
                    <span className="material-symbols-outlined text-[18px]">close</span>
                  </button>
                </div>
              </div>

              {/* API Key Configuration Dropdown */}
              {showKeyInput && (
                <div className={`p-3 text-xs border-b animate-[fadeIn_0.15s_ease-in-out] ${isLightModal ? 'bg-slate-100/90 border-slate-200' : 'bg-slate-800/95 border-slate-700'
                  }`}>
                  <p className={`font-semibold mb-1.5 ${isLightModal ? 'text-slate-800' : 'text-slate-200'}`}>
                    OpenRouter API Key:
                  </p>
                  <form onSubmit={saveApiKey} className="flex gap-2">
                    <input
                      type="password"
                      placeholder="sk-or-v1-..."
                      value={customKey}
                      onChange={(e) => setCustomKey(e.target.value)}
                      className={`flex-1 rounded px-2.5 py-1 text-xs font-mono outline-none border focus:ring-1 focus:ring-blue-500 ${isLightModal
                          ? 'bg-white border-slate-300 text-slate-800 placeholder-slate-400'
                          : 'bg-slate-900 border-slate-600 text-slate-200 placeholder-slate-500'
                        }`}
                    />
                    <button
                      type="submit"
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded font-semibold text-xs transition-colors"
                    >
                      Save
                    </button>
                  </form>
                  <p className={`text-[10px] mt-1.5 ${isLightModal ? 'text-slate-500' : 'text-slate-400'}`}>
                    Stored locally in browser. Free keys at <a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer" className="text-blue-500 underline font-medium">openrouter.ai</a>.
                  </p>
                </div>
              )}

              {/* Dynamic View: Model Comparison and Chat Area kept mounted to retain conversation and streaming state */}
              <div className={`flex-1 flex flex-col min-h-0 ${viewMode === 'compare' ? 'flex' : 'hidden'}`}>
                <ModelComparisonView
                  symbol={symbol}
                  stockData={stockData}
                  pageContext={pageContext}
                  isPageDark={isPageDark}
                  isExpanded={isExpanded || dimensions.width >= 640}
                  onClose={onClose}
                  onSwitchToChat={() => setViewMode('chat')}
                />
              </div>

              <div className={`flex-1 flex flex-col min-h-0 ${viewMode === 'chat' ? 'flex' : 'hidden'}`}>
                {/* Chat Messages Area with Custom Light Blue Scrollbar */}
                <div className={`flex-1 overflow-y-auto p-4 space-y-4 ${isLightModal
                    ? 'bg-slate-50/70 scrollbar-ai-light'
                    : 'bg-slate-900 scrollbar-ai-dark'
                  }`}>
                  {messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center px-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3 ${isLightModal ? 'bg-blue-50 text-blue-600' : 'bg-slate-800 text-blue-400'
                        }`}>
                        <span className="material-symbols-outlined text-2xl">forum</span>
                      </div>
                      <p className={`text-xs leading-relaxed max-w-[280px] mb-4 ${isLightModal ? 'text-slate-500' : 'text-slate-400'
                        }`}>
                        {welcomeText}
                      </p>

                      {/* Multi-Model Suggestion Chip */}
                      <button
                        onClick={openComparisonView}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${isLightModal
                            ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                            : 'bg-blue-950/60 text-blue-300 border-blue-800/80 hover:bg-blue-900/60'
                          }`}
                      >
                        <span className="material-symbols-outlined text-[15px] text-blue-500">public</span>
                        Compare 5 AI Models on {symbol || 'Current Page'}
                      </button>
                    </div>
                  )}

                  {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${msg.role === 'user'
                          ? 'bg-blue-600 text-white rounded-br-none'
                          : isLightModal
                            ? 'bg-white text-slate-800 border border-slate-200/90 rounded-bl-none shadow-sm'
                            : 'bg-slate-800 text-slate-200 border border-slate-700/80 rounded-bl-none'
                        }`}>
                        <p className="whitespace-pre-wrap text-xs sm:text-sm leading-relaxed font-['Inter']">
                          {msg.content}
                        </p>
                        {msg.role === 'assistant' && (
                          <div className="mt-2 pt-2 border-t border-slate-200/40 dark:border-slate-700/50 flex justify-end">
                            <button
                              onClick={openComparisonView}
                              className="text-[10px] text-blue-500 hover:underline flex items-center gap-1 font-semibold"
                            >
                              <span className="material-symbols-outlined text-[12px]">public</span>
                              Compare other AI models
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {isLoading && (
                    <div className="flex justify-start">
                      <div className={`rounded-2xl rounded-bl-none px-4 py-3 flex items-center gap-2 border shadow-sm ${isLightModal
                          ? 'bg-white border-slate-200 text-slate-600'
                          : 'bg-slate-800 border-slate-700 text-slate-300'
                        }`}>
                        <div className="flex gap-1">
                          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                        <span className="text-xs">Analyzing financial metrics...</span>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className={`p-3 border-t transition-colors ${isLightModal ? 'bg-white border-slate-200' : 'bg-slate-800/95 border-slate-700'
                  }`}>
                  <form onSubmit={handleSend} className="flex gap-2">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Ask about this stock or market..."
                      className={`flex-1 rounded-xl px-4 py-2 text-xs sm:text-sm outline-none border transition-colors ${isLightModal
                          ? 'bg-slate-100 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:bg-white'
                          : 'bg-slate-900 border-slate-700 text-white placeholder-slate-400 focus:border-blue-500'
                        }`}
                      disabled={isLoading}
                    />
                    <button
                      type="submit"
                      disabled={isLoading || !input.trim()}
                      className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white p-2 rounded-xl transition-colors flex items-center justify-center w-10 h-10 shadow-sm shrink-0"
                      title="Send Message"
                    >
                      <span className="material-symbols-outlined text-[20px]">send</span>
                    </button>
                  </form>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
  );
}
