import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { reais } from './Graficos.jsx';
import { carregar, carregarCategorias, dataDeHoje, lancamentosDoMes, mesFinanceiro, mudarMes } from '../dados/lancamentos.js';
import { inicioDoMes } from '../dados/preferencias.js';
import { carregarOrcamentos, salvarOrcamentos, situacaoDosOrcamentos, porcentagemDeAviso } from '../dados/orcamentos.js';
import { conferirAlertasAgora } from '../dados/alertas.js';
import './Orcamento.css';
import { mascaraValor, valorParaCampo } from '../dados/dinheiro.js';

const paraTexto = (n) => valorParaCampo(n);
function lerValor(texto) {
  const n = parseFloat(String(texto).replace(/\s|R\$/gi, '').replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : 0;
}

// Média de gasto por categoria nos últimos 3 meses fechados (base do "planejamento pronto")
function mediaDosUltimosMeses(lista) {
  const atual = mesFinanceiro(dataDeHoje());
  const meses = [1, 2, 3].map((i) => mudarMes(atual, -i));
  const somas = {};
  let mesesComGasto = 0;
  meses.forEach((m) => {
    const gastos = lancamentosDoMes(lista, m, inicioDoMes()).filter((l) => l.valor < 0 && !l.transferencia);
    if (gastos.length) mesesComGasto += 1;
    gastos.forEach((l) => {
      somas[l.categoria] = (somas[l.categoria] || 0) - l.valor;
    });
  });
  if (!mesesComGasto) return null;
  // arredonda para cima, de 10 em 10 reais
  return Object.fromEntries(Object.entries(somas).map(([k, v]) => [k, Math.ceil(v / mesesComGasto / 10) * 10]));
}

// ===== Barra de uma categoria (usada no Painel e na janela) =====
export function BarraOrcamento({ s }) {
  return (
    <div className={`orc-barra orc-barra--${s.estado}`}>
      <div className="orc-barra__topo">
        <span className="orc-barra__nome">
          <span className="orc-barra__emoji" style={{ background: s.cat.cor }} aria-hidden="true">
            {s.cat.emoji}
          </span>
          {s.nome}
        </span>
        <span className="orc-barra__valores">
          <b>{reais(s.gasto)}</b> de {reais(s.limite)}
        </span>
      </div>
      <div
        className="orc-barra__trilho"
        role="progressbar"
        aria-label={`${s.nome}: ${Math.round(s.parte)}% do orçamento`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.min(100, Math.round(s.parte))}
      >
        <span className="orc-barra__cheio" style={{ width: `${Math.min(100, s.parte)}%` }} />
      </div>
      <span className="orc-barra__rodape">
        {s.estado === 'estourou' ? `${reais(-s.falta)} acima do limite` : `Restam ${reais(s.falta)}`} · {Math.round(s.parte)}%
      </span>
    </div>
  );
}

// ===== Cartão do Painel: orçamento do mês =====
export function CartaoOrcamento() {
  const situacoes = situacaoDosOrcamentos();
  if (!situacoes.length) return null;
  const estourados = situacoes.filter((s) => s.estado === 'estourou').length;
  const atencao = situacoes.filter((s) => s.estado === 'atencao').length;
  return (
    <section className="cartao orc-cartao">
      <div className="cartao__titulo-linha">
        <h2 className="cartao__titulo">Orçamento do mês</h2>
        <Link to="/painel/configuracoes" state={{ abrir: 'orcamento' }} className="cartao__link">
          Ajustar limites
        </Link>
      </div>
      <p className="orc-cartao__resumo">
        {estourados
          ? `${estourados} ${estourados === 1 ? 'categoria passou' : 'categorias passaram'} do limite.`
          : atencao
            ? `${atencao} ${atencao === 1 ? 'categoria chegou' : 'categorias chegaram'} em ${porcentagemDeAviso()}% do limite.`
            : 'Tudo dentro do planejado até agora.'}
      </p>
      <div className="orc-cartao__lista">
        {situacoes.map((s) => (
          <BarraOrcamento key={s.nome} s={s} />
        ))}
      </div>
    </section>
  );
}

// ===== Janela das Configurações: limite por categoria =====
export default function OrcamentoCategorias({ aoFechar, aoSalvar }) {
  const lista = carregar();
  const categorias = carregarCategorias().filter((c) => c.tipo !== 'receita');
  const [valores, setValores] = useState(() => {
    const salvos = carregarOrcamentos();
    return Object.fromEntries(categorias.map((c) => [c.nome, paraTexto(salvos[c.nome])]));
  });
  const [nota, setNota] = useState('');
  const gastoAgora = Object.fromEntries(situacaoDosOrcamentos(lista).map((s) => [s.nome, s.gasto]));
  const doMes = {};
  lancamentosDoMes(lista, mesFinanceiro(dataDeHoje()), inicioDoMes())
    .filter((l) => l.valor < 0 && !l.transferencia)
    .forEach((l) => {
      doMes[l.categoria] = (doMes[l.categoria] || 0) - l.valor;
    });

  useEffect(() => {
    const aoTeclar = (e) => e.key === 'Escape' && aoFechar();
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, [aoFechar]);

  function sugerir() {
    const media = mediaDosUltimosMeses(lista);
    if (!media) {
      setNota('Ainda não há gastos nos últimos 3 meses para sugerir limites. Preencha à mão.');
      return;
    }
    setValores((atual) => {
      const novo = { ...atual };
      categorias.forEach((c) => {
        if (media[c.nome]) novo[c.nome] = paraTexto(media[c.nome]);
      });
      return novo;
    });
    setNota('Sugestão pela média dos últimos 3 meses. Ajuste o que quiser e salve.');
  }

  function salvarTudo(e) {
    e.preventDefault();
    const limpo = salvarOrcamentos(Object.fromEntries(Object.entries(valores).map(([k, v]) => [k, lerValor(v)])));
    conferirAlertasAgora();
    aoSalvar(Object.keys(limpo).length);
  }

  const total = Object.values(valores).reduce((s, v) => s + lerValor(v), 0);

  return (
    <div className="cfg-fundo" onClick={aoFechar}>
      <form className="cfg-janela orc-janela" role="dialog" aria-modal="true" aria-labelledby="orc-titulo" onSubmit={salvarTudo} onClick={(e) => e.stopPropagation()}>
        <div className="cfg-janela__topo">
          <h2 id="orc-titulo">Orçamento por categoria</h2>
          <button type="button" className="cfg-janela__fechar" onClick={aoFechar} aria-label="Fechar">
            ×
          </button>
        </div>
        <p className="cfg-janela__nota">
          Quanto você quer gastar por mês em cada categoria. Deixe em branco para não ter limite. A CIFRA avisa quando chegar em{' '}
          {porcentagemDeAviso()}% e quando passar do limite.
        </p>
        <button type="button" className="orc-sugerir" onClick={sugerir}>
          ✨ Sugerir limites pelos meus últimos 3 meses
        </button>
        {nota && <p className="orc-nota">{nota}</p>}

        <ul className="orc-lista">
          {categorias.map((c) => (
            <li key={c.nome} className="orc-linha">
              <span className="orc-linha__emoji" style={{ background: c.cor }} aria-hidden="true">
                {c.emoji}
              </span>
              <label className="orc-linha__textos" htmlFor={`orc-${c.nome}`}>
                <b>{c.nome}</b>
                <small>Neste mês: {reais(gastoAgora[c.nome] ?? doMes[c.nome] ?? 0)}</small>
              </label>
              <span className="orc-linha__campo">
                <span aria-hidden="true">R$</span>
                <input
                  id={`orc-${c.nome}`}
                  inputMode="decimal"
                  placeholder="0,00"
                  value={valores[c.nome] || ''}
                  onChange={(e) => setValores({ ...valores, [c.nome]: mascaraValor(e.target.value) })}
                />
              </span>
            </li>
          ))}
        </ul>

        <p className="orc-total">
          Total planejado por mês: <b>{reais(total)}</b>
        </p>

        <div className="cfg-janela__acoes">
          <button type="submit" className="cfg-botao cfg-botao--principal">
            Salvar orçamento
          </button>
          <button type="button" className="cfg-botao" onClick={aoFechar}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
