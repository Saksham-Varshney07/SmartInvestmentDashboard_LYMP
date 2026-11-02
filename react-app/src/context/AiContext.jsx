import React, { createContext, useState } from 'react';

export const AiContext = createContext();

export const AiProvider = ({ children }) => {
  const [aiPageData, setAiPageData] = useState("");
  const [activeStockData, setActiveStockData] = useState(null);
  const [activeStockSymbol, setActiveStockSymbol] = useState("");

  return (
    <AiContext.Provider value={{ 
      aiPageData, 
      setAiPageData,
      activeStockData,
      setActiveStockData,
      activeStockSymbol,
      setActiveStockSymbol
    }}>
      {children}
    </AiContext.Provider>
  );
};
