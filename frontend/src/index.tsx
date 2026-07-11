import './index.css';
import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';

// Loaded on demand so the design-system demo never ships in the main bundle.
const StyleGuide = lazy(() =>
  import('./components/ui/StyleGuide').then((module) => ({ default: module.StyleGuide })),
);

const container = document.getElementById('root');

if (container) {
  // Visit `#styleguide` to preview the design system in isolation.
  const isStyleGuide = window.location.hash === '#styleguide';
  createRoot(container).render(
    <StrictMode>{isStyleGuide ? <Suspense fallback={null}><StyleGuide /></Suspense> : <App />}</StrictMode>,
  );
}
