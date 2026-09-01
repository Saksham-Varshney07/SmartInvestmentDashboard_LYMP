import React, { createContext, useState } from 'react';

export const AiContext = createContext();

export const AiProvider = ({ children }) => {
  const [aiPageData, setAiPageData] = useState("");

  return (
    <AiContext.Provider value={{ aiPageData, setAiPageData }}>
      {children}
    </AiContext.Provider>
  );
};
