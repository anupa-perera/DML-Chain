@@ .. @@
 import React from 'react'
 import ReactDOM from 'react-dom/client'
-import App from './App'
+import PaymentTypesApp from './PaymentTypesApp'
 import './styles/main.css'
 import ErrorBoundary from './components/ErrorBoundary'
 
 ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
   <React.StrictMode>
     <ErrorBoundary>
-      <App />
+      <PaymentTypesApp />
     </ErrorBoundary>
   </React.StrictMode>,
 )