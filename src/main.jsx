import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';

import './styles/main.css';
import './styles/header.css';
import './styles/oferty.css';
import './styles/details.css';
import './styles/dodaj.css';
import './styles/edit.css';
import './styles/form.css';
import './styles/contact.css';
import './styles/legal.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
