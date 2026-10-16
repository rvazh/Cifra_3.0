import { Link, useNavigate } from 'react-router-dom';
import {
  IconeSeta,
  IconeCheck,
  IconeCalendario,
  IconeSino,
  IconeGrafico,
  IconeCarteira,
  IconeLivro,
  IconeChecklist,
} from '../components/Icones.jsx';
import { estaLogado } from '../dados/acesso.js';
import { DIAS_DE_TESTE, iniciarTeste, situacaoDoPlano } from '../dados/plano.js';
import { dataDeHoje, dataPorExtenso } from '../dados/lancamentos.js';
import './TesteGratis.css';

// O que o Plano Essencial libera durante o teste
const recursos = [
  { icone: IconeCarteira, titulo: 'Contas ilimitadas', texto: 'Banco, carteira e cartão, cada um com o seu saldo.' },
  { icone: IconeCalendario, titulo: 'Calendário financeiro', texto: 'Veja em que dia vence cada conta do mês.' },
  { icone: IconeSino, titulo: 'Alertas ilimitados', texto: 'Aviso 3 dias e 1 dia antes de cada vencimento.' },
  { icone: IconeChecklist, titulo: 'Checklist e parcelas', texto: 'Contas fixas e parceladas: o que já foi pago e o que falta.' },
  { icone: IconeGrafico, titulo: 'Relatórios completos', texto: 'Para onde foi o dinheiro, com comparação entre meses.' },
  { icone: IconeLivro, titulo: 'Todos os cursos', texto: 'Acesso completo às aulas de organização financeira.' },
];

// Os 14 dias, passo a passo
const etapas = [
  { dia: 'Dia 1', titulo: 'Você começa o teste', texto: 'O Plano Essencial é liberado na hora. Não pedimos cartão de crédito.' },
  { dia: `Dia ${DIAS_DE_TESTE - 3}`, titulo: 'A gente te avisa', texto: 'Faltando 3 dias, aparece um aviso no painel para você decidir com calma.' },
  { dia: `Dia ${DIAS_DE_TESTE}`, titulo: 'O teste termina', texto: 'Você segue no Plano Gratuito ou no plano que escolheu. Nada é cobrado sem você pedir.' },
];

const perguntas = [
  {
    pergunta: 'Preciso cadastrar cartão de crédito?',
    resposta: 'Não. O teste é liberado sem cartão. Por isso, nada é cobrado quando ele termina.',
  },
  {
    pergunta: 'O que acontece com meus dados quando o teste acaba?',
    resposta:
      'Continuam todos salvos: contas, lançamentos e objetivos. No Plano Gratuito, só os recursos do Essencial (como calendário e alertas) ficam bloqueados até você assinar.',
  },
  {
    pergunta: 'Posso assinar antes dos 14 dias acabarem?',
    resposta:
      'Pode. Você escolhe o plano na página Planos e, quando o teste terminar, continua nele sem perder nada do que fez.',
  },
  {
    pergunta: 'Posso fazer o teste mais de uma vez?',
    resposta: 'O teste grátis é um por pessoa. Depois dele, você pode usar o Plano Gratuito pelo tempo que quiser.',
  },
];

// Faixa com os 14 dias (os já usados ficam dourados)
function Dias({ usados = 0 }) {
  return (
    <div className="tg-bilhete__dias" aria-hidden="true">
      {Array.from({ length: DIAS_DE_TESTE }, (_, i) => (
        <span key={i} className={i < usados ? 'tg-bilhete__dia tg-bilhete__dia--usado' : 'tg-bilhete__dia'} />
      ))}
    </div>
  );
}

