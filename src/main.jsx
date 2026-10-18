import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App.jsx';
import './styles/global.css';
import { aplicarTema } from './dados/preferencias.js';
import { prepararNuvem } from './dados/nuvem.js';
import './dados/instalar.js'; // já fica de olho no convite de instalação do navegador

async function iniciar() {
  // Antes da primeira tela: confere o login no Supabase e baixa os dados da pessoa
  // (sem internet, segue com o que já está neste aparelho)
  try {
    await prepararNuvem();
  } catch {
    /* o site abre mesmo assim */
  }

  // Tema escolhido pela pessoa (Configurações > Preferências > Tema), antes de desenhar a tela
  aplicarTema();

  // HashRouter (URLs com #/) funciona no GitHub Pages e no Vercel sem configuração extra
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <HashRouter>
        <App />
      </HashRouter>
    </React.StrictMode>
  );
}

iniciar();

// Service worker: usado só para mostrar os avisos de vencimento como notificação
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
      /* sem service worker: os avisos aparecem na própria tela */
    });
  });
}
