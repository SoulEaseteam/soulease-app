import React from "react";
import HomePage from "../HomePage"; // ✅ import หน้า HomePage ปกติ
// 🚨 HOTFIX (founder screenshot: "useHomeSearch must be used within a
//   HomeSearchProvider") — HomePage's TopNav/HomeTherapistGrid have read
//   their search query from this shared context since 28x.132, but this
//   admin preview embeds HomePage directly, outside MainLayout (the only
//   place that normally provides it). This stub has existed unchanged
//   since the repo's first commit, predating the context by many rounds —
//   it just never got updated when 28x.132 shipped.
import { HomeSearchProvider } from "@/context/HomeSearchContext";

const AdminPagesListPage: React.FC = () => {
  return (
    <div style={{ padding: "20px" }}>
      <HomeSearchProvider>
        <HomePage />
      </HomeSearchProvider>
    </div>
  );
};

export default AdminPagesListPage;