import { useRef, useState } from 'react';
import './Carrossel.css';

// Carrossel de cartões: arraste para o lado (celular), use as setas, as abas ou as teclas ← →.
// slides: [{ id, aba: 'Texto da aba', conteudo: <JSX> }]
export default function Carrossel({ rotulo, slides }) {
  const trilho = useRef(null);
  const [atual, setAtual] = useState(0);

  function ir(indice) {
    const el = trilho.current;
    if (!el) return;
    const n = Math.max(0, Math.min(slides.length - 1, indice));
    el.scrollTo({ left: n * el.clientWidth, behavior: 'smooth' });
    setAtual(n);
  }

  function aoRolar() {
    const el = trilho.current;
    if (!el || !el.clientWidth) return;
    const n = Math.round(el.scrollLeft / el.clientWidth);
    if (n !== atual) setAtual(n);
  }

  function aoTeclar(e) {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      ir(atual + 1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      ir(atual - 1);
    }
  }

  return (
    <section className="cartao carrossel" aria-roledescription="carrossel" aria-label={rotulo}>
      <div className="carrossel__topo">
        <div className="carrossel__abas" role="tablist" aria-label={rotulo}>
          {slides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={i === atual}
              className={i === atual ? 'carrossel__aba carrossel__aba--ativa' : 'carrossel__aba'}
              onClick={() => ir(i)}
            >
              {s.aba}
            </button>
          ))}
        </div>
        <div className="carrossel__setas">
          <button type="button" onClick={() => ir(atual - 1)} disabled={atual === 0} aria-label="Gráfico anterior">
            ‹
          </button>
          <span className="carrossel__contador">
            {atual + 1}/{slides.length}
          </span>
          <button type="button" onClick={() => ir(atual + 1)} disabled={atual === slides.length - 1} aria-label="Próximo gráfico">
            ›
          </button>
        </div>
      </div>

      <div className="carrossel__trilho" ref={trilho} onScroll={aoRolar} onKeyDown={aoTeclar} tabIndex={0}>
        {slides.map((s, i) => (
          <div
            key={s.id}
            className="carrossel__slide"
            role="tabpanel"
            aria-label={`${s.aba} (${i + 1} de ${slides.length})`}
            aria-hidden={i !== atual}
          >
            {s.conteudo}
          </div>
        ))}
      </div>

      <div className="carrossel__pontos" aria-hidden="true">
        {slides.map((s, i) => (
          <span key={s.id} className={i === atual ? 'carrossel__ponto carrossel__ponto--ativo' : 'carrossel__ponto'} />
        ))}
      </div>
    </section>
  );
}
