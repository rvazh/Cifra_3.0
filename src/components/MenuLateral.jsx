import { useLayoutEffect, useRef, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import logoCifra from '../assets/cifra-logo.png';
import {
  IconeCasa,
  IconeLista,
  IconeCarteira,
  IconeGrafico,
  IconeAlvo,
  IconeMoeda,
  IconeAPagar,
  IconeCalendario,
  IconeConfig,
  IconeSair,
  IconeOlho,
  IconeLivro,
  IconeChecklist,
  IconeRecibo,
  IconeJornal,
  IconeInfo,
} from './Icones.jsx';
import { valoresEscondidos, alternarValores } from '../dados/preferencias.js';
import { encerrarSessao, irPara } from '../dados/acesso.js';
import { situacaoDoPlano, DIAS_DE_TESTE } from '../dados/plano.js';
import RelatarProblema from './RelatarProblema.jsx';
import './MenuLateral.css';

// Itens do menu lateral do sistema (usado no Painel, Lançamentos...)
const menu = [
  { para: '/painel', texto: 'Visão geral', Icone: IconeCasa },
  { para: '/painel/lancamentos', texto: 'Lançamentos', Icone: IconeLista },
  { para: '/painel/checklist', texto: 'Checklist', Icone: IconeChecklist },
  { para: '/painel/contas', texto: 'Contas', Icone: IconeCarteira },
  { para: '/painel/relatorios', texto: 'Relatórios', Icone: IconeGrafico },
  { para: '/painel/calendario', texto: 'Calendário', Icone: IconeCalendario },
  { para: '/painel/objetivos', texto: 'Objetivos', Icone: IconeAlvo },
  { para: '/painel/receber', texto: 'A receber', Icone: IconeMoeda },
  { para: '/painel/pagar', texto: 'A pagar', Icone: IconeAPagar },
  { para: '/painel/comprovantes', texto: 'Comprovantes', Icone: IconeRecibo },
  'separador', // linha cinza separando as ferramentas do conteúdo
  { para: '/painel/cursos', texto: 'Cursos', Icone: IconeLivro },
  { para: '/painel/noticias', texto: 'Notícias', Icone: IconeJornal },
];

// No celular o menu vira uma barra que rola para o lado. Guardamos a posição
// para a barra não voltar ao começo cada vez que a pessoa troca de aba.
const CHAVE_ROLAGEM = 'cifra:menu-rolagem';

// Cartão "Seu plano": mostra o teste grátis (com os dias que faltam) ou o plano atual
function CartaoDoPlano() {
  const plano = situacaoDoPlano();
  if (plano.emTeste) {
    return (
      <div className="lateral__plano">
        <span className="lateral__plano-rotulo">Teste grátis · {plano.nome}</span>
        <b>
          {plano.diasRestantes === 1 ? 'Falta 1 dia' : `Faltam ${plano.diasRestantes} dias`}
        </b>
        <span className="lateral__plano-trilho" aria-hidden="true">
          <span style={{ width: `${(plano.diasUsados / DIAS_DE_TESTE) * 100}%` }} />
        </span>
        <span className="lateral__plano-nota">Depois: Plano Gratuito, se não assinar</span>
        <Link to="/planos" className="lateral__plano-link">
          Assinar um plano →
        </Link>
      </div>
    );
  }
  return (
    <div className="lateral__plano">
      <span className="lateral__plano-rotulo">Seu plano</span>
      <b>{plano.nome}</b>
      {plano.testeTerminou && !plano.assinado && <span className="lateral__plano-nota">Seu teste do Essencial terminou</span>}
      {plano.testeTerminou || plano.assinado ? (
        <Link to="/planos" className="lateral__plano-link">
          Conhecer os planos →
        </Link>
      ) : (
        <Link to="/teste-gratis" className="lateral__plano-link">
          Testar o Essencial grátis →
        </Link>
      )}
    </div>
  );
}

export default function MenuLateral() {
  const barra = useRef(null);

  // Antes de desenhar a tela: volta a barra para onde estava e garante que a aba aberta apareça
  useLayoutEffect(() => {
    const el = barra.current;
    if (!el || el.scrollWidth <= el.clientWidth) return; // computador: menu na lateral, sem rolagem
    try {
      el.scrollLeft = Number(sessionStorage.getItem(CHAVE_ROLAGEM)) || 0;
    } catch {
      /* sem acesso ao armazenamento */
    }
    const ativa = el.querySelector('.lateral__item.active, .lateral__extra.active');
    if (ativa) {
      // posição da aba dentro da barra (contando o que já rolou)
      const inicio = ativa.getBoundingClientRect().left - el.getBoundingClientRect().left + el.scrollLeft;
      const fim = inicio + ativa.offsetWidth;
      if (inicio < el.scrollLeft || fim > el.scrollLeft + el.clientWidth) {
        el.scrollLeft = inicio - (el.clientWidth - ativa.offsetWidth) / 2; // centraliza a aba aberta
      }
    }
  }, []);

  function guardarRolagem(evento) {
    try {
      sessionStorage.setItem(CHAVE_ROLAGEM, String(Math.round(evento.currentTarget.scrollLeft)));
    } catch {
      /* sem acesso ao armazenamento */
    }
  }

  const [relatando, setRelatando] = useState(false); // janela "Relatar problema"

  // Sai da conta (os dados ficam na nuvem; a cópia deste aparelho é apagada)
  async function sair() {
    await encerrarSessao(); // envia o que falta para a nuvem e encerra o login
    irPara('/entrar'); // recarrega: a próxima pessoa não vê nada da anterior
  }

  return (
    <aside className="lateral" ref={barra} onScroll={guardarRolagem}>
      <Link to="/painel" className="lateral__marca" aria-label="CIFRA — visão geral">
        <span className="lateral__logo">
          <img src={logoCifra} alt="" />
        </span>
        Cifra
      </Link>

      <nav className="lateral__menu" aria-label="Menu do sistema">
        {menu.map((item, i) =>
          item === 'separador' ? (
            <span key={`separador-${i}`} className="lateral__separador" role="separator" />
          ) : (
            <NavLink key={item.para} to={item.para} end className="lateral__item">
              <item.Icone tamanho={18} espessura={2.2} />
              {item.texto}
            </NavLink>
          )
        )}
      </nav>

      <div className="lateral__fim">
        <CartaoDoPlano />
        <button
          type="button"
          className="lateral__extra"
          onClick={alternarValores}
          aria-pressed={valoresEscondidos()}
          title={valoresEscondidos() ? 'Mostrar valores' : 'Esconder valores'}
        >
          <IconeOlho tamanho={18} espessura={2.2} fechado={!valoresEscondidos()} />
          <span className="lateral__texto">{valoresEscondidos() ? 'Mostrar valores' : 'Esconder valores'}</span>
        </button>
        <button type="button" className="lateral__extra" onClick={() => setRelatando(true)} title="Relatar problema">
          <IconeInfo tamanho={18} espessura={2.2} />
          <span className="lateral__texto">Relatar problema</span>
        </button>
        <NavLink to="/painel/configuracoes" className="lateral__extra" title="Configurações">
          <IconeConfig tamanho={18} espessura={2.2} />
          <span className="lateral__texto">Configurações</span>
        </NavLink>
        <button type="button" className="lateral__extra" onClick={sair} title="Sair">
          <IconeSair tamanho={18} espessura={2.2} />
          <span className="lateral__texto">Sair</span>
        </button>
      </div>
      {relatando && <RelatarProblema aoFechar={() => setRelatando(false)} />}
    </aside>
  );
}
