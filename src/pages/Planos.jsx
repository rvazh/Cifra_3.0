import { useState } from 'react';
import { Link } from 'react-router-dom';
import logoCifra from '../assets/cifra-logo.png';
import { IconeSeta, IconeCheck } from '../components/Icones.jsx';
import './Planos.css';

// Ícone de "não incluso" (um X dentro do círculo)
function IconeX() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </svg>
  );
}

// ===== Planos =====
// Para mudar preços, nomes ou itens, é só editar esta lista.
// precoMensal = valor no plano mensal
// precoAnual  = valor por mês no plano anual (aparece ao ligar a chave "Anual")
const planos = [
  {
    nome: 'Plano Gratuito',
    descricao: 'Para quem quer dar o 1º passo para se organizar.',
    precoMensal: 0,
    precoAnual: 0,
    botao: 'Começar grátis',
    itens: [
      { texto: '1 conta', incluso: true },
      { texto: 'Lançamento de ganhos e gastos', incluso: true },
      { texto: 'Categorias e subcategorias', incluso: true },
      { texto: 'Saldo de cada conta e saldo geral', incluso: true },
      { texto: 'Alertas financeiros', incluso: false },
      { texto: 'Calendário financeiro', incluso: false },
      { texto: 'Sem acesso ao Checklist', incluso: false },
      { texto: 'Sem acesso a Cursos e Notícias', incluso: false },
    ],
  },
  {
    nome: 'Plano Base',
    descricao: 'Para quem quer um controle melhor das suas finanças.',
    precoMensal: 18.9,
    precoAnual: 15.9,
    botao: 'Quero esse plano',
    itens: [
      { texto: <>Tudo do <b>Plano Gratuito</b></>, incluso: true },
      { texto: <><b>Até 3 contas</b></>, incluso: true },
      { texto: 'Até 10 alertas financeiros no mês', incluso: true },
      { texto: 'Relatórios fáceis de entender', incluso: true },
      { texto: 'Acesso básico aos cursos', incluso: true },
    ],
  },
  {
    nome: 'Plano Essencial',
    descricao: 'Para quem quer se planejar e não ter surpresas no mês.',
    precoMensal: 29.9,
    precoAnual: 26.9,
    destaque: 'Mais popular',
    teste: true, // mostra o link do teste grátis
    botao: 'Quero esse plano',
    itens: [
      { texto: <>Tudo do <b>Plano Base</b></>, incluso: true },
      { texto: <><b>Contas ilimitadas</b></>, incluso: true },
      { texto: 'Planejamentos prontos', incluso: true },
      { texto: 'Calendário financeiro', incluso: true },
      { texto: 'Alertas e lembretes ilimitados', incluso: true },
      { texto: 'Relatórios completos e com análises', incluso: true },
      { texto: <><b>Acesso completo</b> aos cursos</>, incluso: true },
    ],
  },
  {
    nome: 'Plano Combo',
    descricao: 'Para quem quer controle total das finanças, menos distrações e mais foco.',
    precoMensal: 32.9,
    precoAnual: 29.9,
    emBreve: true,
    botao: 'Quero esse plano',
    itens: [
      { texto: <>Tudo do <b>Plano Essencial</b></>, incluso: true },
      { texto: <>Acesso ao app <b>“Distraction Block”</b> incluso no plano</>, incluso: true },
      { texto: 'Presente surpresa de agradecimento no começo e no final do ano', incluso: true },
    ],
  },
];

// 9.9 -> "9,90"
function formatarPreco(valor) {
  return valor.toFixed(2).replace('.', ',');
}

