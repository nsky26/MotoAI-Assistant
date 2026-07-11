import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider } from './context/AuthContext.tsx';
import { initializeOfflineData } from './services/offlineStorage.ts';
import App from './App.tsx';
import './index.css';

// Import knowledge data at build time (Vite inlines JSON at build)
import partsData from '../knowledge/parts.json';
import relationshipsData from '../knowledge/relationships.json';
import rulesData from '../knowledge/rules.json';
import protocolsData from '../knowledge/inspection_protocols.json';
import workflowsData from '../knowledge/repair_workflows.json';

// Initialize offline knowledge base before rendering
// This eliminates all fetch() calls for knowledge data
initializeOfflineData({
  parts: (partsData as any).parts,
  relationships: (relationshipsData as any).relationships,
  rules: (rulesData as any).rules,
  protocols: (protocolsData as any).protocols,
  workflows: (workflowsData as any).workflows,
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
);