import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import QRCode from 'qrcode';
import CelularInicio from '../components/CelularInicio.jsx';
import { IconeCheck, IconeSeta, IconeCelular, IconeMonitor, IconeBaixar } from '../components/Icones.jsx';
import { abertoComoApp, acabouDeInstalar, aparelhoAtual, instalarApp, podeInstalar } from '../dados/instalar.js';
import { estaLogado } from '../dados/acesso.js';
import './TesteGratis.css';
import './BaixarApp.css';

// Passo a passo de cada aparelho
const PASSOS = {
  android: {
    nome: 'Android',
    Icone: IconeCelular,
    navegador: 'No Chrome (ou Samsung Internet)',
    passos: [
      { titulo: 'Abra este site no celular', texto: 'Use o Chrome. Se estiver no computador, aponte a câmera do celular para o QR code ao lado.' },
      { titulo: 'Toque em "Instalar o app"', texto: 'Use o botão dourado no topo desta página. Se ele não aparecer, abra o menu ⋮ do Chrome e toque em "Instalar app" ou "Adicionar à tela inicial".' },
      { titulo: 'Confirme em "Instalar"', texto: 'Pronto: o ícone da CIFRA aparece junto com os seus outros aplicativos.' },
    ],
  },
  iphone: {
    nome: 'iPhone',
    Icone: IconeCelular,
    navegador: 'No Safari',
    passos: [
      { titulo: 'Abra este site no Safari', texto: 'Se estiver no computador, aponte a câmera do iPhone para o QR code ao lado.' },
      { titulo: 'Toque em Compartilhar', texto: 'É o quadrado com uma seta para cima, na barra de baixo (ou de cima) do Safari.' },
      { titulo: 'Toque em "Adicionar à Tela de Início"', texto: 'Role a lista para baixo até achar a opção. Depois toque em "Adicionar", no canto de cima.' },
    ],
  },
  computador: {
    nome: 'Computador',
    Icone: IconeMonitor,
    navegador: 'No Chrome ou no Edge',
    passos: [
      { titulo: 'Abra este site no Chrome ou no Edge', texto: 'No Windows, no Mac ou no Linux.' },
      { titulo: 'Clique em "Instalar o app"', texto: 'Use o botão dourado no topo desta página ou o ícone de instalar que aparece no fim da barra de endereço.' },
      { titulo: 'Pronto', texto: 'A CIFRA abre numa janela própria e fica no menu Iniciar (ou no Launchpad), como qualquer programa.' },
    ],
  },
};

const PERGUNTAS = [
  {
    pergunta: 'Por que não está na Play Store ou na App Store?',
    resposta:
      'A CIFRA é um app web: você instala direto do site, em segundos, sem passar por loja. Funciona igual a um app de loja: ícone na tela inicial, abre em tela cheia e atualiza sozinho.',
  },
  {
    pergunta: 'É a mesma conta do site?',
    resposta: 'Sim. Você entra com o mesmo e-mail e senha, e vê as mesmas contas, lançamentos e objetivos no celular e no computador.',
  },
  {
    pergunta: 'Ocupa muito espaço?',
    resposta: 'Quase nada — poucos megas, bem menos que um app de loja. E não precisa baixar atualização: a versão nova chega sozinha.',
  },
  {
    pergunta: 'Funciona sem internet?',
    resposta:
      'Abre sim, com o que já está no aparelho. O que você lançar sem internet fica guardado e é enviado para a sua conta quando a conexão voltar.',
  },
  {
    pergunta: 'Como desinstalar?',
    resposta: 'Igual a qualquer app: segure o ícone e escolha "Remover" ou "Desinstalar". A sua conta e os seus dados continuam salvos.',
  },
];

// Endereço que o QR code abre (esta mesma página, no celular)
function enderecoDestaPagina() {
  return `${window.location.origin}${window.location.pathname}#/baixar`;
}