export default function Planos() {
  const [anual, setAnual] = useState(false);

  return (
    <>
      {/* ===== Destaque ===== */}
      <section className="planos-hero">
        <div className="container planos-hero__conteudo">
          <div className="planos-hero__texto">
            <h1 className="planos-hero__titulo">
              O real controle financeiro nas suas&nbsp;mãos
            </h1>
            <p className="planos-hero__descricao">
              Organize suas contas, planeje o mês e acompanhe seus objetivos com um plano
              que cabe no seu momento. Comece grátis e mude quando quiser.
            </p>
            <div>
              <Link to="/cadastro" className="planos-hero__botao">
                Começar agora
                <span className="planos-hero__botao-seta">
                  <IconeSeta tamanho={18} cor="#141414" espessura={2.2} />
                </span>
              </Link>
            </div>
          </div>

          {/* Composição com cartões do app */}
          <div className="planos-hero__arte" aria-hidden="true">
            <span className="planos-hero__quadrado" />
            <div className="planos-hero__cartao">
              <div className="planos-hero__cartao-topo">
                <span className="planos-hero__marca">CIFRA</span>
                <span className="planos-hero__plano">Plano Essencial</span>
              </div>
              <div className="planos-hero__legenda">Planejado para outubro</div>
              <div className="planos-hero__valor">R$ 4.800,00</div>
              <div className="planos-hero__trilho">
                <div className="planos-hero__barra" />
              </div>
              <div className="planos-hero__linha">
                <span>Gasto até agora</span>
                <b>R$ 3.120,00</b>
              </div>
            </div>
            <div className="planos-hero__chip">
              <span className="planos-hero__chip-icone">
                <IconeCheck tamanho={16} cor="#141414" espessura={2.4} />
              </span>
              <div>
                <div className="planos-hero__chip-legenda">Economia no mês</div>
                <div className="planos-hero__chip-valor">+ R$ 420,00</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Planos ===== */}
      <section className="planos">
        <div className="container planos__conteudo">
          <img className="planos__logo" src={logoCifra} alt="" />

          <h2 className="planos__titulo">
            Confira nossos planos e escolha a melhor <br />
            forma de cuidar do seu dinheiro.
          </h2>
          <p className="planos__subtitulo">
            Aproveite os planos CIFRA e tenha um controle como você nunca teve.
          </p>

          {/* Chave Mensal / Anual */}
          <div className="planos__chave">
            <span className={anual ? 'planos__chave-texto' : 'planos__chave-texto planos__chave-texto--ativo'}>
              Mensal
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={anual}
              aria-label="Mostrar preços do plano anual"
              className={anual ? 'planos__interruptor planos__interruptor--ligado' : 'planos__interruptor'}
              onClick={() => setAnual(!anual)}
            >
              <span className="planos__bolinha" />
            </button>
            <span className={anual ? 'planos__chave-texto planos__chave-texto--ativo' : 'planos__chave-texto'}>
              Anual
            </span>
            <span className="planos__desconto">Economize até 15%</span>
          </div>

          <div className="planos__grade">
            {planos.map((plano) => {
              const preco = anual ? plano.precoAnual : plano.precoMensal;
              const classes = ['plano'];
              if (plano.destaque) classes.push('plano--destaque');

              return (
                <article key={plano.nome} className={classes.join(' ')}>
                  {plano.destaque && <span className="plano__selo">{plano.destaque}</span>}

                  <div className="plano__cabecalho">
                    <h3 className="plano__nome">{plano.nome}</h3>
                    {plano.emBreve && <span className="plano__em-breve">Em breve</span>}
                  </div>
                  <p className="plano__descricao">{plano.descricao}</p>

                  <div className="plano__preco">
                    <span className="plano__moeda">R$</span>
                    <span className="plano__valor">{formatarPreco(preco)}</span>
                    <span className="plano__periodo">/mês</span>
                  </div>
                  <p className="plano__cobranca">
                    {preco === 0
                      ? 'Sem precisar de cartão de crédito'
                      : anual
                        ? `R$ ${formatarPreco(preco * 12)} cobrados uma vez por ano`
                        : 'Cobrado todo mês, cancele quando quiser'}
                  </p>
                  {plano.teste && (
                    <Link to="/teste-gratis" className="plano__teste">
                      Teste 14 dias grátis →
                    </Link>
                  )}

                  <ul className="plano__lista">
                    {plano.itens.map((item, indice) => (
                      <li
                        key={indice}
                        className={item.incluso ? 'plano__item' : 'plano__item plano__item--fora'}
                      >
                        <span className="plano__marca">
                          {item.incluso ? <IconeCheck tamanho={12} cor="currentColor" espessura={3} /> : <IconeX />}
                        </span>
                        <span>{item.texto}</span>
                      </li>
                    ))}
                  </ul>

                  <Link to="/cadastro" className="plano__botao">
                    {plano.botao}
                    <IconeSeta tamanho={18} cor="currentColor" espessura={2.2} />
                  </Link>
                </article>
              );
            })}
          </div>

          <p className="planos__aviso">
            <b>Versão de teste:</b> enquanto a CIFRA estiver em teste, todos os recursos ficam
            liberados de graça, em qualquer plano.
          </p>
        </div>
      </section>
    </>
  );
}
