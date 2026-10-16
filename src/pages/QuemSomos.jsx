import logoCifra from '../assets/cifra-logo.png';
import { IconeCalendario, IconeBandeira, IconeSeta } from '../components/Icones.jsx';
import { EMAIL_CONTATO } from '../config.js';
import './QuemSomos.css';


// Etapas da linha do tempo ("Nossa história")
const etapas = [
  {
    titulo: 'A ideia',
    texto: 'A CIFRA começou em 2024 como uma planilha pessoal e, com o tempo, evoluiu até virar um software.',
  },
  {
    titulo: 'A primeira versão',
    texto: 'O que era de uso próprio virou um site, para que mais pessoas pudessem cuidar do dinheiro com clareza.',
  },
  {
    titulo: 'Os primeiros testes',
    texto: 'Um grupo pequeno de pessoas está usando a CIFRA, e cada sugestão ajuda a deixar tudo melhor.',
  },
  {
    titulo: 'Os próximos passos',
    texto: 'Novos planos, novas ideias e muita inovação estão por vir.',
  },
];

export default function QuemSomos() {
  return (
    <>
      {/* ===== Destaque ===== */}
      <section className="qs-hero">
        <div className="container qs-hero__conteudo">
          <div className="qs-hero__texto">
            <h1 className="qs-hero__titulo">Quem somos</h1>
            <p className="qs-hero__descricao">
              A CIFRA é uma startup com um organizador financeiro que te ajuda a dar pequenos
              passos para ter uma trajetória de vida melhor, auxiliando nas finanças, na rotina e
              no bem-estar.
            </p>

            <div className="qs-hero__etiquetas">
              <span className="qs-etiqueta">
                <IconeCalendario tamanho={16} cor="#EAAF5A" espessura={2.2} />
                Nasceu em 2026
              </span>
              <span className="qs-etiqueta">
                <IconeBandeira tamanho={16} cor="#EAAF5A" espessura={2.2} />
                Feito no Brasil
              </span>
            </div>
          </div>

          {/* Cartão preto com a logo */}
          <div className="qs-marca" aria-hidden="true">
            <span className="qs-marca__fundo">
              <img src={logoCifra} alt="" />
            </span>
            <span className="qs-marca__nome">CIFRA</span>
            <span className="qs-marca__frase">Gerenciador financeiro de verdade</span>
          </div>
        </div>
      </section>

      {/* ===== Nossa história ===== */}
      <section className="container historia">
        <div className="historia__texto">
          <span className="historia__rotulo">Sobre a gente</span>
          <h2 className="historia__titulo">Nossa história</h2>
          <p className="historia__abertura">
            Um projeto independente, que cresce passo a passo, ouvindo quem usa.
          </p>
          <p>
            Sabemos que uma vida melhor começa com pequenas atitudes. Cuidar da saúde física e
            mental, cultivar bons relacionamentos e manter as finanças em equilíbrio são passos
            fundamentais para construir o futuro que desejamos. Ainda assim, entre saber o que
            precisa ser feito e transformar esse conhecimento em ação, existe um desafio: dar o
            primeiro passo.
          </p>
          <p>
            Dentro de cada um de nós existe a vontade de evoluir, superar limites e alcançar novos
            objetivos. Queremos ter mais controle sobre nossas escolhas, organizar nossas
            prioridades e enxergar com clareza o caminho que devemos seguir. Queremos aproveitar o
            presente com consciência, sem deixar de preparar o amanhã.
          </p>
          <p>E toda mudança começa com uma decisão: a de fazer diferente.</p>
          <p>
            <strong>Este é o seu momento.</strong> O momento de recuperar o controle, encontrar
            sua clareza e dar os primeiros passos em direção à vida que você deseja construir.
          </p>
          <p>
            <strong>
              Assuma o protagonismo da sua história. Nós estamos aqui para caminhar com você.
            </strong>
          </p>
          <p>A CIFRA é um gerenciador financeiro de verdade, e é isso que ela vai continuar sendo.</p>
        </div>

        {/* Linha do tempo */}
        <ol className="linha">
          {etapas.map((etapa, indice) => {
            const ultima = indice === etapas.length - 1;
            return (
              <li key={etapa.titulo} className={ultima ? 'linha__etapa linha__etapa--ultima' : 'linha__etapa'}>
                <span className="linha__marcador" aria-hidden="true">
                  <span className="linha__ponto" />
                  {!ultima && <span className="linha__traco" />}
                </span>
                <div className="linha__conteudo">
                  <h3 className="linha__titulo">{etapa.titulo}</h3>
                  <p className="linha__texto">{etapa.texto}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      {/* ===== Citação + contato ===== */}
      <section className="container qs-final" id="contato">
        <div className="qs-citacao">
          <span className="qs-citacao__enfeite" aria-hidden="true" />
          <p className="qs-citacao__frase">
            <span className="qs-citacao__aspas">“</span>
            Sempre buscamos melhorar a vida ao nosso redor. O que falta, às vezes, para conseguir
            isso é ter outra visão da nossa situação.
            <span className="qs-citacao__aspas">”</span>
          </p>
          <div className="qs-citacao__rodape">
            <span className="qs-citacao__texto">
              Dúvidas ou sugestões? <b>Fale com a gente.</b> Respondemos o mais rápido possível.
            </span>
            <a className="qs-citacao__botao" href={`mailto:${EMAIL_CONTATO}`}>
              Enviar mensagem
              <IconeSeta tamanho={18} cor="#141414" espessura={2.2} />
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
