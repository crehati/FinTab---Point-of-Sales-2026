
import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App, { ErrorBoundary } from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Global root registry to prevent Error #310 in dynamic module environments
const rootContainer = rootElement as any;
if (!rootContainer._reactRoot) {
    rootContainer._reactRoot = ReactDOM.createRoot(rootElement);
}
const root = rootContainer._reactRoot;

root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <HashRouter>
        <App />
      </HashRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
