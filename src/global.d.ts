export {};

declare global {
  interface Window {
    // Google Analytics 4
    gtag?: (...args: unknown[]) => void;
    dataLayer: unknown[];

    // Google Maps JS API (โหลดผ่าน <script> ใน GoogleMapsContext)
    // @types/google.maps ให้ namespace `google` เป็น global อยู่แล้ว แต่
    // ใน runtime อาจยังไม่โหลด → ทำเป็น optional
    google?: typeof google;
  }
}
