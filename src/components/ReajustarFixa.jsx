import { useEffect, useState } from 'react';
import { reais } from './Graficos.jsx';
import { dataDeHoje, historicoDaFixa, mudarMes, nomeDoMes, reajustarFixa } from '../dados/lancamentos.js';
import './ReajustarFixa.css';

// "2026-10" -> "out/2026"
function mesCurto(mes) {
  const nome = new Date(Number(mes.slice(0, 4)), Number(mes.slice(5, 7)) - 1, 1)
    .toLocaleDateString('pt-BR', { month: 'short' })
    .replace('.', '');
  return `${nome}/${mes.slice(0, 4)}`;
}

function lerValor(texto) {
  const n = parseFloat(String(texto).replace(/\s|R\$/gi, '').replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? Math.abs(n) : 0;
}

// Janela para mudar o valor de uma conta fixa a partir de um mês, sem mexer nos meses anteriores
export default function ReajustarFixa({ modelo, lista, aoSalvar, aoFechar }) {
  const historico = historicoDaFixa(modelo, lista);
  const atual = historico[historico.length - 1] || { id: modelo.id, inicio: modelo.data.slice(0, 7), fim: null, valor: modelo.valor };
  const primeiroMes = atual.inicio; // não dá para reajustar antes da versão que está valendo
  const mesAtual = dataDeHoje().slice(0, 7);
  const [valorTexto, setValorTexto] = useState(Math.abs(atual.valor).toFixed(2).replace('.', ','));
  const [aPartirDe, setAPartirDe] = useState(mesAtual > primeiroMes ? mesAtual : primeiroMes);
  const [erro, setErro] = useState('');

  useEffect(() => {
    const aoTeclar = (e) => e.key === 'Escape' && aoFechar();
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, [aoFechar]);

  // Opções de mês: da versão atual até 12 meses depois de hoje
  const meses = [];
  for (let m = primeiroMes; m <= mudarMes(mesAtual, 12); m = mudarMes(m, 1)) meses.push(m);

  const novoValor = lerValor(valorTexto);
  const diferenca = novoValor - Math.abs(atual.valor);
  const porcento = Math.abs(atual.valor) > 0 ? (diferenca / Math.abs(atual.valor)) * 100 : 0;

  function salvar(e) {
    e.preventDefault();
    if (!novoValor) return setErro('Coloque o novo valor, por exemplo 1.550,00.');
    if (Math.abs(diferenca) < 0.005) return setErro('O valor novo é igual ao atual.');
    aoSalvar(reajustarFixa(lista, modelo, novoValor, aPartirDe), { novoValor, aPartirDe });
    return undefined;
  }

  return (
    <div className="rjt-fundo" onClick={aoFechar}>
      <form className="rjt" role="dialog" aria-modal="true" aria-labelledby="rjt-titulo" onSubmit={salvar} onClick={(e) => e.stopPropagation()}>
        <div className="rjt__topo">
          <div>
            <h2 id="rjt-titulo">Reajustar conta fixa</h2>
            <p>
              {modelo.descricao} · hoje {reais(Math.abs(atual.valor))} por mês
            </p>
          </div>
          <button type="button" className="rjt__fechar" onClick={aoFechar} aria-label="Fechar">
            ×
          </button>
        </div>

        <div className="rjt__dupla">
          <label className="rjt__campo">
            Novo valor (R$)
            <input
              autoFocus
              inputMode="decimal"
              value={valorTexto}
              onChange={(e) => {
                setValorTexto(e.target.value);
                setErro('');
              }}
            />
          </label>
          <label className="rjt__campo">
            A partir de
            <select value={aPartirDe} onChange={(e) => setAPartirDe(e.target.value)}>
              {meses.map((m) => (
                <option key={m} value={m}>
                  {nomeDoMes(m)}
                </option>
              ))}
            </select>
          </label>
        </div>

        {novoValor > 0 && Math.abs(diferenca) >= 0.005 && (
          <p className={diferenca > 0 ? 'rjt__diferenca rjt__diferenca--sobe' : 'rjt__diferenca rjt__diferenca--desce'}>
            {diferenca > 0 ? 'Aumento' : 'Redução'} de {reais(Math.abs(diferenca))} ({Math.abs(porcento).toFixed(1).replace('.', ',')}%) a
            partir de {nomeDoMes(aPartirDe).toLowerCase()}. Os meses anteriores continuam com o valor antigo.
          </p>
        )}

        <div className="rjt__historico">
          <span className="rjt__subtitulo">Histórico de valores</span>
          <ol>
            {historico.map((h) => (
              <li key={h.id}>
                <span>
                  {mesCurto(h.inicio)} – {h.fim ? mesCurto(h.fim) : 'hoje'}
                </span>
                <b>{reais(Math.abs(h.valor))}</b>
              </li>
            ))}
          </ol>
        </div>

        {erro && <p className="rjt__erro">{erro}</p>}

        <div className="rjt__acoes">
          <button type="button" className="rjt__cancelar" onClick={aoFechar}>
            Cancelar
          </button>
          <button type="submit" className="rjt__salvar">
            Salvar reajuste
          </button>
        </div>
      </form>
    </div>
  );
}
