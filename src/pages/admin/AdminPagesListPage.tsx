import React from "react";
import HomePage from "../HomePage"; // ✅ import หน้า HomePage ปกติ

const AdminPagesListPage: React.FC = () => {
  return (
    <div style={{ padding: "20px" }}>
     
      <HomePage /> 
    </div>
  );
};

export default AdminPagesListPage;