export default function TesteGratis() {
  const navegar = useNavigate();
  const plano = situacaoDoPlano();

  // Se começasse hoje, terminaria em...
  const [ano, mes, dia] = dataDeHoje().split('-').map(Number);
  const fimSeComecarHoje = new Date(ano, mes - 1, dia + DIAS_DE_TESTE).toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
  });

  function comecar() {
    if (estaLogado()) {
      iniciarTeste();
      navegar('/painel');
    } else {
      // O teste começa assim que a pessoa entra na conta
      navegar('/entrar', { state: { teste: true } });
    }
  }

  // Texto do botão principal, conforme a situação
  const botao = plano.emTeste
    ? { texto: 'Ir para o meu painel', acao: () => navegar(estaLogado() ? '/painel' : '/entrar') }
    : plano.testeTerminou
      ? { texto: 'Conhecer os planos', acao: () => navegar('/planos') }
      : { texto: 'Começar meu teste grátis', acao: comecar };

  return (
    <>
      {/* ===== Destaque ===== */}
      <section className="tg-hero">
        <div className="container tg-hero__conteudo">
          <div className="tg-hero__texto">
            <span className="tg-hero__etiqueta">{DIAS_DE_TESTE} dias grátis</span>
            <h1 className="tg-hero__titulo">
              Teste o Plano Essencial por {DIAS_DE_TESTE} dias, de&nbsp;graça
            </h1>
            <p className="tg-hero__descricao">
              Use tudo que o Essencial tem: calendário, alertas, checklist e relatórios completos. Quando o teste
              acabar, você continua no <b>Plano Gratuito</b>, ou no plano que escolher assinar.
            </p>

            {plano.emTeste && (
              <p className="tg-hero__status" role="status">
                Seu teste está ativo: faltam <b>{plano.diasRestantes} {plano.diasRestantes === 1 ? 'dia' : 'dias'}</b>{' '}
                (termina em {plano.fimPorExtenso}).
              </p>
            )}
            {plano.testeTerminou && (
              <p className="tg-hero__status" role="status">
                Seu teste terminou em {plano.fimPorExtenso}. Hoje você está no <b>{plano.nome}</b>.
              </p>
            )}

            <div className="tg-hero__acoes">
              <button type="button" className="tg-botao" onClick={botao.acao}>
                {botao.texto}
                <span className="tg-botao__seta">
                  <IconeSeta tamanho={18} cor="#141414" espessura={2.2} />
                </span>
              </button>
              <Link to="/planos" className="tg-hero__link">
                Ver todos os planos
              </Link>
            </div>

            <ul className="tg-hero__garantias">
              {['Sem cartão de crédito', 'Sem cobrança automática', 'Seus dados ficam salvos'].map((t) => (
                <li key={t}>
                  <span className="tg-hero__check">
                    <IconeCheck tamanho={12} cor="currentColor" espessura={3} />
                  </span>
                  {t}
                </li>
              ))}
            </ul>
          </div>

          {/* Bilhete do teste */}
          <div className="tg-hero__arte">
            <div className="tg-bilhete">
              <div className="tg-bilhete__topo">
                <span className="tg-bilhete__marca">CIFRA</span>
                <span className="tg-bilhete__selo">Teste grátis</span>
              </div>
              <span className="tg-bilhete__legenda">Seu plano durante o teste</span>
              <b className="tg-bilhete__plano">Plano Essencial</b>
              <div className="tg-bilhete__contagem">
                <b>{plano.emTeste ? plano.diasRestantes : DIAS_DE_TESTE}</b>
                <span>{plano.emTeste ? 'dias restantes' : 'dias liberados'}</span>
              </div>
              <Dias usados={plano.emTeste ? plano.diasUsados : 0} />
              <div className="tg-bilhete__linha">
                <span>{plano.emTeste ? 'Termina em' : 'Se começar hoje, termina em'}</span>
                <b>{plano.emTeste ? dataPorExtenso(plano.fimDoTeste) : fimSeComecarHoje}</b>
              </div>
              <div className="tg-bilhete__depois">
                Depois: <b>Plano Gratuito</b> ou o plano que você assinar
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== O que você libera ===== */}
      <section className="tg-secao">
        <div className="container">
          <h2 className="tg-secao__titulo">O que você libera no teste</h2>
          <p className="tg-secao__subtitulo">Tudo do Plano Essencial, sem limite, durante {DIAS_DE_TESTE} dias.</p>
          <div className="tg-recursos">
            {recursos.map(({ icone: Icone, titulo, texto }) => (
              <article key={titulo} className="tg-recurso">
                <span className="tg-recurso__icone">
                  <Icone tamanho={22} espessura={2} />
                </span>
                <h3 className="tg-recurso__titulo">{titulo}</h3>
                <p className="tg-recurso__texto">{texto}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Como funciona ===== */}
      <section className="tg-secao tg-secao--clara">
        <div className="container">
          <h2 className="tg-secao__titulo">Como funcionam os {DIAS_DE_TESTE} dias</h2>
          <ol className="tg-etapas">
            {etapas.map((e, i) => (
              <li key={e.dia} className="tg-etapa">
                <span className="tg-etapa__numero">{i + 1}</span>
                <span className="tg-etapa__dia">{e.dia}</span>
                <h3 className="tg-etapa__titulo">{e.titulo}</h3>
                <p className="tg-etapa__texto">{e.texto}</p>
              </li>
            ))}
          </ol>

          {/* Depois do teste: os dois caminhos */}
          <h2 className="tg-secao__titulo tg-secao__titulo--depois">E quando o teste acabar?</h2>
          <div className="tg-caminhos">
            <article className="tg-caminho">
              <span className="tg-caminho__rotulo">Se você não assinar</span>
              <h3 className="tg-caminho__titulo">Você passa para o Plano Gratuito</h3>
              <ul className="tg-caminho__lista">
                <li>
                  <span className="tg-caminho__ponto" aria-hidden="true" />
                  Automático, sem nenhuma cobrança
                </li>
                <li>
                  <span className="tg-caminho__ponto" aria-hidden="true" />
                  Contas, lançamentos e objetivos continuam salvos
                </li>
                <li>
                  <span className="tg-caminho__ponto" aria-hidden="true" />
                  Os recursos do Essencial ficam bloqueados até você assinar
                </li>
              </ul>
              <span className="tg-caminho__preco">
                <b>R$ 0</b>/mês
              </span>
            </article>

            <article className="tg-caminho tg-caminho--escuro">
              <span className="tg-caminho__rotulo">Se você assinar um plano</span>
              <h3 className="tg-caminho__titulo">Você continua com o plano escolhido</h3>
              <ul className="tg-caminho__lista">
                <li>
                  <span className="tg-caminho__ponto" aria-hidden="true" />
                  Pode ser o Base ou o próprio Essencial
                </li>
                <li>
                  <span className="tg-caminho__ponto" aria-hidden="true" />
                  Tudo o que você fez no teste continua igual
                </li>
                <li>
                  <span className="tg-caminho__ponto" aria-hidden="true" />
                  A primeira cobrança só acontece quando o teste terminar
                </li>
              </ul>
              <Link to="/planos" className="tg-caminho__link">
                Comparar planos
                <IconeSeta tamanho={16} cor="currentColor" espessura={2.4} />
              </Link>
            </article>
          </div>
        </div>
      </section>

      {/* ===== Dúvidas ===== */}
      <section className="tg-secao">
        <div className="container tg-duvidas">
          <h2 className="tg-secao__titulo">Dúvidas sobre o teste</h2>
          <div className="tg-perguntas">
            {perguntas.map((p) => (
              <details key={p.pergunta} className="tg-pergunta">
                <summary>
                  {p.pergunta}
                  <span className="tg-pergunta__mais" aria-hidden="true">
                    +
                  </span>
                </summary>
                <p>{p.resposta}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Chamada final ===== */}
      <section className="tg-final">
        <div className="container tg-final__conteudo">
          <div>
            <h2 className="tg-final__titulo">Comece hoje. Decida daqui a {DIAS_DE_TESTE} dias.</h2>
            <p className="tg-final__texto">Sem cartão, sem compromisso. Se não assinar, você fica no Plano Gratuito.</p>
          </div>
          <button type="button" className="tg-botao tg-botao--dourado" onClick={botao.acao}>
            {botao.texto}
            <span className="tg-botao__seta">
              <IconeSeta tamanho={18} cor="#ffffff" espessura={2.2} />
            </span>
          </button>
        </div>
      </section>
    </>
  );
}
