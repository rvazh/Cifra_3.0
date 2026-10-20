import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { TIPOS_DE_RELATO, enviarRelato } from '../dados/relatos.js';
import './RelatarProblema.css';

// Nome amigável da tela onde a pessoa estava (vai junto no relato)
const TELAS = {
  '/painel': 'Visão geral',
  '/painel/lancamentos': 'Lançamentos',
  '/painel/checklist': 'Checklist',
  '/painel/contas': 'Contas',
  '/painel/relatorios': 'Relatórios',
  '/painel/calendario': 'Calendário',
  '/painel/objetivos': 'Objetivos',
  '/painel/calculadora': 'Calculadora',
  '/painel/receber': 'A receber',
  '/painel/pagar': 'A pagar',
  '/painel/comprovantes': 'Comprovantes',
  '/painel/cursos': 'Cursos',
  '/painel/noticias': 'Notícias',
  '/painel/configuracoes': 'Configurações',
};

// Janela "Relatar problema": tipo, o que aconteceu e (opcional) dados do aparelho
export default function RelatarProblema({ aoFechar }) {
  const { pathname } = useLocation();
  const [tipo, setTipo] = useState('problema');
  const [mensagem, setMensagem] = useState('');
  const [aparelho, setAparelho] = useState(true);
  const [estado, setEstado] = useState('escrevendo'); // escrevendo | enviando | enviado
  const [erro, setErro] = useState('');
  const tela = TELAS[pathname] || pathname;

  // Fecha com Esc
  useEffect(() => {
    const aoTeclar = (e) => e.key === 'Escape' && aoFechar();
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, [aoFechar]);

  async function enviar(evento) {
    evento.preventDefault();
    setErro('');
    setEstado('enviando');
    try {
      await enviarRelato({ tipo, mensagem, tela, incluirAparelho: aparelho });
      setEstado('enviado');
    } catch (e) {
      setEstado('escrevendo');
      setErro(e.message);
    }
  }

  const dica =
    tipo === 'problema'
      ? 'O que você estava fazendo e o que aconteceu? Ex.: "Cliquei em Salvar no lançamento e nada aconteceu."'
      : tipo === 'sugestao'
        ? 'O que faria a CIFRA ficar melhor para você?'
        : 'Escreva aqui.';

  return createPortal(
    <div className="rp-fundo" onClick={aoFechar}>
      <form
        className="rp-janela"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rp-titulo"
        onSubmit={enviar}
        onClick={(e) => e.stopPropagation()}
        noValidate
      >
        <div className="rp-topo">
          <h2 id="rp-titulo">{estado === 'enviado' ? 'Recebemos, obrigado!' : 'Relatar problema'}</h2>
          <button type="button" className="rp-fechar" onClick={aoFechar} aria-label="Fechar">
            ×
          </button>
        </div>

        {estado === 'enviado' ? (
          <>
            <p className="rp-texto">
              Seu relato chegou para a equipe da CIFRA. Se precisarmos de mais detalhes, falamos com você pelo e-mail da sua
              conta.
            </p>
            <div className="rp-acoes">
              <button type="button" className="rp-botao rp-botao--principal" onClick={aoFechar}>
                Fechar
              </button>
            </div>
          </>
        ) : (
          <>
            <fieldset className="rp-tipos">
              <legend className="rp-rotulo">Sobre o quê?</legend>
              {TIPOS_DE_RELATO.map((t) => (
                <label key={t.id} className={tipo === t.id ? 'rp-tipo rp-tipo--ativo' : 'rp-tipo'}>
                  <input type="radio" name="rp-tipo" value={t.id} checked={tipo === t.id} onChange={() => setTipo(t.id)} />
                  {t.texto}
                </label>
              ))}
            </fieldset>

            <label className="rp-campo">
              <span className="rp-rotulo">Conte para a gente</span>
              <textarea
                id="rp-mensagem"
                autoFocus
                rows={5}
                maxLength={4000}
                placeholder={dica}
                value={mensagem}
                onChange={(e) => {
                  setMensagem(e.target.value);
                  setErro('');
                }}
              />
            </label>

            <label className="rp-marcar">
              <input type="checkbox" checked={aparelho} onChange={(e) => setAparelho(e.target.checked)} />
              <span>
                Enviar junto a tela atual (<b>{tela}</b>) e o modelo do navegador. Ajuda a achar o problema. Seus valores e
                lançamentos <b>não</b> são enviados.
              </span>
            </label>

            {erro && (
              <p className="rp-erro" role="alert">
                {erro}
              </p>
            )}

            <div className="rp-acoes">
              <button type="submit" className="rp-botao rp-botao--principal" disabled={estado === 'enviando'}>
                {estado === 'enviando' ? 'Enviando…' : 'Enviar'}
              </button>
              <button type="button" className="rp-botao" onClick={aoFechar}>
                Cancelar
              </button>
            </div>
          </>
        )}
      </form>
    </div>,
    document.body
  );
}
