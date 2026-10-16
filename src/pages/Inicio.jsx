import { Link } from 'react-router-dom';
import PainelExemplo from '../components/PainelExemplo.jsx';
import PassoAPasso from '../components/PassoAPasso.jsx';
import Funcionalidades from '../components/Funcionalidades.jsx';
import Objetivos from '../components/Objetivos.jsx';
import Seguranca from '../components/Seguranca.jsx';
import Perguntas from '../components/Perguntas.jsx';
import { IconeSeta, IconeMais, IconeCarteira, IconeGrafico } from '../components/Icones.jsx';
import './Inicio.css';

const recursos = [
  {
    Icone: IconeMais,
    titulo: 'Lançamentos rápidos',
    texto: 'Anote cada entrada e saída em segundos, com categoria e conta!',
  },
  {
    Icone: IconeCarteira,
    titulo: 'Contas e saldos',
    texto: 'Veja o saldo de cada conta e o total geral e saiba como se organizar!',
  },
  {
    Icone: IconeGrafico,
    titulo: 'Relatórios do mês',
    texto: 'Tenha uma visão geral dos seus gastos e entenda o seu financeiro!',
  },
];

export default function Inicio() {
  return (
    <>
      {/* ===== Destaque principal ===== */}
      <section className="hero container">
        <div className="hero__texto">
          <h1 className="hero__titulo">
            Seu dinheiro, <br />
            no seu controle, <br />
            o tempo todo!
          </h1>
          <p className="hero__descricao">
            Registre ganhos e gastos, acompanhe o saldo de cada conta e entenda para onde vai
            cada real — tudo em um só lugar.
          </p>
          <div>
            <Link to="/entrar" className="hero__botao">
              Começar agora
              <span className="hero__botao-seta">
                <IconeSeta tamanho={20} cor="#141414" espessura={2.2} />
              </span>
            </Link>
          </div>
        </div>

        <PainelExemplo />
      </section>

      {/* ===== Recursos ===== */}
      <section className="recursos">
        <div className="container recursos__conteudo">
          <div className="recursos__cabecalho">
            <span className="recursos__rotulo">Recursos</span>
            <h2 className="recursos__titulo">
              Tudo o que você precisa para organizar a sua vida.
            </h2>
          </div>

          <div className="recursos__grade">
            {recursos.map(({ Icone, titulo, texto }) => (
              <article key={titulo} className="recurso">
                <span className="recurso__icone">
                  <Icone cor="#141414" />
                </span>
                <h3 className="recurso__titulo">{titulo}</h3>
                <p className="recurso__texto">{texto}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Passo a passo ===== */}
      <PassoAPasso />

      {/* ===== Funcionalidades ===== */}
      <Funcionalidades />

      {/* ===== Objetivos ===== */}
      <Objetivos />

      {/* ===== Segurança ===== */}
      <Seguranca />

      {/* ===== Perguntas frequentes ===== */}
      <Perguntas />
    </>
  );
}
