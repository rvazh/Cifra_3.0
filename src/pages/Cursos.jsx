import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import MenuLateral from '../components/MenuLateral.jsx';
import { IconeCheck, IconeSeta } from '../components/Icones.jsx';
import { PRIMEIROS_PASSOS, EM_BREVE, carregarProgresso, salvarProgresso } from '../dados/cursos.js';
import './Painel.css';
import './Cursos.css';

export default function Cursos() {
  const curso = PRIMEIROS_PASSOS;
  const [progresso, setProgresso] = useState(carregarProgresso);
  const concluidas = progresso[curso.id] || [];
  const total = curso.aulas.length;
  const feitas = concluidas.length;
  const porcento = Math.round((feitas / total) * 100);

  // Abre a primeira aula ainda não concluída
  const [aberta, setAberta] = useState(() => {
    const primeira = curso.aulas.findIndex((_, i) => !(carregarProgresso()[curso.id] || []).includes(i));
    return primeira === -1 ? null : primeira;
  });

  useEffect(() => salvarProgresso(progresso), [progresso]);

  function alternarConcluida(i) {
    const nova = concluidas.includes(i) ? concluidas.filter((n) => n !== i) : [...concluidas, i];
    setProgresso({ ...progresso, [curso.id]: nova });
    // Ao concluir, já abre a próxima aula que falta
    if (!concluidas.includes(i)) {
      const proxima = curso.aulas.findIndex((_, n) => n > i && !nova.includes(n));
      setAberta(proxima === -1 ? null : proxima);
    }
  }

  return (
    <div className="pp-app">
      <MenuLateral />

      <main className="pp cur">
        <div className="pp__topo">
          <div>
            <h1 className="pp__titulo">Cursos</h1>
            <p className="pp__subtitulo">Aprenda a cuidar do seu dinheiro, um passo de cada vez</p>
          </div>
        </div>

        {/* ===== Curso disponível ===== */}
        <section className="cur-destaque">
          <div className="cur-destaque__topo">
            <div className="cur-destaque__textos">
              <span className="cur-selo cur-selo--livre">Disponível · {curso.plano}</span>
              <h2>{curso.titulo}</h2>
              <p>{curso.descricao}</p>
            </div>
            <div className="cur-progresso" aria-label={`${feitas} de ${total} aulas concluídas`}>
              <b>{feitas === total ? 'Concluído! 🎉' : `${feitas} de ${total} aulas`}</b>
              <div className="cur-progresso__trilho" aria-hidden="true">
                <span style={{ width: `${porcento}%` }} />
              </div>
            </div>
          </div>

          <ol className="cur-aulas">
            {curso.aulas.map((aula, i) => {
              const feita = concluidas.includes(i);
              const estaAberta = aberta === i;
              return (
                <li key={aula.titulo} className={estaAberta ? 'cur-aula cur-aula--aberta' : 'cur-aula'}>
                  <button
                    type="button"
                    className="cur-aula__cabecalho"
                    aria-expanded={estaAberta}
                    onClick={() => setAberta(estaAberta ? null : i)}
                  >
                    <span className={feita ? 'cur-aula__numero cur-aula__numero--feita' : 'cur-aula__numero'}>
                      {feita ? <IconeCheck tamanho={16} espessura={2.8} /> : i + 1}
                    </span>
                    <span className="cur-aula__titulo">{aula.titulo}</span>
                    <span className="cur-aula__seta" aria-hidden="true">
                      {estaAberta ? '−' : '+'}
                    </span>
                  </button>
                  {estaAberta && (
                    <div className="cur-aula__corpo">
                      <p>{aula.texto}</p>
                      <div className="cur-aula__acoes">
                        <Link to={aula.link.para} className="cur-botao cur-botao--escuro">
                          {aula.link.texto}
                          <IconeSeta tamanho={16} espessura={2.4} />
                        </Link>
                        <button type="button" className="cur-botao" onClick={() => alternarConcluida(i)}>
                          {feita ? 'Desmarcar' : 'Marcar como concluída'}
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </section>

        {/* ===== Em breve ===== */}
        <section>
          <h2 className="cur__secao">Em breve</h2>
          <div className="cur__grade">
            {EM_BREVE.map((c) => (
              <article key={c.id} className="cur-cartao">
                <span className="cur-cartao__icone" aria-hidden="true">
                  {c.emoji}
                </span>
                <h3>{c.titulo}</h3>
                <p>{c.descricao}</p>
                <div className="cur-cartao__selos">
                  <span className="cur-selo">Em breve</span>
                  <span className="cur-selo cur-selo--plano">{c.plano}</span>
                </div>
              </article>
            ))}
          </div>
        </section>

        <p className="cur__nota">
          Os novos cursos aparecem aqui assim que ficarem prontos. Enquanto a CIFRA estiver em teste, todos ficam liberados.{' '}
          <Link to="/planos">Ver os planos</Link>
        </p>
      </main>
    </div>
  );
}
