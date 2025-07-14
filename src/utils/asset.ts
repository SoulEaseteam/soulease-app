export const asset = (relativePath: string): string => {
  // ถ้าเป็น URL เต็มแล้ว ให้ return ตรงๆ
  if (/^(https?:)?\/\//.test(relativePath)) {
    return relativePath;
  }
  // ตัด / นำหน้า และต่อ path กับ /images/
  return `/images/${relativePath.replace(/^\/+/, '')}`;
};