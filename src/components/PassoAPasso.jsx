import { Link } from 'react-router-dom';
import { IconeCheck, IconeSeta } from './Icones.jsx';
import './PassoAPasso.css';

const passos = [
  {
    titulo: 'Cadastre suas contas',
    texto: 'Adicione conta corrente, poupança e carteira para ver tudo num só lugar.',
  },
  {
    titulo: 'Registre cada gasto',
    texto: 'Anote as despesas na hora em que acontecem, com categoria e conta.',
  },
  {
    titulo: 'Informe seus ganhos',
    texto: 'Lance salário e rendas extras para saber quanto entra todo mês.',
  },
  {
    titulo: 'Crie o hábito',
    texto: 'Acompanhe os relatórios com frequência e assuma o controle do seu dinheiro.',
    final: true, // o último passo mostra um ✓ em vez do número
  },
];

export default function PassoAPasso() {
  return (
    <section className="passos">
      <div className="container passos__conteudo">
        <div className="passos__cabecalho">
          <span className="passos__rotulo">Como funciona?</span>
          <h2 className="passos__titulo">Do primeiro lançamento ao controle total</h2>
          <p className="passos__subtitulo">
            Quatro passos simples para colocar as suas finanças em ordem.
          </p>
        </div>

        <ol className="passos__lista">
          {passos.map((passo, indice) => (
            <li key={passo.titulo} className="passo">
              <div className="passo__marcador">
                {passo.final ? (
                  <span className="passo__circulo passo__circulo--final">
                    <IconeCheck tamanho={28} cor="#141414" espessura={2.4} />
                  </span>
                ) : (
                  <span className="passo__circulo">
                    {/* padStart transforma 1 em "01" */}
                    {String(indice + 1).padStart(2, '0')}
                  </span>
                )}
                <span className="passo__linha" aria-hidden="true" />
              </div>
              <h3 className="passo__titulo">{passo.titulo}</h3>
              <p className="passo__texto">{passo.texto}</p>
            </li>
          ))}
        </ol>

        <Link to="/entrar" className="passos__botao">
          Começar agora
          <span className="passos__botao-seta">
            <IconeSeta tamanho={18} cor="#141414" espessura={2.2} />
          </span>
        </Link>
      </div>
    </section>
  );
}
