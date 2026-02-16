import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Debug logging
console.log('🐛 Debug Mode Active');
console.log('📱 Platform:', import.meta.env.MODE);
console.log('🌐 Base URL:', import.meta.env.BASE_URL);

// Global error handler
window.addEventListener('error', (e) => {
  console.error('❌ Global Error:', e.error);
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('❌ Unhandled Promise Rejection:', e.reason);
});

createRoot(document.getElementById("root")!).render(<App />);
