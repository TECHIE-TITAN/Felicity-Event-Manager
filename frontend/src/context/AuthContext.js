import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('felicity_user')); } catch { return null; }
  });
  const [token, setToken] = useState(() => localStorage.getItem('felicity_token'));

  const login = (userData, tokenData) => {
    setUser(userData);
    setToken(tokenData);
    localStorage.setItem('felicity_user', JSON.stringify(userData));
    localStorage.setItem('felicity_token', tokenData);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('felicity_user');
    localStorage.removeItem('felicity_token');
  };

  const isAuthenticated = !!token;

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
