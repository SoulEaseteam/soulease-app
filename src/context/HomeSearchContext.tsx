// src/context/HomeSearchContext.tsx
//
// 🆕 28x.132 (founder: "โลโก้ → search bar → แฮมเบอร์เกอร์" — the practitioner
//   search moved from inside HomeTherapistGrid into the site-wide TopNav).
//   TopNav (MainLayout) and HomeTherapistGrid (rendered via <Outlet/> on the
//   home route) are siblings, not parent/child, so the search query can't be
//   local state on either side anymore — it needs a shared source both can
//   reach. This context is that source: TopNav's input writes to it,
//   HomeTherapistGrid's filter reads from it.

import React, { createContext, useContext, useState } from "react";

interface HomeSearchContextValue {
  searchQ: string;
  setSearchQ: (q: string) => void;
}

const HomeSearchContext = createContext<HomeSearchContextValue | null>(null);

export const HomeSearchProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [searchQ, setSearchQ] = useState("");
  return (
    <HomeSearchContext.Provider value={{ searchQ, setSearchQ }}>
      {children}
    </HomeSearchContext.Provider>
  );
};

export function useHomeSearch(): HomeSearchContextValue {
  const ctx = useContext(HomeSearchContext);
  if (!ctx) {
    throw new Error("useHomeSearch must be used within a HomeSearchProvider");
  }
  return ctx;
}
