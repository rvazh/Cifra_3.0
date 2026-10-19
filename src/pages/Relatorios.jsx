import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import MenuLateral from '../components/MenuLateral.jsx';
import { IconeCima, IconeBaixo } from '../components/Icones.jsx';
import { GraficoColunas, GraficoRosca, reais, reaisRedondo } from '../components/Graficos.jsx';
import {
  categoria,
  carregar,
  semTransferencias,
  dataCurta,
  dataDeHoje,
  nomeDoMes,
  mudarMes,
  diasNoMes,
  mesFinanceiro,
} from '../dados/lancamentos.js';
import { inicioDoMes } from '../dados/preferencias.js';
import { carregarContas, saldoGeralNoFimDo, saldoGeralNoDia } from '../dados/contas.js';
import ResumoMeses from '../components/ResumoMeses.jsx';
import './Painel.css';
import './Relatorios.css';

const PERIODOS = [
  { id: 'mes', nome: 'Mês', meses: 1 },
  { id: 'tri', nome: '3 meses', meses: 3 },
  { id: 'sem', nome: '6 meses', meses: 6 },
  { id: 'ano', nome: 'Ano', meses: 12 },
];

const MESES_CURTOS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const mesCurto = (mes) => MESES_CURTOS[Number(mes.slice(5, 7)) - 1];

// Lista de meses ("2026-08", "2026-09"...) de um período que termina no mês de referência
function mesesDoPeriodo(referencia, periodo) {
  if (periodo.id === 'ano') {
    const ano = referencia.slice(0, 4);
    return MESES_CURTOS.map((_, i) => `${ano}-${String(i + 1).padStart(2, '0')}`);
  }
  return Array.from({ length: periodo.meses }, (_, i) => mudarMes(referencia, i - periodo.meses + 1));
}

// Semanas de um mês financeiro: [{ inicio: '2026-10-01', fim: '2026-10-07' }, ...]
function semanasDoMes(mes, inicio) {
  const [ano, m] = mes.split('-').map(Number);
  const ultimoDia = new Date(ano, m, 0).getDate();
  const comeco = new Date(ano, m - 1, Math.min(inicio, ultimoDia));
  const proximo = new Date(ano, m, Math.min(inicio, new Date(ano, m + 1, 0).getDate()));
  const texto = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const semanas = [];
  for (let d = new Date(comeco); d < proximo; d.setDate(d.getDate() + 7)) {
    const fim = new Date(d);
    fim.setDate(fim.getDate() + 6);
    const ultimo = fim < proximo ? fim : new Date(proximo.getTime() - 86400000);
    semanas.push({ inicio: texto(d), fim: texto(ultimo) });
  }
  return semanas;
}

const MESES_MINUSCULOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const diaMes = (data) => `${Number(data.slice(8))}/${MESES_MINUSCULOS[Number(data.slice(5, 7)) - 1]}`;

// Mês de referência do período anterior (mesmo tamanho, logo antes)
function referenciaAnterior(referencia, periodo) {
  return mudarMes(referencia, periodo.id === 'ano' ? -12 : -periodo.meses);
}

function nomeDoPeriodo(referencia, periodo) {
  if (periodo.id === 'mes') return nomeDoMes(referencia);
  if (periodo.id === 'ano') return referencia.slice(0, 4);
  const meses = mesesDoPeriodo(referencia, periodo);
  const [primeiro, ultimo] = [meses[0], meses[meses.length - 1]];
  const mesmoAno = primeiro.slice(0, 4) === ultimo.slice(0, 4);
  return mesmoAno
    ? `${mesCurto(primeiro)} – ${mesCurto(ultimo)} ${ultimo.slice(0, 4)}`
    : `${mesCurto(primeiro)} ${primeiro.slice(0, 4)} – ${mesCurto(ultimo)} ${ultimo.slice(0, 4)}`;
}

function totais(itens) {
  const receitas = itens.filter((l) => l.valor > 0).reduce((s, l) => s + l.valor, 0);
  const despesas = itens.filter((l) => l.valor < 0).reduce((s, l) => s - l.valor, 0);
  const resultado = receitas - despesas;
  return { receitas, despesas, resultado, economia: receitas > 0 ? (resultado / receitas) * 100 : null };
}

// Quanto mudou em %, comparando com o período anterior
function variacao(atual, anterior) {
  return anterior > 0 ? ((atual - anterior) / anterior) * 100 : null;
}

function porcento(numero, casas = 0) {
  return `${numero.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })}%`;
}

function somaPor(itens, campo) {
  const grupos = {};
  itens.forEach((l) => {
    grupos[l[campo]] = (grupos[l[campo]] || 0) + Math.abs(l.valor);
  });
  return grupos;
}

