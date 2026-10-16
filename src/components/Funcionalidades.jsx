import { Link } from 'react-router-dom';
import {
  IconeBanco,
  IconeCategorias,
  IconeAlvo,
  IconeSino,
  IconeGrafico,
  IconeMoeda,
  IconeDispositivos,
  IconeSeta,
} from './Icones.jsx';
import CelularInicio from './CelularInicio.jsx';
import './Funcionalidades.css';

// Coluna da esquerda
const recursosEsquerda = [
  {
    Icone: IconeBanco,
    titulo: 'Controle de contas',
    texto: 'Conta corrente, poupança ou carteira: acompanhe todas num só lugar.',
  },
  {
    Icone: IconeCategorias,
    titulo: 'Planejamentos prontos',
    texto: 'Você pode tanto criar o seu planejamento quanto usar os nossos, já prontos.',
  },
  {
    Icone: IconeAlvo,
    titulo: 'Limite de gastos',
    texto: 'Defina quanto gastar em cada categoria e saiba quando estiver perto do limite.',
  },
  {
    Icone: IconeSino,
    titulo: 'Lembretes de contas',
    texto:
      'Seja avisado das contas a pagar, se pode comprar algo da lista de desejos e dos eventos do mês.',
  },
];

// Coluna da direita
const recursosDireita = [
  {
    Icone: IconeGrafico,
    titulo: 'Relatórios claros',
    texto: 'Gráficos simples para entender para onde vai o seu dinheiro.',
  },
  {
    Icone: IconeMoeda,
    titulo: 'Sem mensalidade',
    texto: 'Use todos os recursos sem pagar nada por mês na versão de teste.',
  },
  {
    Icone: IconeDispositivos,
    titulo: 'Acesse de onde estiver',
    texto: 'Use no celular, no computador ou baixe o app e acesse de qualquer lugar.',
  },
];

// Um cartão de recurso (ícone preto à esquerda + título e texto)
function CartaoRecurso({ Icone, titulo, texto }) {
  return (
    <article className="func-cartao">
      <span className="func-cartao__icone">
        <Icone tamanho={20} cor="#eaaf5a" />
      </span>
      <div className="func-cartao__textos">
        <h3 className="func-cartao__titulo">{titulo}</h3>
        <p className="func-cartao__texto">{texto}</p>
      </div>
    </article>
  );
}

export default function Funcionalidades() {
  return (
    <section className="func">
      <div className="container func__conteudo">
        <div className="func__cabecalho">
          <div className="func__cabecalho-titulo">
            <span className="func__rotulo">Funcionalidades</span>
            <h2 className="func__titulo">Um pouco do que a CIFRA pode fazer por você</h2>
          </div>
          <p className="func__subtitulo">
            Recursos pensados para deixar o controle do seu dinheiro simples.
          </p>
        </div>

        <div className="func__corpo">
          <div className="func__coluna">
            {recursosEsquerda.map((recurso) => (
              <CartaoRecurso key={recurso.titulo} {...recurso} />
            ))}
          </div>

          <div className="func__celular">
            <div className="func__celular-fundo" aria-hidden="true" />
            <CelularInicio />
          </div>

          <div className="func__coluna">
            {recursosDireita.map((recurso) => (
              <CartaoRecurso key={recurso.titulo} {...recurso} />
            ))}

            <div className="func__chamada">
              <h3 className="func__chamada-titulo">Pronto para começar?</h3>
              <Link to="/entrar" className="func__botao">
                Começar agora
                <IconeSeta tamanho={22} cor="#141414" espessura={2.2} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
