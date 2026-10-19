import { useRef, useState } from 'react';
import { FUNDOS, fotoDeFundo, guardarFotoDeFundo, apagarFotoDeFundo, aplicarFundo } from '../dados/preferencias.js';
import './EscolherFundo.css';

// Janela das Configurações para trocar o fundo do painel: cores, padrões ou uma foto da pessoa.
// Cada escolha já vale na hora (aoEscolher salva nas preferências).
export default function EscolherFundo({ atual, aoEscolher, aoFechar }) {
  const [foto, setFoto] = useState(fotoDeFundo);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const campoArquivo = useRef(null);

  function escolher(id) {
    setErro('');
    aoEscolher(id);
    aplicarFundo(id);
  }

  async function arquivoEscolhido(e) {
    const arquivo = e.target.files?.[0];
    e.target.value = '';
    if (!arquivo) return;
    setErro('');
    setEnviando(true);
    try {
      setFoto(await guardarFotoDeFundo(arquivo));
      escolher('foto');
    } catch (falha) {
      setErro(falha.message);
    } finally {
      setEnviando(false);
    }
  }

  function tirarFoto() {
    apagarFotoDeFundo();
    setFoto('');
    escolher('padrao');
  }

  return (
    <div className="cfg-fundo" onClick={aoFechar}>
      <div className="cfg-janela fnd" role="dialog" aria-modal="true" aria-labelledby="fnd-titulo" onClick={(e) => e.stopPropagation()}>
        <div className="cfg-janela__topo">
          <h2 id="fnd-titulo">Fundo do painel</h2>
          <button type="button" className="cfg-janela__fechar" onClick={aoFechar} aria-label="Fechar">
            ×
          </button>
        </div>
        <p className="fnd__dica">Aparece atrás das telas do sistema. Vale neste e nos seus outros aparelhos.</p>

        <div className="fnd__grade" role="radiogroup" aria-label="Fundos prontos">
          {FUNDOS.map((f) => (
            <button
              key={f.id}
              type="button"
              role="radio"
              aria-checked={atual === f.id}
              className={atual === f.id ? 'fnd__opcao fnd__opcao--ativa' : 'fnd__opcao'}
              onClick={() => escolher(f.id)}
            >
              <span className="fnd__amostra" style={{ background: f.css }} aria-hidden="true" />
              {f.nome}
            </button>
          ))}
        </div>

        <div className="fnd__foto">
          <div className="fnd__foto-topo">
            <b>Sua foto</b>
            <span>JPG, PNG ou WEBP. A CIFRA clareia a foto para os textos continuarem fáceis de ler.</span>
          </div>
          {foto && (
            <button
              type="button"
              role="radio"
              aria-checked={atual === 'foto'}
              className={atual === 'foto' ? 'fnd__previa fnd__previa--ativa' : 'fnd__previa'}
              style={{ backgroundImage: `url("${foto}")` }}
              onClick={() => escolher('foto')}
            >
              <span>{atual === 'foto' ? 'Em uso' : 'Usar esta foto'}</span>
            </button>
          )}
          <div className="fnd__acoes">
            <button type="button" className="cfg-botao cfg-botao--principal" onClick={() => campoArquivo.current?.click()} disabled={enviando}>
              {enviando ? 'Preparando a foto…' : foto ? 'Trocar foto' : 'Colocar uma foto'}
            </button>
            {foto && (
              <button type="button" className="cfg-botao" onClick={tirarFoto}>
                Tirar foto
              </button>
            )}
          </div>
          <input
            ref={campoArquivo}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            hidden
            onChange={arquivoEscolhido}
          />
          {erro && (
            <p className="fnd__erro" role="alert">
              {erro}
            </p>
          )}
        </div>

        <div className="cfg-janela__acoes">
          <button type="button" className="cfg-botao" onClick={aoFechar}>
            Pronto
          </button>
        </div>
      </div>
    </div>
  );
}