// Seta + porcentagem: verde quando a mudança é boa, vermelho quando é ruim
function Variacao({ valor, bomQuandoSobe = true, sufixo = '%' }) {
  if (valor === null || !Number.isFinite(valor)) return <span className="rel-var rel-var--neutra">sem comparação</span>;
  const sobe = valor > 0;
  const bom = Math.abs(valor) < 0.5 ? null : sobe === bomQuandoSobe;
  const classe = bom === null ? 'rel-var rel-var--neutra' : bom ? 'rel-var rel-var--boa' : 'rel-var rel-var--ruim';
  const texto =
    sufixo === '%' ? porcento(Math.abs(valor)) : `${Math.abs(valor).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} pontos`;
  return (
    <span className={classe}>
      {sobe ? <IconeCima tamanho={13} espessura={2.6} /> : <IconeBaixo tamanho={13} espessura={2.6} />}
      {texto}
    </span>
  );
}

// Baixa os lançamentos do período como planilha (abre no Excel e no Google Planilhas)
function baixarCSV(itens, nomeArquivo) {
  const linhas = [['Data', 'Descrição', 'Categoria', 'Conta', 'Valor', 'Situação']];
  [...itens]
    .sort((a, b) => a.data.localeCompare(b.data))
    .forEach((l) => {
      const [ano, mes, dia] = l.data.split('-');
      linhas.push([
        `${dia}/${mes}/${ano}`,
        l.descricao,
        l.categoria,
        l.conta,
        l.valor.toFixed(2).replace('.', ','),
        l.pago ? 'Pago' : 'A pagar',
      ]);
    });
  const texto = linhas.map((linha) => linha.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\r\n');
  const arquivo = new Blob(['﻿' + texto], { type: 'text/csv;charset=utf-8' });
  const endereco = URL.createObjectURL(arquivo);
  const link = document.createElement('a');
  link.href = endereco;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(endereco);
}

export default function Relatorios() {
  const hoje = dataDeHoje();
  // Transferências entre contas não são gasto nem ganho: ficam fora dos relatórios
  const [lista] = useState(() => semTransferencias(carregar()));
  const [todos] = useState(carregar); // com transferências: usados só para o saldo geral
  const [contas] = useState(carregarContas);
  const [periodo, setPeriodo] = useState(PERIODOS[0]);
  const mesAtual = mesFinanceiro(hoje);
  const inicio = inicioDoMes();
  const [referencia, setReferencia] = useState(mesAtual);

  const meses = mesesDoPeriodo(referencia, periodo);
  const mesesAnteriores = mesesDoPeriodo(referenciaAnterior(referencia, periodo), periodo);

  const itens = useMemo(() => lista.filter((l) => meses.includes(mesFinanceiro(l.data))), [lista, meses.join()]);
  const anteriores = useMemo(
    () => lista.filter((l) => mesesAnteriores.includes(mesFinanceiro(l.data))),
    [lista, mesesAnteriores.join()]
  );

  const atual = totais(itens);
  const antes = totais(anteriores);

  // Gráfico: no modo "Mês", uma coluna por semana do mês escolhido; nos outros, uma por mês
  const porSemana = periodo.id === 'mes';
  const evolucao = porSemana
    ? semanasDoMes(referencia, inicio).map((s, i) => {
        const t = totais(lista.filter((l) => l.data >= s.inicio && l.data <= s.fim));
        return {
          chave: `${referencia}-s${i + 1}`,
          mes: `${Number(s.inicio.slice(8))}–${Number(s.fim.slice(8))}`,
          rotulo: `Semana ${i + 1} · ${diaMes(s.inicio)} a ${diaMes(s.fim)}`,
          ...t,
          saldo: saldoGeralNoDia(s.fim, todos, contas),
        };
      })
    : meses.map((m) => {
        const t = totais(lista.filter((l) => mesFinanceiro(l.data) === m));
        return { chave: m, mes: mesCurto(m), ...t, saldo: saldoGeralNoFimDo(m, todos, contas) };
      });

  // Despesas por categoria (com o valor do período anterior para comparar)
  const despesasAtuais = somaPor(itens.filter((l) => l.valor < 0), 'categoria');
  const despesasAntes = somaPor(anteriores.filter((l) => l.valor < 0), 'categoria');
  const categoriasDespesa = Object.entries(despesasAtuais)
    .map(([nome, valor]) => ({ nome, valor, cor: categoria(nome).cor, emoji: categoria(nome).emoji, antes: despesasAntes[nome] || 0 }))
    .sort((a, b) => b.valor - a.valor);
  const maiorCategoria = categoriasDespesa[0]?.valor || 1;

  const receitasPorCategoria = Object.entries(somaPor(itens.filter((l) => l.valor > 0), 'categoria'))
    .map(([nome, valor]) => ({ nome, valor, emoji: categoria(nome).emoji }))
    .sort((a, b) => b.valor - a.valor);

  const corDaConta = (nome) => contas.find((c) => c.nome === nome)?.cor || '#EEE6D8';
  const gastosPorConta = Object.entries(somaPor(itens.filter((l) => l.valor < 0), 'conta'))
    .map(([nome, valor]) => ({ nome, valor, cor: corDaConta(nome) }))
    .sort((a, b) => b.valor - a.valor);
  const maiorConta = gastosPorConta[0]?.valor || 1;

  const maioresDespesas = itens
    .filter((l) => l.valor < 0)
    .sort((a, b) => a.valor - b.valor)
    .slice(0, 5);

  // Dias do período que já passaram (para a média diária)
  const diasPassados = meses.reduce((soma, m) => {
    if (m < mesAtual) return soma + diasNoMes(m);
    if (m === mesAtual) {
      // do primeiro dia do mês financeiro até hoje
      const [a, mm] = m.split('-').map(Number);
      const [ha, hm, hd] = hoje.split('-').map(Number);
      return soma + Math.round((new Date(ha, hm - 1, hd) - new Date(a, mm - 1, inicio)) / 86400000) + 1;
    }
    return soma;
  }, 0);

  // Destaques escritos a partir dos números
  const destaques = [];
  if (categoriasDespesa.length) {
    const c = categoriasDespesa[0];
    destaques.push(
      <>
        <b>{c.nome}</b> foi onde você mais gastou: {reais(c.valor)} ({porcento((c.valor / atual.despesas) * 100)} das despesas).
      </>
    );
  }
  const variacaoDespesas = variacao(atual.despesas, antes.despesas);
  if (variacaoDespesas !== null && Math.abs(variacaoDespesas) >= 0.5) {
    destaques.push(
      <>
        Você gastou <b>{porcento(Math.abs(variacaoDespesas))} {variacaoDespesas > 0 ? 'a mais' : 'a menos'}</b> que no período
        anterior.
      </>
    );
  }
  if (atual.economia !== null) {
    destaques.push(
      atual.resultado >= 0 ? (
        <>
          Sobraram <b>{reais(atual.resultado)}</b>, ou {porcento(atual.economia)} do que entrou.
        </>
      ) : (
        <>
          As despesas passaram as receitas em <b>{reais(-atual.resultado)}</b>.
        </>
      )
    );
  }
  const maisSubiu = categoriasDespesa
    .map((c) => ({ ...c, diferenca: c.valor - c.antes }))
    .filter((c) => c.antes > 0 && c.diferenca > 1)
    .sort((a, b) => b.diferenca - a.diferenca)[0];
  if (maisSubiu) {
    destaques.push(
      <>
        <b>{maisSubiu.nome}</b> subiu {reais(maisSubiu.diferenca)} em relação ao período anterior.
      </>
    );
  }
  // Média por dia: só o que já aconteceu (sem as contas que ainda vão vencer)
  const gastosAteHoje = itens.filter((l) => l.valor < 0 && l.data <= hoje).reduce((s, l) => s - l.valor, 0);
  if (diasPassados > 0 && gastosAteHoje > 0) {
    destaques.push(
      <>
        Média de <b>{reais(gastosAteHoje / diasPassados)}</b> de gastos por dia
        {meses.includes(mesAtual) ? ' até agora' : ''}.
      </>
    );
  }

  function andar(quanto) {
    setReferencia(mudarMes(referencia, quanto * (periodo.id === 'ano' ? 12 : periodo.meses)));
  }

  const nomeArquivo = `cifra-relatorio-${nomeDoPeriodo(referencia, periodo)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')}.csv`;

  return (
    <div className="pp-app">
      <MenuLateral />

      <main className="pp rel">
        <div className="pp__topo">
          <div>
            <h1 className="pp__titulo">Relatórios</h1>
            <p className="pp__subtitulo">
              Para onde foi o seu dinheiro em {nomeDoPeriodo(referencia, periodo)}
            </p>
          </div>
          <div className="rel__acoes">
            <button type="button" className="rel__acao" onClick={() => baixarCSV(itens, nomeArquivo)} disabled={!itens.length}>
              Baixar planilha
            </button>
            <button type="button" className="rel__acao rel__acao--escura" onClick={() => window.print()}>
              Imprimir
            </button>
          </div>
        </div>

        {/* ===== Resumo rápido dos meses + WhatsApp ===== */}
        <ResumoMeses />

        {/* ===== Escolha do período ===== */}
        <div className="rel__barra">
          <div className="rel__periodos" role="group" aria-label="Período">
            {PERIODOS.map((p) => (
              <button
                key={p.id}
                type="button"
                aria-pressed={periodo.id === p.id}
                className={periodo.id === p.id ? 'rel__periodo rel__periodo--ativo' : 'rel__periodo'}
                onClick={() => setPeriodo(p)}
              >
                {p.nome}
              </button>
            ))}
          </div>
          <div className="rel__navegacao">
            <button type="button" className="rel__seta" onClick={() => andar(-1)} aria-label="Período anterior">
              ‹
            </button>
            <b>{nomeDoPeriodo(referencia, periodo)}</b>
            <button type="button" className="rel__seta" onClick={() => andar(1)} aria-label="Próximo período">
              ›
            </button>
          </div>
        </div>

        {/* ===== Números principais ===== */}
        <div className="rel__numeros">
          <div className="rel-numero">
            <span className="rel-numero__rotulo">Receitas</span>
            <b className="rel-numero__valor valor--entrada">{reais(atual.receitas)}</b>
            <Variacao valor={variacao(atual.receitas, antes.receitas)} />
          </div>
          <div className="rel-numero">
            <span className="rel-numero__rotulo">Despesas</span>
            <b className="rel-numero__valor valor--saida">{reais(atual.despesas)}</b>
            <Variacao valor={variacaoDespesas} bomQuandoSobe={false} />
          </div>
          <div className="rel-numero rel-numero--destaque">
            <span className="rel-numero__rotulo">Resultado</span>
            <b className="rel-numero__valor">
              {atual.resultado < 0 ? '− ' : ''}
              {reais(Math.abs(atual.resultado))}
            </b>
            <Variacao valor={variacao(atual.resultado, antes.resultado)} />
          </div>
          <div className="rel-numero">
            <span className="rel-numero__rotulo">Quanto sobrou do que entrou</span>
            <b className="rel-numero__valor">{atual.economia === null ? '—' : porcento(atual.economia, 1)}</b>
            <Variacao
              valor={atual.economia !== null && antes.economia !== null ? atual.economia - antes.economia : null}
              sufixo="pontos"
            />
          </div>
        </div>
        <p className="rel__nota">
          Comparado com {nomeDoPeriodo(referenciaAnterior(referencia, periodo), periodo)}. Considera os lançamentos pagos e os a
          pagar do período.
          {inicio > 1 && ` Cada mês vai do dia ${inicio} ao dia ${inicio - 1} do mês seguinte.`}
        </p>

        {itens.length === 0 && (
          <div className="cartao rel__vazio">
            <b>Nenhum lançamento em {nomeDoPeriodo(referencia, periodo)}.</b>
            <span>
              Escolha outro período ou <Link to="/painel/lancamentos">registre um lançamento</Link>.
            </span>
          </div>
        )}

        {/* ===== Evolução + destaques ===== */}
        <div className="rel__linha rel__linha--grafico">
          <section className="cartao">
            <div className="cartao__titulo-linha">
              <h2 className="cartao__titulo">Receitas x despesas x saldo {porSemana ? 'por semana' : 'por mês'}</h2>
              <div className="legenda">
                <span className="legenda__item">
                  <span className="legenda__cor legenda__cor--receita" />
                  Receitas
                </span>
                <span className="legenda__item">
                  <span className="legenda__cor legenda__cor--despesa" />
                  Despesas
                </span>
                <span className="legenda__item">
                  <span className="legenda__cor legenda__cor--saldo" />
                  Saldo geral
                </span>
              </div>
            </div>
            <div className="cartao__grafico">
              <GraficoColunas dados={evolucao} />
            </div>
            <div className="rel-tabela" role="table" aria-label="Resultado de cada mês">
              <div className="rel-tabela__linha rel-tabela__linha--titulo" role="row">
                <span role="columnheader">{porSemana ? 'Semana' : 'Mês'}</span>
                <span role="columnheader">Receitas</span>
                <span role="columnheader">Despesas</span>
                <span role="columnheader">Resultado</span>
              </div>
              {evolucao.map((m) => (
                <div key={m.chave} role="row" className={!porSemana && meses.includes(m.chave) ? 'rel-tabela__linha rel-tabela__linha--periodo' : 'rel-tabela__linha'}>
                  <span role="cell">{m.rotulo || nomeDoMes(m.chave)}</span>
                  <span role="cell">{reais(m.receitas)}</span>
                  <span role="cell">{reais(m.despesas)}</span>
                  {m.receitas === 0 && m.despesas === 0 ? (
                    <b role="cell" className="rel-tabela__vazio">—</b>
                  ) : (
                    <b role="cell" className={m.resultado >= 0 ? 'valor--entrada' : 'valor--saida'}>
                      {m.resultado >= 0 ? '+ ' : '− '}
                      {reais(Math.abs(m.resultado))}
                    </b>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="rel-destaques">
            <h2 className="rel-destaques__titulo">Destaques do período</h2>
            {destaques.length === 0 ? (
              <p className="rel-destaques__vazio">Quando houver lançamentos neste período, os destaques aparecem aqui.</p>
            ) : (
              <ul>
                {destaques.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* ===== Categorias + contas ===== */}
        <div className="rel__linha rel__linha--categorias">
          <section className="cartao">
            <div className="cartao__titulo-linha">
              <h2 className="cartao__titulo">Despesas por categoria</h2>
              <span className="rel__dica">comparado ao período anterior</span>
            </div>
            {categoriasDespesa.length === 0 ? (
              <p className="rel__sem">Nenhuma despesa neste período.</p>
            ) : (
              <div className="rel-categorias">
                <div className="rel-categorias__rosca">
                  <GraficoRosca
                    categorias={categoriasDespesa}
                    tamanho={170}
                    espessura={24}
                    textoCentro={reaisRedondo(atual.despesas)}
                    legendaCentro="em despesas"
                  />
                </div>
                <ul className="rel-categorias__lista">
                  {categoriasDespesa.map((c) => (
                    <li key={c.nome} className="rel-cat">
                      <span className="rel-cat__icone" style={{ background: c.cor }}>
                        {c.emoji}
                      </span>
                      <div className="rel-cat__meio">
                        <div className="rel-cat__topo">
                          <b>{c.nome}</b>
                          <span className="rel-cat__pct">{porcento((c.valor / atual.despesas) * 100)}</span>
                        </div>
                        <div className="rel-cat__trilho">
                          <span style={{ width: `${(c.valor / maiorCategoria) * 100}%`, background: c.cor }} />
                        </div>
                      </div>
                      <div className="rel-cat__valores">
                        <b>{reais(c.valor)}</b>
                        <Variacao valor={variacao(c.valor, c.antes)} bomQuandoSobe={false} />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <div className="rel__coluna">
            <section className="cartao">
              <h2 className="cartao__titulo">De onde veio o dinheiro</h2>
              {receitasPorCategoria.length === 0 ? (
                <p className="rel__sem">Nenhuma receita neste período.</p>
              ) : (
                <ul className="rel-simples">
                  {receitasPorCategoria.map((r) => (
                    <li key={r.nome}>
                      <span>
                        {r.emoji} {r.nome}
                      </span>
                      <b className="valor--entrada">{reais(r.valor)}</b>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="cartao">
              <h2 className="cartao__titulo">Gastos por conta</h2>
              {gastosPorConta.length === 0 ? (
                <p className="rel__sem">Nenhuma despesa neste período.</p>
              ) : (
                <ul className="rel-contas">
                  {gastosPorConta.map((c) => (
                    <li key={c.nome}>
                      <div className="rel-contas__topo">
                        <span>{c.nome}</span>
                        <b>{reais(c.valor)}</b>
                      </div>
                      <div className="rel-cat__trilho">
                        <span style={{ width: `${(c.valor / maiorConta) * 100}%`, background: c.cor }} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>

        {/* ===== Maiores despesas ===== */}
        <section className="cartao">
          <div className="cartao__titulo-linha">
            <h2 className="cartao__titulo">Maiores despesas</h2>
            <Link to="/painel/lancamentos" className="cartao__link">
              Ver lançamentos
            </Link>
          </div>
          {maioresDespesas.length === 0 ? (
            <p className="rel__sem">Nenhuma despesa neste período.</p>
          ) : (
            <ol className="rel-maiores">
              {maioresDespesas.map((l, i) => (
                <li key={l.id}>
                  <span className="rel-maiores__posicao">{i + 1}</span>
                  <span className="rel-maiores__icone" style={{ background: categoria(l.categoria).cor }}>
                    {categoria(l.categoria).emoji}
                  </span>
                  <span className="rel-maiores__textos">
                    <b>{l.descricao}</b>
                    <span>
                      {dataCurta(l.data)} · {l.categoria} · {l.conta}
                    </span>
                  </span>
                  <b className="valor--saida">− {reais(Math.abs(l.valor))}</b>
                </li>
              ))}
            </ol>
          )}
        </section>
      </main>
    </div>
  );
}
