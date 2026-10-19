import { useEffect, useRef, useState } from 'react';
import logoDistraction from '../assets/distraction-block.png';
import { DISTRACTION_BLOCK_URL } from '../config.js';
import './BotaoDistraction.css';

// Botão pequeno acima do atendimento, com a logo do Distraction Block.
// Ao clicar, abre um balão "Conhecer o Distraction Block" que leva para o site do app.
export default function BotaoDistraction() {
  const [aberto, setAberto] = useState(false);
  const area = useRef(null);

  // Fecha com Esc ou clicando fora
  useEffect(() => {
    if (!aberto) return undefined;
    const aoTeclar = (e) => e.key === 'Escape' && setAberto(false);
    const aoClicar = (e) => !area.current?.contains(e.target) && setAberto(false);
    window.addEventListener('keydown', aoTeclar);
    document.addEventListener('mousedown', aoClicar);
    return () => {
      window.removeEventListener('keydown', aoTeclar);
      document.removeEventListener('mousedown', aoClicar);
    };
  }, [aberto]);

  return (
    <div className="dbk" ref={area}>
      {aberto && (
        <a
          id="dbk-balao"
          className="dbk__balao"
          href={DISTRACTION_BLOCK_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => setAberto(false)}
        >
          <b>Conhecer o Distraction Block</b>
          <small>Bloqueie apps, sites e pesquisas que tiram o seu foco</small>
          <span className="dbk__seta" aria-hidden="true">
            →
          </span>
        </a>
      )}
      <button
        type="button"
        className={aberto ? 'dbk__botao dbk__botao--aberto' : 'dbk__botao'}
        aria-expanded={aberto}
        aria-controls="dbk-balao"
        aria-label="Distraction Block: conhecer o app"
        title="Distraction Block"
        onClick={() => setAberto(!aberto)}
      >
        <img src={logoDistraction} alt="" />
      </button>
    </div>
  );
}