export default function BaixarApp() {
  const [aba, setAba] = useState(aparelhoAtual);
  const [disponivel, setDisponivel] = useState(podeInstalar);
  const [jaInstalado, setJaInstalado] = useState(abertoComoApp); // abrindo pelo ícone do app
  const [instalou, setInstalou] = useState(acabouDeInstalar); // instalou agora, ainda no navegador
  const [mensagem, setMensagem] = useState('');
  const [qr, setQr] = useState('');
  const passosRef = useRef(null);
  const noComputador = aparelhoAtual() === 'computador';

  // O navegador pode oferecer a instalação depois que a página abriu
  useEffect(() => {
    const atualizar = () => {
      setDisponivel(podeInstalar());
      setJaInstalado(abertoComoApp());
      setInstalou(acabouDeInstalar());
    };
    window.addEventListener('cifra:instalacao', atualizar);
    return () => window.removeEventListener('cifra:instalacao', atualizar);
  }, []);

  // QR code para abrir no celular (só faz sentido no computador)
  useEffect(() => {
    if (!noComputador) return;
    QRCode.toString(enderecoDestaPagina(), { type: 'svg', margin: 1, color: { dark: '#141414', light: '#ffffff' } })
      .then(setQr)
      .catch(() => setQr(''));
  }, [noComputador]);

  async function instalar() {
    const resultado = await instalarApp();
    if (resultado === 'aceitou') setMensagem('Instalando… em instantes o ícone da CIFRA aparece na sua tela inicial. Abra por ele.');
    else if (resultado === 'recusou') setMensagem('Tudo bem! Quando quiser, é só tocar em "Instalar o app" de novo.');
    else verPassos();
  }

  function verPassos() {
    passosRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  const atual = PASSOS[aba];

  return (
    <>
      {/* ===== Destaque ===== */}
      <section className="tg-hero">
        <div className="container tg-hero__conteudo">
          <div className="tg-hero__texto">
            <span className="tg-hero__etiqueta">App CIFRA · grátis</span>
            <h1 className="tg-hero__titulo">Leve a CIFRA no seu celular</h1>
            <p className="tg-hero__descricao">
              Instale direto do site, em segundos — <b>sem loja de aplicativos</b>. O ícone fica na tela inicial, abre em
              tela cheia e está sempre na versão mais nova.
            </p>

            {jaInstalado ? (
              <p className="tg-hero__status baixar__status" role="status">
                <IconeCheck tamanho={14} cor="currentColor" espessura={3} /> Você já está usando o app da CIFRA.
              </p>
            ) : null}
            {mensagem && (
              <p className="tg-hero__status" role="status">
                {mensagem}
              </p>
            )}

            <div className="tg-hero__acoes">
              {jaInstalado ? (
                <Link to={estaLogado() ? '/painel' : '/entrar'} className="tg-botao">
                  {estaLogado() ? 'Ir para o meu painel' : 'Entrar na minha conta'}
                  <span className="tg-botao__seta">
                    <IconeSeta tamanho={18} cor="#141414" espessura={2.2} />
                  </span>
                </Link>
              ) : instalou ? null : disponivel ? (
                <button type="button" className="tg-botao tg-botao--dourado" onClick={instalar}>
                  Instalar o app
                  <span className="tg-botao__seta">
                    <IconeBaixar tamanho={18} cor="#eaaf5a" espessura={2.2} />
                  </span>
                </button>
              ) : (
                <button type="button" className="tg-botao tg-botao--dourado" onClick={verPassos}>
                  {aba === 'iphone' ? 'Ver como instalar no iPhone' : 'Ver como instalar'}
                  <span className="tg-botao__seta">
                    <IconeSeta tamanho={18} cor="#eaaf5a" espessura={2.2} />
                  </span>
                </button>
              )}
              <Link to="/entrar" className="tg-hero__link">
                Prefiro usar pelo navegador
              </Link>
            </div>

            <ul className="tg-hero__garantias">
              {['Grátis', 'Mesma conta do site', 'Atualiza sozinho'].map((t) => (
                <li key={t}>
                  <span className="tg-hero__check">
                    <IconeCheck tamanho={12} cor="currentColor" espessura={3} />
                  </span>
                  {t}
                </li>
              ))}
            </ul>
          </div>

          <div className="tg-hero__arte baixar__arte">
            <CelularInicio />
            {noComputador && qr && (
              <figure className="baixar__qr">
                <span className="baixar__qr-codigo" aria-hidden="true" dangerouslySetInnerHTML={{ __html: qr }} />
                <figcaption>
                  <b>Está no computador?</b>
                  Aponte a câmera do celular aqui para abrir esta página nele.
                </figcaption>
              </figure>
            )}
          </div>
        </div>
      </section>

      {/* ===== Passo a passo ===== */}
      <section className="tg-secao" ref={passosRef} id="como-instalar">
        <div className="container">
          <h2 className="tg-secao__titulo">Como instalar</h2>
          <p className="tg-secao__subtitulo">Escolha o seu aparelho. Leva menos de um minuto.</p>

          <div className="baixar__abas" role="tablist" aria-label="Aparelho">
            {Object.entries(PASSOS).map(([id, { nome, Icone }]) => (
              <button
                key={id}
                type="button"
                role="tab"
                id={`aba-${id}`}
                aria-selected={aba === id}
                aria-controls="baixar-passos"
                className={aba === id ? 'baixar__aba baixar__aba--ativa' : 'baixar__aba'}
                onClick={() => setAba(id)}
              >
                <Icone tamanho={18} espessura={2} />
                {nome}
              </button>
            ))}
          </div>

          <div id="baixar-passos" role="tabpanel" aria-labelledby={`aba-${aba}`} className="baixar__painel">
            <p className="baixar__navegador">{atual.navegador}</p>
            <ol className="baixar__passos">
              {atual.passos.map((p, i) => (
                <li key={p.titulo} className="baixar__passo">
                  <span className="baixar__numero">{i + 1}</span>
                  <span>
                    <b>{p.titulo}</b>
                    {p.texto}
                  </span>
                </li>
              ))}
            </ol>
            {disponivel && aba !== 'iphone' && !jaInstalado && !instalou && (
              <button type="button" className="tg-botao tg-botao--dourado baixar__botao-passos" onClick={instalar}>
                Instalar o app agora
                <span className="tg-botao__seta">
                  <IconeBaixar tamanho={18} cor="#eaaf5a" espessura={2.2} />
                </span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ===== Perguntas ===== */}
      <section className="tg-secao baixar__duvidas">
        <div className="container">
          <h2 className="tg-secao__titulo">Dúvidas comuns</h2>
          <div className="baixar__perguntas">
            {PERGUNTAS.map((p) => (
              <details key={p.pergunta} className="baixar__pergunta">
                <summary>{p.pergunta}</summary>
                <p>{p.resposta}</p>
              </details>
            ))}
          </div>
          <p className="baixar__rodape">
            Ainda não tem conta?{' '}
            <Link to="/cadastro" className="baixar__link">
              Crie a sua grátis
            </Link>{' '}
            e depois entre pelo app.
          </p>
        </div>
      </section>
    </>
  );
}
