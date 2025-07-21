// src/providers/MockAuthProvider.tsx
import React, { createContext, useContext, useState } from 'react';

type Role = 'admin' | 'therapist' | 'customer';

interface AuthUser {
  uid: string;
  email: string;
  role: Role;
}

interface AuthContextType {
  user: AuthUser | null;
  role: Role | null;
  loading: boolean;
  loginAs: (role: Role) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  loading: false,
  loginAs: () => {},
  logout: () => {},
});

export const MockAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);

  const loginAs = (role: Role) => {
    const fakeUser: AuthUser = {
      uid: 'mock-uid',
      email: `${role}@test.com`,
      role,
    };
    setUser(fakeUser);
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || null,
        loading: false,
        loginAs,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);