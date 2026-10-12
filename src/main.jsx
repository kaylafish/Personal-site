import React from 'react';
import ReactDOM from 'react-dom/client';
// Before App: its popstate listener has to run ahead of the router's.
import './transitions.js';
import App from './App.jsx';
import './fonts.css';
import './styles.css';
import './home.css';

ReactDOM.createRoot(document.getElementById('app')).render(<App />);
