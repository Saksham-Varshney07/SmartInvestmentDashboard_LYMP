import React, { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

// Safe storage helper resilient to Safari Private Browsing & QuotaExceededError
const memoryStore = {};

const safeStorage = {
  getItem: (key) => {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      return memoryStore[key] || null;
    }
  },
  setItem: (key, val) => {
    try {
      localStorage.setItem(key, val);
    } catch (e) {
      memoryStore[key] = val;
    }
  },
  removeItem: (key) => {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      delete memoryStore[key];
    }
  }
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = safeStorage.getItem('currentUser');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  useEffect(() => {
    try {
      if (currentUser) {
        safeStorage.setItem('currentUser', JSON.stringify(currentUser));
      } else {
        safeStorage.removeItem('currentUser');
      }
    } catch (e) {
      console.warn('Unable to persist auth state:', e);
    }
  }, [currentUser]);

  return (
    <AuthContext.Provider value={{ currentUser, setCurrentUser, safeStorage }}>
      {children}
    </AuthContext.Provider>
  );
};
