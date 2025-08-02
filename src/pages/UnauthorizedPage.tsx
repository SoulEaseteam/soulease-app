// src/pages/UnauthorizedPage.tsx
import React from "react";

const UnauthorizedPage: React.FC = () => {
  return (
    <div style={{ padding: "40px", textAlign: "center" }}>
      <h1>🚫 Unauthorized</h1>
      <p>You do not have permission to access this page.</p>
    </div>
  );
};

export default UnauthorizedPage;