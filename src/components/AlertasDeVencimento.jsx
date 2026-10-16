import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { verificarAlertas } from '../dados/alertas.js';
import { estaLogado } from '../dados/acesso.js';
import { IconeSino } from './Icones.jsx';
import './AlertasDeVencimento.css';

const INTERVALO = 30 * 60 * 1000; // confere de novo a cada 30 minutos

// Fica "escondido" no app: confere os vencimentos e dispara os avisos.
// Se o navegador não deixar mostrar notificação, o aviso aparece no canto da tela.
export default function AlertasDeVencimento() {
  const { pathname } = useLocation();
  const [naTela, setNaTela] = useState([]);
  const dentroDoSistema = pathname.startsWith('/painel') && estaLogado();

  useEffect(() => {
    if (!dentroDoSistema) return undefined;
    const mostrar = (alerta) => setNaTela((atual) => (atual.some((x) => x.id === alerta.id) ? atual : [...atual, alerta].slice(-3)));
    const conferir = () => verificarAlertas(mostrar);

    conferir();
    const relogio = setInterval(conferir, INTERVALO);
    const aoVoltar = () => document.visibilityState === 'visible' && conferir();
    document.addEventListener('visibilitychange', aoVoltar);
    window.addEventListener('cifra:conferir-alertas', conferir);
    return () => {
      clearInterval(relogio);
      document.removeEventListener('visibilitychange', aoVoltar);
      window.removeEventListener('cifra:conferir-alertas', conferir);
    };
  }, [dentroDoSistema]);

  // Também confere ao trocar de tela dentro do sistema
  useEffect(() => {
    if (dentroDoSistema) verificarAlertas((alerta) => setNaTela((atual) => (atual.some((x) => x.id === alerta.id) ? atual : [...atual, alerta].slice(-3))));
  }, [pathname, dentroDoSistema]);

  // Cada aviso some sozinho depois de 10 segundos
  useEffect(() => {
    if (!naTela.length) return undefined;
    const tempo = setTimeout(() => setNaTela((atual) => atual.slice(1)), 10000);
    return () => clearTimeout(tempo);
  }, [naTela]);

  if (!naTela.length || !dentroDoSistema) return null;

  return (
    <div className="alertas" role="status" aria-live="polite">
      {naTela.map((a) => (
        <div key={a.id} className="alerta">
          <span className="alerta__icone" aria-hidden="true">
            <IconeSino tamanho={18} espessura={2.2} />
          </span>
          <div className="alerta__textos">
            <b>{a.titulo}</b>
            <span>{a.corpo}</span>
            <Link to={a.para || '/painel/calendario'} className="alerta__link" onClick={() => setNaTela([])}>
              {a.textoLink || 'Ver no calendário'}
            </Link>
          </div>
          <button
            type="button"
            className="alerta__fechar"
            aria-label="Fechar aviso"
            onClick={() => setNaTela((atual) => atual.filter((x) => x.id !== a.id))}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
