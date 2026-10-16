import { useEffect, useState } from 'react';
import { reais } from './Graficos.jsx';
import { criarTransferencia, dataDeHoje } from '../dados/lancamentos.js';
import { mesmoNome } from '../dados/contas.js';
import './Transferir.css';

function lerValor(texto) {
  const n = parseFloat(String(texto).replace(/\s|R\$/gi, '').replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? Math.abs(n) : 0;
}

// Janela para mandar dinheiro de uma conta para outra (também usada para pagar a fatura do cartão)
export default function Transferir({ contas, inicial = {}, aoConfirmar, aoFechar }) {
  const nomes = contas.map((c) => c.nome);
  const [de, setDe] = useState(inicial.de || nomes.find((n) => n !== inicial.para) || '');
  const [para, setPara] = useState(inicial.para || nomes.find((n) => n !== (inicial.de || nomes[0])) || '');
  const [valorTexto, setValorTexto] = useState(inicial.valor ? inicial.valor.toFixed(2).replace('.', ',') : '');
  const [data, setData] = useState(dataDeHoje());
  const [descricao, setDescricao] = useState(inicial.descricao || '');
  const [erro, setErro] = useState('');

  useEffect(() => {
    const aoTeclar = (e) => e.key === 'Escape' && aoFechar();
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, [aoFechar]);

  function trocar() {
    setDe(para);
    setPara(de);
  }

  function salvar(e) {
    e.preventDefault();
    const valor = lerValor(valorTexto);
    if (!de || !para) return setErro('Escolha as duas contas.');
    if (mesmoNome(de, para)) return setErro('Escolha duas contas diferentes.');
    if (!valor) return setErro('Coloque o valor, por exemplo 200,00.');
    if (!data) return setErro('Escolha a data.');
    aoConfirmar(criarTransferencia({ de, para, valor, data, descricao: descricao.trim() }), { de, para, valor });
    return undefined;
  }

  return (
    <div className="trf-fundo" onClick={aoFechar}>
      <form className="trf" role="dialog" aria-modal="true" aria-labelledby="trf-titulo" onSubmit={salvar} onClick={(e) => e.stopPropagation()}>
        <div className="trf__topo">
          <div>
            <h2 id="trf-titulo">{inicial.titulo || 'Transferir entre contas'}</h2>
            <p>O dinheiro só muda de lugar: não entra como gasto nem como ganho.</p>
          </div>
          <button type="button" className="trf__fechar" onClick={aoFechar} aria-label="Fechar">
            ×
          </button>
        </div>

        {nomes.length < 2 ? (
          <p className="trf__aviso">Você precisa de pelo menos duas contas para transferir. Crie outra conta primeiro.</p>
        ) : (
          <>
            <div className="trf__contas">
              <label className="trf__campo">
                De
                <select value={de} onChange={(e) => setDe(e.target.value)}>
                  {nomes.map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
              </label>
              <button type="button" className="trf__trocar" onClick={trocar} aria-label="Trocar as contas de lugar" title="Trocar">
                ⇄
              </button>
              <label className="trf__campo">
                Para
                <select value={para} onChange={(e) => setPara(e.target.value)}>
                  {nomes.map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="trf__dupla">
              <label className="trf__campo">
                Valor (R$)
                <input
                  autoFocus={!inicial.valor}
                  inputMode="decimal"
                  placeholder="0,00"
                  value={valorTexto}
                  onChange={(e) => {
                    setValorTexto(e.target.value);
                    setErro('');
                  }}
                />
              </label>
              <label className="trf__campo">
                Data
                <input type="date" value={data} onChange={(e) => setData(e.target.value)} />
              </label>
            </div>

            <label className="trf__campo">
              Descrição (opcional)
              <input placeholder="Ex.: Guardar na poupança" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
            </label>

            {lerValor(valorTexto) > 0 && de && para && !mesmoNome(de, para) && (
              <p className="trf__resumo">
                {reais(lerValor(valorTexto))} sai de <b>{de}</b> e entra em <b>{para}</b>
                {data > dataDeHoje() ? ' (agendada: fica pendente até a data)' : ''}.
              </p>
            )}
          </>
        )}

        {erro && <p className="trf__erro">{erro}</p>}

        <div className="trf__acoes">
          <button type="button" className="trf__cancelar" onClick={aoFechar}>
            Cancelar
          </button>
          {nomes.length >= 2 && (
            <button type="submit" className="trf__salvar">
              {inicial.botao || 'Transferir'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
