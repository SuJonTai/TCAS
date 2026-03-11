import React, { createContext, useState, useContext, useEffect } from 'react';

const DatabaseContext = createContext();

export function DatabaseProvider({ children }) {
  // Load saved preference from localStorage or default to 'supabase'
  const [dbType, setDbType] = useState(() => {
    return localStorage.getItem('preferred_db') || 'supabase';
  });

  // Whenever the dbType changes, save it to localStorage
  useEffect(() => {
    localStorage.setItem('preferred_db', dbType);
  }, [dbType]);

  return (
    <DatabaseContext.Provider value={{ dbType, setDbType }}>
      {children}
    </DatabaseContext.Provider>
  );
}

// Custom hook for easy access
export function useDatabase() {
  return useContext(DatabaseContext);
}