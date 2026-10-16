import { Link } from 'react-router-dom';
import {
  IconeCadeado,
  IconeBandeira,
  IconeRepetir,
  IconeCartao,
  IconeBackup,
  IconeSeta,
} from './Icones.jsx';
import './Objetivos.css';

const objetivos = [
  {
    Icone: IconeCadeado,
    titulo: 'Sair de um "poço" financeiro',
    texto:
      'Se organizar financeiramente te ajuda a tomar decisões melhores e seguir um caminho próspero.',
  },
  {
    Icone: IconeBandeira,
    titulo: 'Atingir metas financeiras',
    texto:
      'As metas podem ser comprar um carro, guardar para a aquisição de uma casa ou fazer o seu "colchão" financeiro.',
  },
  {
    Icone: IconeRepetir,
    titulo: 'Acabar com vícios de finanças',
    texto:
      'Sempre tem um gasto recorrente, como delivery, o carrinho de compras ou até mesmo algumas saídas a mais no fim de semana.',
  },
  {
    Icone: IconeCartao,
    titulo: 'Gastos com cartão de crédito',
    texto:
      'Ele pode ser de grande ajuda, mas também pode te afundar ainda mais, por isso exige cuidado.',
  },
  {
    Icone: IconeBackup,
    titulo: 'Subir o nível da sua gestão',
    texto:
      'Se você já administra o seu financeiro, a CIFRA pode te ajudar a chegar a outro nível de prosperidade e gestão.',
  },
  {
    Icone: IconeCadeado,
    titulo: 'Segurança maior',
    texto: 'A insegurança financeira geralmente vem de não conhecer as suas próprias finanças.',
  },
];

export default function Objetivos() {
  return (
    <section className="objetivos">
      <div className="container objetivos__conteudo">
        <div className="objetivos__cabecalho">
          <span className="objetivos__rotulo">E tem mais</span>
          <h2 className="objetivos__titulo">
            Objetivos que a CIFRA te ajuda <br />a atingir!
          </h2>
          <p className="objetivos__subtitulo">
            Recursos que deixam o seu controle financeiro ainda mais completo.
          </p>
        </div>

        <div className="objetivos__grade">
          {objetivos.map(({ Icone, titulo, texto }) => (
            <article key={titulo} className="objetivo">
              <Icone tamanho={30} cor="#8c5a10" espessura={1.8} />
              <h3 className="objetivo__titulo">{titulo}</h3>
              <p className="objetivo__texto">{texto}</p>
            </article>
          ))}

          {/* O botão ocupa o espaço das duas últimas colunas */}
          <div className="objetivos__acao">
            <Link to="/entrar" className="objetivos__botao">
              Atinja os seus objetivos hoje
              <IconeSeta tamanho={22} cor="#141414" espessura={2.2} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
