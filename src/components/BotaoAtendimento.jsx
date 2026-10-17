import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { IconeAtendimento, IconeWhatsApp, IconeEmail } from './Icones.jsx';
import { EMAIL_SUPORTE, WHATSAPP_ATENDIMENTO } from '../config.js';
import './BotaoAtendimento.css';

const MENSAGEM = 'Olá! Vim pelo site da CIFRA e preciso de ajuda.';

// Botão flutuante no canto inferior direito: escolhe ser atendido pelo WhatsApp ou por e-mail
export default function BotaoAtendimento() {
  const [aberto, setAberto] = useState(false);
  // Dentro do sistema o botão tem efeito ao passar o mouse; nas telas antes do login é só o clique
  const noSistema = useLocation().pathname.startsWith('/painel');
  const caixa = useRef(null);
  const botao = useRef(null);

  // Fecha com Esc ou clicando fora
  useEffect(() => {
    if (!aberto) return undefined;
    const aoTeclar = (e) => {
      if (e.key === 'Escape') {
        setAberto(false);
        botao.current?.focus();
      }
    };
    const aoClicar = (e) => {
      if (!caixa.current?.contains(e.target) && !botao.current?.contains(e.target)) setAberto(false);
    };
    window.addEventListener('keydown', aoTeclar);
    document.addEventListener('mousedown', aoClicar);
    return () => {
      window.removeEventListener('keydown', aoTeclar);
      document.removeEventListener('mousedown', aoClicar);
    };
  }, [aberto]);

  const linkWhatsApp = `https://wa.me/${WHATSAPP_ATENDIMENTO.numero}?text=${encodeURIComponent(MENSAGEM)}`;
  // E-mail: abre o Gmail já com o e-mail de suporte, o assunto e uma mensagem inicial
  const linkEmail = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(EMAIL_SUPORTE)}&su=${encodeURIComponent('Atendimento CIFRA')}&body=${encodeURIComponent(MENSAGEM)}`;

  return (
    <div className="atd">
      {aberto && (
        <div ref={caixa} id="atd-opcoes" className="atd__caixa" role="dialog" aria-label="Fale com a gente">
          <div className="atd__topo">
            <b>Fale com a gente</b>
            <span>Escolha como prefere ser atendido.</span>
          </div>
          <a className="atd__opcao atd__opcao--whatsapp" href={linkWhatsApp} target="_blank" rel="noopener noreferrer" onClick={() => setAberto(false)}>
            <span className="atd__icone">
              <IconeWhatsApp tamanho={20} espessura={2} />
            </span>
            <span className="atd__textos">
              <b>WhatsApp</b>
              <small>{WHATSAPP_ATENDIMENTO.texto}</small>
            </span>
          </a>
          <a className="atd__opcao atd__opcao--email" href={linkEmail} target="_blank" rel="noopener noreferrer" onClick={() => setAberto(false)}>
            <span className="atd__icone">
              <IconeEmail tamanho={20} espessura={2} />
            </span>
            <span className="atd__textos">
              <b>E-mail</b>
              <small>{EMAIL_SUPORTE}</small>
            </span>
          </a>
        </div>
      )}

      <button
        ref={botao}
        type="button"
        className={['atd__botao', noSistema ? 'atd__botao--efeito' : '', aberto ? 'atd__botao--aberto' : ''].join(' ')}
        aria-expanded={aberto}
        aria-controls="atd-opcoes"
        aria-label={aberto ? 'Fechar atendimento' : 'Atendimento: WhatsApp ou e-mail'}
        title="Atendimento"
        onClick={() => setAberto(!aberto)}
      >
        {aberto ? (
          <span className="atd__x" aria-hidden="true">×</span>
        ) : (
          <IconeAtendimento tamanho={26} espessura={2} />
        )}
      </button>
    </div>
  );
}
