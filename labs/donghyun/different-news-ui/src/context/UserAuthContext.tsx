
import React, { createContext, useContext, useState, ReactNode } from 'react';

interface User {
  username: string;
}

interface UserAuthContextType {
  user: User | null;
  login: (token: string) => void;
  logout: () => void;
}

const UserAuthContext = createContext<UserAuthContextType | undefined>(undefined);

export const UserAuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  const login = (token: string) => {
    // For now, we'll just store a dummy user. 
    // In a real app, you would decode the token to get user info.
    localStorage.setItem('user_token', token);
    setUser({ username: 'user' }); // Placeholder
  };

  const logout = () => {
    localStorage.removeItem('user_token');
    setUser(null);
  };

  return (
    <UserAuthContext.Provider value={{ user, login, logout }}>
      {children}
    </UserAuthContext.Provider>
  );
};

export const useUserAuth = () => {
  const context = useContext(UserAuthContext);
  if (context === undefined) {
    throw new Error('useUserAuth must be used within a UserAuthProvider');
  }
  return context;
};
