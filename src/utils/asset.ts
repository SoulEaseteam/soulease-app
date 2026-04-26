export const asset = (relativePath?: string): string => {
  if (!relativePath) {
    return '/images/placeholder.jpg'; // fallback กรณีไม่มี path
  }
  
  // ถ้าเป็น URL เต็มแล้ว ให้ return ตรงๆ
  if (/^(https?:)?\/\//.test(relativePath)) {
    return relativePath;
  }
  
  // ตัด / นำหน้า และต่อ path กับ /images/
  return `/images/${relativePath.replace(/^\/+/, '')}`;
};