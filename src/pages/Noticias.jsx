import { useState } from 'react';
import MenuLateral from '../components/MenuLateral.jsx';
import { IconeSeta } from '../components/Icones.jsx';
import { NOTICIAS, TEMAS, ATUALIZADO_EM } from '../dados/noticias.js';
import './Painel.css';
import './Noticias.css';

const CLASSE_DO_TEMA = { Economia: 'economia', 'Seu bolso': 'bolso', Segurança: 'seguranca' };

function Noticia({ n, destaque }) {
  return (
    <article className={destaque ? 'not-cartao not-cartao--destaque' : 'not-cartao'}>
      <div className="not-cartao__topo">
        <span className={`not-tema not-tema--${CLASSE_DO_TEMA[n.tema]}`}>{n.tema}</span>
        <span className="not-cartao__fonte">
          {n.fonte} · {n.data}
        </span>
      </div>
      <h2 className="not-cartao__titulo">{n.titulo}</h2>
      <p className="not-cartao__resumo">{n.resumo}</p>
      <p className="not-cartao__voce">
        <b>Para você:</b> {n.paraVoce}
      </p>
      <a className="not-cartao__link" href={n.link} target="_blank" rel="noopener noreferrer">
        Ler na fonte ({n.fonte})
        <IconeSeta tamanho={16} espessura={2.4} />
      </a>
    </article>
  );
}

export default function Noticias() {
  const [tema, setTema] = useState(null);
  const visiveis = tema ? NOTICIAS.filter((n) => n.tema === tema) : NOTICIAS;
  const [primeira, ...outras] = visiveis;

  return (
    <div className="pp-app">
      <MenuLateral />

      <main className="pp not">
        <div className="pp__topo">
          <div>
            <h1 className="pp__titulo">Notícias</h1>
            <p className="pp__subtitulo">O que está acontecendo e como isso mexe com o seu bolso · atualizado em {ATUALIZADO_EM}</p>
          </div>
        </div>

        <div className="not__filtros" role="group" aria-label="Filtrar por tema">
          {[null, ...TEMAS].map((t) => (
            <button
              key={t || 'todas'}
              type="button"
              aria-pressed={tema === t}
              className={tema === t ? 'not__filtro not__filtro--ativo' : 'not__filtro'}
              onClick={() => setTema(t)}
            >
              {t || 'Todas'}
            </button>
          ))}
        </div>

        {primeira && <Noticia n={primeira} destaque />}
        {outras.length > 0 && (
          <div className="not__grade">
            {outras.map((n) => (
              <Noticia key={n.id} n={n} />
            ))}
          </div>
        )}

        <p className="not__nota">
          Resumos feitos pela equipe CIFRA. A notícia completa está no site de cada fonte. Nada aqui é recomendação de
          investimento.
        </p>
      </main>
    </div>
  );
}
