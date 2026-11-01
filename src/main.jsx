import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '@fontsource/anton/400.css';
import '@fontsource-variable/archivo/wdth.css';
import '@fontsource/instrument-serif/400-italic.css';
import '@fontsource/instrument-serif/400.css';
import './styles/site.css';
import App from './App.jsx';

if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
