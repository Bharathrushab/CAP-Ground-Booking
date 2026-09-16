import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { SiteProvider } from './lib/store';
import App from './App';
import '@fontsource-variable/fraunces';
import '@fontsource-variable/public-sans';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode><BrowserRouter><SiteProvider><App /></SiteProvider></BrowserRouter></React.StrictMode>,
);