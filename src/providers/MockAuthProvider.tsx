// src/providers/MockAuthProvider.tsx
// DEV ONLY — mock authentication for local testing

import React, { createContext, useContext, useState } from "react";

interface MockUser {
  uid: string;
  displayName: string;
  role: string;
}

interface MockAuthContextValue {
  user: MockUser | null;
  loginAs: (role: string, displayName?: string) => void;
  logout: () => void;
}

const MockAuthContext = createContext<MockAuthContextValue>({
  user: null,
  loginAs: () => {},
  logout: () => {},
});

export function useAuth(): MockAuthContextValue {
  return useContext(MockAuthContext);
}

export const MockAuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<MockUser | null>(null);

  const loginAs = (role: string, displayName = "Test User") => {
    setUser({ uid: `mock-${role}`, displayName, role });
  };

  const logout = () => setUser(null);

  return (
    <MockAuthContext.Provider value={{ user, loginAs, logout }}>
      {children}
    </MockAuthContext.Provider>
  );
};

export default MockAuthProvider;
