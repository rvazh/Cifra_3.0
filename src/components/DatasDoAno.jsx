import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { GRUPOS, DATAS, salvarDesligadas, quandoNoAno } from '../dados/datasAnuais.js';
import './DatasDoAno.css';

// Ordem dentro do ano: datas do mês todo ficam no começo do mês
function chaveDeOrdem(d, ano) {
  return d.mes ? `${ano}-${String(d.mes).padStart(2, '0')}-00` : d.quando(ano);
}

// Janela para escolher quais feriados e datas do ano aparecem no calendário.
// Cada clique já salva (não precisa de botão "Salvar").
export default function DatasDoAno({ desligadas, ano, sazonaisLigadas, aoMudar, aoFechar }) {
  useEffect(() => {
    const tecla = (e) => e.key === 'Escape' && aoFechar();
    document.addEventListener('keydown', tecla);
    return () => document.removeEventListener('keydown', tecla);
  }, [aoFechar]);

  function trocar(ids) {
    salvarDesligadas(ids);
    aoMudar(ids);
  }

  function alternar(id) {
    trocar(desligadas.includes(id) ? desligadas.filter((x) => x !== id) : [...desligadas, id]);
  }

  function marcarGrupo(grupo, ligar) {
    const doGrupo = DATAS.filter((d) => d.grupo === grupo).map((d) => d.id);
    const resto = desligadas.filter((id) => !doGrupo.includes(id));
    trocar(ligar ? resto : [...resto, ...doGrupo]);
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
          const datas = DATAS.filter((d) => d.grupo === g.id).sort((a, b) => chaveDeOrdem(a, ano).localeCompare(chaveDeOrdem(b, ano)));
          const ligadas = datas.filter((d) => !desligadas.includes(d.id)).length;
          const bloqueado = g.id === 'sazonal' && !sazonaisLigadas;
          return (
            <fieldset key={g.id} className={`dda__grupo dda__grupo--${g.id}`} disabled={bloqueado}>
              <legend className="dda__grupo-topo">
                <b>{g.nome}</b>
                <span>{g.descricao}</span>
              </legend>
              {bloqueado ? (
                <p className="dda__desligado">
                  As datas sazonais estão desligadas. Ligue em{' '}
                  <Link to="/painel/configuracoes">Configurações → Datas sazonais</Link>.
                </p>
              ) : (
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
              )}
              <ul className="dda__lista">
                {datas.map((d) => (
                  <li key={d.id}>
                    <label className={d.gasto && sazonaisLigadas ? 'dda__item dda__item--gasto' : 'dda__item'}>
                      <input type="checkbox" checked={!desligadas.includes(d.id)} onChange={() => alternar(d.id)} />
                      <span className="dda__emoji" aria-hidden="true">{d.emoji}</span>
                      <span className="dda__nome">{d.nome}</span>
                      <span className="dda__dia">{quandoNoAno(d, ano)}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </fieldset>
          );
        })}

        <p className="dda__rodape">
          Para marcar uma data sua (aniversário, viagem, casamento…), escolha o dia no calendário e toque em{' '}
          <b>Data especial</b>.
        </p>

        <button type="button" className="dda__pronto" onClick={aoFechar}>
          Pronto
        </button>
      </div>
    </div>
  );
}
