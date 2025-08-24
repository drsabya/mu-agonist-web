// app/providers/AuthProvider.tsx
"use client";

import { createContext, useContext } from "react";

type AuthContextType = {
  role: string | null;
};

const AuthContext = createContext<AuthContextType>({ role: null });

export function AuthProvider({
  role,
  children,
}: {
  role: string | null;
  children: React.ReactNode;
}) {
  return (
    <AuthContext.Provider value={{ role }}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook to use in any client component
export function useAuth() {
  return useContext(AuthContext);
}
