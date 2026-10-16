import { useEffect, useState } from 'react';
import { reais } from './Graficos.jsx';
import ReajustarFixa from './ReajustarFixa.jsx';
import { carregar, salvar, dataDeHoje, encerrarFixa, listarFixas, mudarMes, nomeDoMes, reativarFixa, categoria } from '../dados/lancamentos.js';
import { conferirAlertasAgora } from '../dados/alertas.js';
import './ReajustarFixa.css';
import './ContasFixas.css';

// "2026-10" -> "out/2026"
export function mesCurto(mes) {
  const nome = new Date(Number(mes.slice(0, 4)), Number(mes.slice(5, 7)) - 1, 1)
    .toLocaleDateString('pt-BR', { month: 'short' })
    .replace('.', '');
  return `${nome}/${mes.slice(0, 4)}`;
}

// ===== Janela: encerrar uma conta fixa a partir de um mês =====
export function EncerrarFixa({ modelo, lista, aoSalvar, aoFechar }) {
  const mesAtual = dataDeHoje().slice(0, 7);
  const primeiro = modelo.data.slice(0, 7) > mesAtual ? modelo.data.slice(0, 7) : mesAtual;
  const [aPartirDe, setAPartirDe] = useState(mudarMes(primeiro, 1));

  useEffect(() => {
    const aoTeclar = (e) => e.key === 'Escape' && aoFechar();
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, [aoFechar]);

  // Dá para encerrar a partir deste mês até 24 meses à frente
  const meses = [];
  for (let m = primeiro; m <= mudarMes(mesAtual, 24); m = mudarMes(m, 1)) meses.push(m);
  const ultima = mudarMes(aPartirDe, -1);
  const entrada = modelo.valor > 0;

  function confirmar(e) {
    e.preventDefault();
    aoSalvar(encerrarFixa(lista, modelo, aPartirDe), { aPartirDe });
  }

  return (
    <div className="rjt-fundo" onClick={aoFechar}>
      <form className="rjt" role="dialog" aria-modal="true" aria-labelledby="enc-titulo" onSubmit={confirmar} onClick={(e) => e.stopPropagation()}>
        <div className="rjt__topo">
          <div>
            <h2 id="enc-titulo">{entrada ? 'Encerrar receita fixa' : 'Encerrar conta fixa'}</h2>
            <p>
              {modelo.descricao} · {reais(Math.abs(modelo.valor))} por mês
            </p>
          </div>
          <button type="button" className="rjt__fechar" onClick={aoFechar} aria-label="Fechar">
            ×
          </button>
        </div>

        <label className="rjt__campo">
          Parar a partir de
          <select autoFocus value={aPartirDe} onChange={(e) => setAPartirDe(e.target.value)}>
            {meses.map((m) => (
              <option key={m} value={m}>
                {nomeDoMes(m)}
              </option>
            ))}
          </select>
        </label>

        <p className="rjt__diferenca enc__resumo">
          {ultima >= modelo.data.slice(0, 7) ? (
            <>
              A última {entrada ? 'entrada' : 'cobrança'} será em <b>{nomeDoMes(ultima).toLowerCase()}</b>. De{' '}
              {nomeDoMes(aPartirDe).toLowerCase()} em diante ela some do Calendário, do Checklist e das previsões.
            </>
          ) : (
            <>Ela sai de todos os meses, já que ainda não começou.</>
          )}{' '}
          Os meses já pagos continuam no histórico.
        </p>

        <div className="rjt__acoes">
          <button type="button" className="rjt__cancelar" onClick={aoFechar}>
            Cancelar
          </button>
          <button type="submit" className="rjt__salvar enc__botao">
            Encerrar
          </button>
        </div>
      </form>
    </div>
  );
}

// ===== Janela das Configurações: todas as contas fixas, com reajustar, encerrar e reativar =====
export default function ContasFixas({ aoFechar, aoMudar }) {
  const [lista, setLista] = useState(carregar);
  const [acao, setAcao] = useState(null); // { tipo: 'reajustar' | 'encerrar', modelo }
  const [aviso, setAviso] = useState('');
  const fixas = listarFixas(lista);

  useEffect(() => {
    if (acao) return undefined;
    const aoTeclar = (e) => e.key === 'Escape' && aoFechar();
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, [acao, aoFechar]);

  function guardar(nova, texto) {
    salvar(nova);
    setLista(nova);
    setAcao(null);
    setAviso(texto);
    conferirAlertasAgora();
    aoMudar?.();
  }

  return (
    <div className="cfg-fundo" onClick={aoFechar}>
      <div className="cfg-janela cfx" role="dialog" aria-modal="true" aria-labelledby="cfx-titulo" onClick={(e) => e.stopPropagation()}>
        <div className="cfg-janela__topo">
          <h2 id="cfx-titulo">Contas fixas</h2>
          <button type="button" className="cfg-janela__fechar" onClick={aoFechar} aria-label="Fechar">
            ×
          </button>
        </div>
        <p className="cfg-janela__nota">Tudo o que você marcou como “Repete todo mês”. Reajuste o valor ou encerre a partir de um mês.</p>

        {fixas.length === 0 ? (
          <p className="cfx__vazio">Nenhuma conta fixa ainda. Ao lançar, marque “Repete todo mês”.</p>
        ) : (
          <ul className="cfx__lista">
            {fixas.map(({ modelo, inicio, encerradaEm }) => {
              const cat = categoria(modelo.categoria);
              return (
                <li key={modelo.id} className={encerradaEm ? 'cfx__item cfx__item--encerrada' : 'cfx__item'}>
                  <span className="cfx__icone" style={{ background: cat.cor }} aria-hidden="true">
                    {cat.emoji}
                  </span>
                  <span className="cfx__textos">
                    <b>{modelo.descricao}</b>
                    <small>
                      {reais(Math.abs(modelo.valor))}/mês · {modelo.conta} ·{' '}
                      {encerradaEm ? `encerrada a partir de ${mesCurto(encerradaEm)}` : `desde ${mesCurto(inicio)}`}
                    </small>
                  </span>
                  <span className="cfx__botoes">
                    {encerradaEm ? (
                      <button type="button" onClick={() => guardar(reativarFixa(lista, modelo), `${modelo.descricao} voltou a repetir todo mês.`)}>
                        Reativar
                      </button>
                    ) : (
                      <>
                        <button type="button" onClick={() => setAcao({ tipo: 'reajustar', modelo })}>
                          Reajustar
                        </button>
                        <button type="button" className="cfx__encerrar" onClick={() => setAcao({ tipo: 'encerrar', modelo })}>
                          Encerrar
                        </button>
                      </>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        {aviso && (
          <p className="cfx__aviso" role="status">
            {aviso}
          </p>
        )}

        <button type="button" className="cfg-botao" onClick={aoFechar}>
          Fechar
        </button>
      </div>

      {acao?.tipo === 'reajustar' && (
        <div onClick={(e) => e.stopPropagation()}>
          <ReajustarFixa
            modelo={acao.modelo}
            lista={lista}
            aoFechar={() => setAcao(null)}
            aoSalvar={(nova, { novoValor, aPartirDe }) => guardar(nova, `${acao.modelo.descricao}: ${reais(novoValor)} a partir de ${mesCurto(aPartirDe)}.`)}
          />
        </div>
      )}
      {acao?.tipo === 'encerrar' && (
        <div onClick={(e) => e.stopPropagation()}>
          <EncerrarFixa
            modelo={acao.modelo}
            lista={lista}
            aoFechar={() => setAcao(null)}
            aoSalvar={(nova, { aPartirDe }) => guardar(nova, `${acao.modelo.descricao} encerrada a partir de ${mesCurto(aPartirDe)}.`)}
          />
        </div>
      )}
    </div>
  );
}
