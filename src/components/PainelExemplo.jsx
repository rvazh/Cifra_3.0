import imagemPainel from '../assets/painel-principal.webp';
import './PainelExemplo.css';

// Dois cartões flutuantes: um de entradas (ganhos) e um de saídas (gastos)
const entradas = [
  { nome: 'Adriana', valor: '+ R$ 312,80' },
  { nome: 'Guilherme (Extra)', valor: '+ R$ 500,00' },
  { nome: 'Salário', valor: '+ R$ 5.200,00' },
];

const saidas = [
  { nome: 'Mercado', valor: '− R$ 812,90' },
  { nome: 'Conta de luz', valor: '− R$ 189,40' },
  { nome: 'Parcela Carro', valor: '− R$ 1.390,99' },
];

function CartaoLancamentos({ titulo, itens, tipo }) {
  return (
    <div className={`painel__ultimos painel__ultimos--${tipo}`}>
      <div className="painel__ultimos-titulo">{titulo}</div>
      {itens.map(({ nome, valor }) => (
        <div key={nome} className="lancamento">
          <span className="lancamento__nome">{nome}</span>
          <span className={`lancamento__valor lancamento__valor--${tipo}`}>{valor}</span>
        </div>
      ))}
    </div>
  );
}

export default function PainelExemplo() {
  return (
    <div className="painel">
      {/* Imagem real do Painel principal, dentro de uma "janela" */}
      <div className="painel__janela">
        <div className="painel__barra" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <img
          className="painel__imagem"
          src={imagemPainel}
          alt="Painel principal da CIFRA com saldo, receitas, despesas, gráfico e contas a pagar"
          width="1600"
          height="1000"
        />
      </div>

      <CartaoLancamentos titulo="Últimas Entradas / Ganhos" itens={entradas} tipo="entrada" />
      <CartaoLancamentos titulo="Últimas Saídas / Gastos" itens={saidas} tipo="saida" />
    </div>
  );
}
