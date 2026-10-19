import { useEffect } from 'react';
import { GRUPOS, DATAS, salvarDatasEscolhidas, diaCurto } from '../dados/datasAnuais.js';
import './DatasDoAno.css';

// Janela para escolher quais feriados e datas do ano aparecem no calendário.
// Cada clique já salva (não precisa de botão "Salvar").
export default function DatasDoAno({ escolhidas, ano, aoMudar, aoFechar }) {
  useEffect(() => {
    const tecla = (e) => e.key === 'Escape' && aoFechar();
    document.addEventListener('keydown', tecla);
    return () => document.removeEventListener('keydown', tecla);
  }, [aoFechar]);

  function trocar(ids) {
    salvarDatasEscolhidas(ids);
    aoMudar(ids);
  }

  function alternar(id) {
    trocar(escolhidas.includes(id) ? escolhidas.filter((x) => x !== id) : [...escolhidas, id]);
  }

  function marcarGrupo(grupo, ligar) {
    const doGrupo = DATAS.filter((d) => d.grupo === grupo).map((d) => d.id);
    const resto = escolhidas.filter((id) => !doGrupo.includes(id));
    trocar(ligar ? [...resto, ...doGrupo] : resto);
  }

  return (
    <div className="dda-fundo" onClick={aoFechar}>
      <div className="dda" role="dialog" aria-modal="true" aria-labelledby="dda-titulo" onClick={(e) => e.stopPropagation()}>
        <div className="dda__topo">
          <div>
            <h2 id="dda-titulo" className="dda__titulo">Datas do ano</h2>
            <p className="dda__subtitulo">Escolha o que aparece no calendário. As datas mudam sozinhas a cada ano.</p>
          </div>
          <button type="button" className="dda__fechar" onClick={aoFechar} aria-label="Fechar">
            ×
          </button>
        </div>

        {GRUPOS.map((g) => {
          const datas = DATAS.filter((d) => d.grupo === g.id).sort((a, b) => a.quando(ano).localeCompare(b.quando(ano)));
          const ligadas = datas.filter((d) => escolhidas.includes(d.id)).length;
          return (
            <fieldset key={g.id} className="dda__grupo">
              <legend className="dda__grupo-topo">
                <b>{g.nome}</b>
                <span>{g.descricao}</span>
              </legend>
              <div className="dda__atalhos">
                <span>
                  {ligadas} de {datas.length}
                </span>
                <button type="button" onClick={() => marcarGrupo(g.id, true)} disabled={ligadas === datas.length}>
                  Marcar todas
                </button>
                <button type="button" onClick={() => marcarGrupo(g.id, false)} disabled={ligadas === 0}>
                  Nenhuma
                </button>
              </div>
              <ul className="dda__lista">
                {datas.map((d) => (
                  <li key={d.id}>
                    <label className="dda__item">
                      <input type="checkbox" checked={escolhidas.includes(d.id)} onChange={() => alternar(d.id)} />
                      <span className="dda__emoji" aria-hidden="true">{d.emoji}</span>
                      <span className="dda__nome">{d.nome}</span>
                      <span className="dda__dia">{diaCurto(d.quando(ano))}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </fieldset>
          );
        })}

        <button type="button" className="dda__pronto" onClick={aoFechar}>
          Pronto
        </button>
      </div>
    </div>
  );
}
