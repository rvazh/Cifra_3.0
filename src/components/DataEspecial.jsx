import { useState } from 'react';
import { mascaraValor } from '../dados/dinheiro.js';
import { EMOJIS_PESSOAIS } from '../dados/datasAnuais.js';

// Formulário "Data especial" do calendário: aniversário, viagem, casamento...
// Se tiver gasto a mais, o dia fica com a cor das datas sazonais e o mês ganha o aviso.
// Usa os estilos do formulário de evento do calendário (Calendario.css, classes cal-evento).
export default function DataEspecial({ data, aoSalvar, aoFechar }) {
  const [nome, setNome] = useState('');
  const [emoji, setEmoji] = useState(EMOJIS_PESSOAIS[0]);
  const [anual, setAnual] = useState(true);
  const [gasto, setGasto] = useState(false);
  const [valorTexto, setValorTexto] = useState('');
  const [erro, setErro] = useState('');

  function salvar(e) {
    e.preventDefault();
    const nomeLimpo = nome.trim();
    if (!nomeLimpo) return setErro('Dê um nome, por exemplo "Aniversário da Ana".');
    if (nomeLimpo.length > 60) return setErro('Use um nome com até 60 letras.');
    const valor = gasto ? Math.abs(parseFloat(valorTexto.replace(/\./g, '').replace(',', '.'))) || 0 : 0;
    aoSalvar({ data, nome: nomeLimpo, emoji, anual, gasto, valor });
    return undefined;
  }

  return (
    <form className="cal-evento cal-especial" onSubmit={salvar} noValidate>
      <div className="cal-evento__topo">
        <b>Nova data especial</b>
        <button type="button" className="cal-evento__fechar" onClick={aoFechar} aria-label="Fechar">
          ×
        </button>
      </div>

      <label className="cal-evento__campo">
        <span>Nome</span>
        <input
          id="cal-especial-nome"
          autoFocus
          maxLength={60}
          placeholder="Ex.: Aniversário da Ana, viagem, casamento"
          value={nome}
          onChange={(e) => {
            setNome(e.target.value);
            setErro('');
          }}
        />
      </label>

      <div className="cal-especial__emojis" role="radiogroup" aria-label="Ícone">
        {EMOJIS_PESSOAIS.map((e) => (
          <button
            key={e}
            type="button"
            role="radio"
            aria-checked={emoji === e}
            className={emoji === e ? 'cal-especial__emoji cal-especial__emoji--ativo' : 'cal-especial__emoji'}
            onClick={() => setEmoji(e)}
          >
            {e}
          </button>
        ))}
      </div>

      <div className="cal-evento__opcoes" role="group" aria-label="Repetir">
        <button
          type="button"
          aria-pressed={!anual}
          className={!anual ? 'cal-evento__opcao cal-evento__opcao--ativa' : 'cal-evento__opcao'}
          onClick={() => setAnual(false)}
        >
          Só neste ano
        </button>
        <button
          type="button"
          aria-pressed={anual}
          className={anual ? 'cal-evento__opcao cal-evento__opcao--ativa' : 'cal-evento__opcao'}
          onClick={() => setAnual(true)}
        >
          Todo ano
        </button>
      </div>

      <label className="cal-especial__gasto">
        <input type="checkbox" checked={gasto} onChange={(e) => setGasto(e.target.checked)} />
        <span>
          <b>Vai ter gasto a mais</b>
          <small>O dia fica colorido e o mês ganha um aviso para você se planejar.</small>
        </span>
      </label>

      {gasto && (
        <label className="cal-evento__campo">
          <span>Quanto pretende gastar (opcional)</span>
          <input
            id="cal-especial-valor"
            inputMode="decimal"
            placeholder="0,00"
            value={valorTexto}
            onChange={(e) => setValorTexto(mascaraValor(e.target.value))}
          />
        </label>
      )}

      {erro && (
        <p className="cal-dia__erro" role="alert">
          {erro}
        </p>
      )}

      <button type="submit" className="cal-evento__salvar">
        Salvar data
      </button>
    </form>
  );
}
