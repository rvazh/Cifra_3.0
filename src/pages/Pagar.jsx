import { useEffect, useRef, useState } from 'react';
import MenuLateral from '../components/MenuLateral.jsx';
import { IconeMais } from '../components/Icones.jsx';
import { reais } from '../components/Graficos.jsx';
import { carregar, salvar, dataCurta, dataDeHoje, novoId, carregarCategorias } from '../dados/lancamentos.js';
import { carregarContas, ehCartao } from '../dados/contas.js';
import { conferirAlertasAgora } from '../dados/alertas.js';
import {
  carregarPagar,
  salvarPagar,
  situacaoDaDivida,
  ordenarDividas,
  registrarPagamento,
  desfazerPagamento,
  lancamentoDaEntrada,
  totaisDoPagar,
} from '../dados/pagar.js';
import './Painel.css';
import './Receber.css'; // a tela "A pagar" usa o mesmo visual da tela "A receber"
import './Pagar.css';

// "1.234,56" -> 1234.56
function lerNumero(texto) {
  const n = parseFloat(String(texto).replace(/\s|R\$/gi, '').replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}
const paraTexto = (n) => (n ? n.toFixed(2).replace('.', ',') : '');
const dataLonga = (data) => data.split('-').reverse().join('/');

// Iniciais para o "avatar" de quem você deve: "Banco Inter" -> "BI"
function iniciais(nome) {
  const partes = nome.trim().split(/\s+/);
  return ((partes[0]?.[0] || '') + (partes.length > 1 ? partes[partes.length - 1][0] : '')).toUpperCase();
}

function textoDoPrazo(p) {
  if (!p?.vence) return 'sem data combinada';
  if (p.dias === 0) return 'vence hoje';
  if (p.dias === 1) return 'vence amanhã';
  if (p.dias > 1) return `vence em ${p.dias} dias (${dataCurta(p.vence)})`;
  return `atrasada há ${-p.dias} ${p.dias === -1 ? 'dia' : 'dias'} (${dataCurta(p.vence)})`;
}

const FORM_VAZIO = {
  pessoa: '',
  motivo: '',
  tipo: 'emprestimo',
  valorTexto: '',
  data: dataDeHoje(),
  parcelas: 1,
  primeiroVencimento: '',
  categoria: 'Outros',
  contaEntrada: '',
  jaPagoTexto: '',
  observacao: '',
  temJuros: false,
  noCalendario: true,
  jurosMesTexto: '1,00',
  multaTexto: '2,00',
};

const ESTADOS = {
  'em-dia': 'Em dia',
  atrasada: 'Atrasada',
  quitada: 'Quitada',
};

export default function Pagar() {
  const [dividas, setDividas] = useState(carregarPagar);
  const [filtro, setFiltro] = useState('abertas'); // abertas | quitadas | todas
  const [formulario, setFormulario] = useState(null);
  const [erro, setErro] = useState('');
  const [pagando, setPagando] = useState(null); // { id, valorTexto, data, conta }
  const [erroPagamento, setErroPagamento] = useState('');
  const [historico, setHistorico] = useState(null); // id da dívida com o histórico aberto
  const [aviso, setAviso] = useState('');
  const [contas] = useState(() => carregarContas().filter((c) => !ehCartao(c)).map((c) => c.nome));
  const [categorias] = useState(() => carregarCategorias().filter((c) => c.tipo !== 'receita').map((c) => c.nome));

  // Salva e confere os avisos (ex.: parcela que já venceu)
  const primeiraVez = useRef(true);
  useEffect(() => {
    salvarPagar(dividas);
    if (primeiraVez.current) primeiraVez.current = false;
    else conferirAlertasAgora();
  }, [dividas]);

  // Fecha o formulário com Esc
  useEffect(() => {
    if (!formulario) return undefined;
    const aoTeclar = (e) => e.key === 'Escape' && setFormulario(null);
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, [formulario]);

  const totais = totaisDoPagar(dividas);
  // Próxima parcela a vencer (entre as dívidas em aberto)
  const proximaGeral = dividas
    .map((d) => ({ d, s: situacaoDaDivida(d) }))
    .filter((x) => !x.s.quitada && x.s.proxima?.vence)
    .sort((a, b) => a.s.proxima.vence.localeCompare(b.s.proxima.vence))[0];
  const ordenadas = ordenarDividas(dividas).filter((d) => {
    const quitada = situacaoDaDivida(d).quitada;
    return filtro === 'todas' || (filtro === 'quitadas' ? quitada : !quitada);
  });

  // ----- Formulário -----
  const atualizar = (mudanca) => {
    setFormulario((atual) => ({ ...atual, ...mudanca }));
    setErro('');
  };

  function abrirNova() {
    setFormulario({ ...FORM_VAZIO, data: dataDeHoje(), contaEntrada: contas[0] || '', categoria: categorias.includes('Outros') ? 'Outros' : categorias[0] || 'Outros' });
  }

  function abrirEdicao(d) {
    setFormulario({
      id: d.id,
      pessoa: d.pessoa,
      motivo: d.motivo || '',
      tipo: d.tipo || 'emprestimo',
      valorTexto: paraTexto(d.valor),
      data: d.data,
      parcelas: d.parcelas || 1,
      primeiroVencimento: d.primeiroVencimento || '',
      categoria: d.categoria || 'Outros',
      observacao: d.observacao || '',
      temJuros: Boolean(d.juros?.ativo),
      noCalendario: d.noCalendario !== false,
      jurosMesTexto: d.juros ? paraTexto(d.juros.mes) || '0,00' : '1,00',
      multaTexto: d.juros ? paraTexto(d.juros.multa) || '0,00' : '2,00',
    });
  }

  function salvarFormulario(e) {
    e.preventDefault();
    const valor = lerNumero(formulario.valorTexto);
    const jaPago = lerNumero(formulario.jaPagoTexto) || 0;
    const parcelas = Math.round(Number(formulario.parcelas));
    if (!formulario.pessoa.trim()) return setErro('Diga para quem você deve (pessoa, banco ou loja).');
    if (!valor || valor <= 0) return setErro('Coloque o valor total, por exemplo 1.200,00.');
    if (!parcelas || parcelas < 1 || parcelas > 120) return setErro('O número de parcelas vai de 1 a 120.');
    if (jaPago < 0 || jaPago > valor) return setErro('O valor já pago não pode passar do total.');
    const jurosMes = lerNumero(formulario.jurosMesTexto) || 0;
    const multa = lerNumero(formulario.multaTexto) || 0;
    if (formulario.noCalendario && !formulario.primeiroVencimento) {
      return setErro('Para aparecer no Calendário e no Checklist, coloque a data da 1ª parcela (ou marque "Não").');
    }
    if (formulario.temJuros) {
      if (!formulario.primeiroVencimento) return setErro('Para calcular juros, coloque a data de vencimento (é dela que o atraso começa a contar).');
      if (jurosMes < 0 || jurosMes > 30 || multa < 0 || multa > 50) return setErro('Confira os juros: até 30% ao mês e multa até 50%.');
      if (!jurosMes && !multa) return setErro('Coloque a porcentagem de juros ao mês, a multa, ou os dois.');
    }

    const base = {
      pessoa: formulario.pessoa.trim(),
      motivo: formulario.motivo.trim(),
      tipo: formulario.tipo,
      valor: Math.round(valor * 100) / 100,
      data: formulario.data || dataDeHoje(),
      parcelas,
      primeiroVencimento: formulario.primeiroVencimento,
      categoria: formulario.tipo === 'compra' ? formulario.categoria : null,
      observacao: formulario.observacao.trim(),
      juros: formulario.temJuros ? { ativo: true, mes: jurosMes, multa } : null,
      noCalendario: formulario.noCalendario,
    };

    if (formulario.id) {
      setDividas((atual) => atual.map((d) => (d.id === formulario.id ? { ...d, ...base } : d)));
      setAviso(`${base.pessoa}: dados atualizados.`);
    } else {
      const nova = { ...base, id: novoId(), criadaEm: new Date().toISOString(), pagamentos: [] };
      // Empréstimo: o dinheiro entrou numa conta (não conta como ganho)
      if (base.tipo === 'emprestimo' && formulario.contaEntrada) {
        const l = lancamentoDaEntrada(nova, formulario.contaEntrada);
        salvar([l, ...carregar()]);
        nova.contaEntrada = formulario.contaEntrada;
        nova.lancamentoId = l.id;
      }
      // O que já tinha sido pago antes de usar a CIFRA (não mexe nas contas)
      if (jaPago > 0) nova.pagamentos.push({ id: novoId(), data: base.data, valor: Math.round(jaPago * 100) / 100, conta: '', lancamentoId: null, antes: true });
      setDividas((atual) => [nova, ...atual]);
      setFiltro('abertas');
      setAviso(
        nova.lancamentoId
          ? `${reais(base.valor)} a pagar para ${base.pessoa}. A entrada em ${formulario.contaEntrada} foi lançada (sem contar como ganho).`
          : `${reais(base.valor)} a pagar para ${base.pessoa}.`
      );
    }
    setFormulario(null);
    return undefined;
  }

  function excluir() {
    const d = dividas.find((x) => x.id === formulario.id);
    if (!window.confirm(`Excluir a dívida com ${d.pessoa}?`)) return;
    const ligados = [d.lancamentoId, ...(d.pagamentos || []).flatMap((p) => [p.lancamentoId, p.lancamentoJurosId])].filter(Boolean);
    if (ligados.length && window.confirm(`Apagar também os ${ligados.length} lançamento(s) ligados a ela nas suas contas?\n\nOK = apagar · Cancelar = manter nas contas`)) {
      salvar(carregar().filter((l) => !ligados.includes(l.id)));
    }
    setDividas((atual) => atual.filter((x) => x.id !== d.id));
    setFormulario(null);
    setAviso(`Dívida com ${d.pessoa} excluída.`);
  }

  // ----- Pagamentos -----
  function abrirPagamento(d) {
    const s = situacaoDaDivida(d);
    setErroPagamento('');
    const sugerido = s.proxima ? (s.proxima.atrasada && s.jurosAbertos > 0 ? s.proxima.comJuros : s.proxima.valor || s.jurosAbertos) : s.faltaComJuros;
    setPagando({ id: d.id, valorTexto: paraTexto(sugerido), data: dataDeHoje(), conta: d.contaEntrada && contas.includes(d.contaEntrada) ? d.contaEntrada : contas[0] || '' });
  }

  function confirmarPagamento(e, d) {
    e.preventDefault();
    const s = situacaoDaDivida(d);
    const valor = lerNumero(pagando.valorTexto);
    if (!valor || valor <= 0) return setErroPagamento('Digite quanto você pagou.');
    if (valor > s.faltaComJuros + 0.004) return setErroPagamento(`Faltam só ${reais(s.faltaComJuros)}${s.jurosAbertos > 0 ? ' (já com juros)' : ''}. Confira o valor.`);
    const nova = registrarPagamento(d, { valor, data: pagando.data || dataDeHoje(), conta: pagando.conta });
    setDividas((atual) => atual.map((x) => (x.id === d.id ? nova : x)));
    const depois = situacaoDaDivida(nova);
    const ultimo = nova.pagamentos[nova.pagamentos.length - 1];
    const parteJuros = ultimo?.juros > 0 ? ` (${reais(ultimo.juros)} de juros)` : '';
    setAviso(
      depois.quitada
        ? `🎉 Dívida com ${d.pessoa} quitada! ${reais(valor)} pagos${pagando.conta ? ` de ${pagando.conta}` : ''}.`
        : `${reais(valor)} pagos a ${d.pessoa}${parteJuros}${pagando.conta ? ` de ${pagando.conta}` : ''}. Faltam ${reais(depois.faltaComJuros)}.`
    );
    setPagando(null);
    return undefined;
  }

  function apagarPagamento(d, p) {
    if (!window.confirm(`Desfazer o pagamento de ${reais(p.valor)} em ${dataLonga(p.data)}?${p.lancamentoId ? ' O valor volta para a conta.' : ''}`)) return;
    const nova = desfazerPagamento(d, p.id); // tira também os lançamentos da conta
    setDividas((atual) => atual.map((x) => (x.id === d.id ? nova : x)));
  }

  return (
    <div className="pp-app">
      <MenuLateral />

      <main className="pp rcb pgr">
        <div className="pp__topo">
          <div>
            <h1 className="pp__titulo">A pagar</h1>
            <p className="pp__subtitulo">Suas dívidas: para quem você deve, quanto já pagou e quanto ainda falta</p>
          </div>
          <div className="pp__acoes">
            <button type="button" className="pp__novo rcb__novo" onClick={abrirNova}>
              <IconeMais tamanho={18} espessura={2.6} />
              Nova dívida
            </button>
          </div>
        </div>

        {/* ===== Números ===== */}
        <section className="rcb-numeros" aria-label="Resumo das suas dívidas">
          <div className="rcb-numero rcb-numero--destaque">
            <span>Falta pagar</span>
            <b>{reais(totais.falta)}</b>
            <small>
              {totais.juros > 0 ? (
                <>
                  <strong>{reais(totais.faltaComJuros)}</strong> com {reais(totais.juros)} de juros
                </>
              ) : (
                `${totais.abertas} ${totais.abertas === 1 ? 'dívida em aberto' : 'dívidas em aberto'}`
              )}
            </small>
          </div>
          <div className="rcb-numero">
            <span>Já pago</span>
            <b className="valor--entrada">{reais(totais.pago)}</b>
            <small>de {reais(totais.total)} no total</small>
          </div>
          <div className={totais.atrasadas ? 'rcb-numero rcb-numero--alerta' : 'rcb-numero'}>
            <span>Atrasadas</span>
            <b>{totais.atrasadas}</b>
            <small>{totais.atrasadas ? `${reais(totais.valorAtrasado)} vencidos${totais.juros > 0 ? ', já com juros' : ''}` : 'Nenhuma parcela vencida'}</small>
          </div>
          <div className="rcb-numero">
            <span>{proximaGeral?.s.proxima.atrasada ? 'Vencida desde' : 'Próximo vencimento'}</span>
            <b>{proximaGeral ? dataCurta(proximaGeral.s.proxima.vence) : '—'}</b>
            <small>
              {proximaGeral
                ? `${reais(proximaGeral.s.proxima.valor)} · ${proximaGeral.d.pessoa}`
                : `${totais.quitadas} ${totais.quitadas === 1 ? 'dívida quitada' : 'dívidas quitadas'}`}
            </small>
          </div>
        </section>

        {aviso && (
          <p className="rcb__aviso" role="status">
            {aviso}
          </p>
        )}

        {dividas.length > 0 && (
          <div className="rcb-filtros" role="tablist" aria-label="Mostrar">
            {[
              ['abertas', `Em aberto (${totais.abertas})`],
              ['quitadas', `Quitadas (${totais.quitadas})`],
              ['todas', 'Todas'],
            ].map(([valor, texto]) => (
              <button key={valor} type="button" role="tab" aria-selected={filtro === valor} className={filtro === valor ? 'rcb-filtro rcb-filtro--ativo' : 'rcb-filtro'} onClick={() => setFiltro(valor)}>
                {texto}
              </button>
            ))}
          </div>
        )}

        {/* ===== Cartões ===== */}
        {dividas.length === 0 ? (
          <section className="rcb-vazio">
            <span className="rcb-vazio__icone" aria-hidden="true">
              🧾
            </span>
            <h2>Tem alguma dívida para organizar?</h2>
            <p>
              Anote empréstimos, financiamentos, compras parceladas ou dinheiro que você deve a alguém. A CIFRA mostra quanto já
              pagou, quantas parcelas faltam, avisa antes de cada vencimento e calcula os juros se atrasar.
            </p>
            <button type="button" className="rcb-botao rcb-botao--principal" onClick={abrirNova}>
              Adicionar a primeira
            </button>
          </section>
        ) : ordenadas.length === 0 ? (
          <p className="rcb__nada">{filtro === 'quitadas' ? 'Nenhuma dívida quitada ainda.' : 'Nada em aberto. Você não deve nada! 🎉'}</p>
        ) : (
          <div className="rcb__grade">
            {ordenadas.map((d) => {
              const s = situacaoDaDivida(d);
              const aberto = pagando?.id === d.id;
              return (
                <article key={d.id} className={`rcb-cartao rcb-cartao--${s.estado}`}>
                  <div className="rcb-cartao__topo">
                    <span className="rcb-cartao__avatar pgr-avatar" aria-hidden="true">
                      {iniciais(d.pessoa)}
                    </span>
                    <div className="rcb-cartao__nomes">
                      <h2>{d.pessoa}</h2>
                      <span>
                        {d.motivo || (d.tipo === 'compra' ? 'Compra ou serviço' : 'Empréstimo')} · desde {dataCurta(d.data)}
                      </span>
                    </div>
                    <span className={`rcb-selo rcb-selo--${s.estado}`}>{ESTADOS[s.estado]}</span>
                  </div>

                  <div className="rcb-cartao__valores">
                    <div>
                      <span>{s.quitada ? (s.jurosPagos > 0 ? 'Pago com juros' : 'Pago') : s.comJuros ? 'Falta pagar (valor original)' : 'Falta pagar'}</span>
                      <b>{reais(s.quitada ? s.pagoTotal : s.falta)}</b>
                    </div>
                    <div className="rcb-cartao__total">
                      <span>Valor total</span>
                      <b>{reais(d.valor)}</b>
                    </div>
                  </div>

                  {s.comJuros && (
                    <div className={s.jurosAbertos > 0 ? 'rcb-juros rcb-juros--correndo' : 'rcb-juros'}>
                      <div className="rcb-juros__linha">
                        <span>Juros acumulados</span>
                        <b>{reais(s.jurosAbertos)}</b>
                      </div>
                      {!s.quitada && (
                        <div className="rcb-juros__linha rcb-juros__linha--total">
                          <span>A pagar com juros</span>
                          <b>{reais(s.faltaComJuros)}</b>
                        </div>
                      )}
                      <small>
                        {d.juros.mes > 0 && `${String(d.juros.mes).replace('.', ',')}% ao mês`}
                        {d.juros.mes > 0 && d.juros.multa > 0 && ' + '}
                        {d.juros.multa > 0 && `multa de ${String(d.juros.multa).replace('.', ',')}%`} após o vencimento
                        {s.jurosPagos > 0 && ` · ${reais(s.jurosPagos)} de juros já pagos`}
                      </small>
                    </div>
                  )}

                  <div className="rcb-cartao__progresso">
                    <div
                      className="rcb-cartao__trilho"
                      role="progressbar"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={Math.round(s.parte)}
                      aria-label={`${d.pessoa}: ${Math.round(s.parte)}% pago`}
                    >
                      <span style={{ width: `${s.parte}%` }} />
                    </div>
                    <small>
                      {reais(s.pago)} pagos · {Math.round(s.parte)}%
                    </small>
                  </div>

                  <dl className="rcb-cartao__dados">
                    <div>
                      <dt>Parcelas</dt>
                      <dd>
                        {s.parcelas === 1 ? 'À vista' : `${s.parcelasPagas} de ${s.parcelas} pagas · ${reais(s.valorParcela)} cada`}
                      </dd>
                    </div>
                    {s.quitada ? (
                      <div>
                        <dt>Quitada em</dt>
                        <dd>{s.quitadaEm ? dataLonga(s.quitadaEm) : '—'}</dd>
                      </div>
                    ) : (
                      <div>
                        <dt>{s.parcelas === 1 ? 'Pagamento' : `Parcela ${s.proxima.numero}`}</dt>
                        <dd className={s.proxima.atrasada ? 'rcb-atraso' : ''}>
                          {reais(s.proxima.atrasada && s.jurosAbertos > 0 ? s.proxima.comJuros : s.proxima.valor)}
                          {s.proxima.atrasada && s.jurosAbertos > 0 ? ' com juros' : ''} · {textoDoPrazo(s.proxima)}
                        </dd>
                      </div>
                    )}
                    <div>
                      <dt>Pagamentos</dt>
                      <dd>
                        {(d.pagamentos || []).length === 0 ? (
                          'Nenhum ainda'
                        ) : (
                          <button type="button" className="rcb-link" aria-expanded={historico === d.id} onClick={() => setHistorico(historico === d.id ? null : d.id)}>
                            {(d.pagamentos || []).length} {(d.pagamentos || []).length === 1 ? 'pagamento' : 'pagamentos'} · {historico === d.id ? 'esconder' : 'ver'}
                          </button>
                        )}
                      </dd>
                    </div>
                    {d.tipo === 'emprestimo' && d.contaEntrada && (
                      <div>
                        <dt>Entrou em</dt>
                        <dd>{d.contaEntrada}</dd>
                      </div>
                    )}
                    {d.tipo === 'compra' && d.categoria && (
                      <div>
                        <dt>Categoria</dt>
                        <dd>{d.categoria}</dd>
                      </div>
                    )}
                  </dl>

                  {historico === d.id && (
                    <ul className="rcb-historico">
                      {[...(d.pagamentos || [])]
                        .sort((a, b) => b.data.localeCompare(a.data))
                        .map((r) => (
                          <li key={r.id}>
                            <span>{dataLonga(r.data)}</span>
                            <span className="rcb-historico__conta">{r.antes ? 'antes da CIFRA' : r.conta || 'só anotado'}</span>
                            <b className="valor--saida">
                              − {reais(r.valor)}
                              {r.juros > 0 && <small className="rcb-historico__juros"> ({reais(r.juros)} juros)</small>}
                            </b>
                            <button type="button" aria-label={`Desfazer pagamento de ${reais(r.valor)}`} onClick={() => apagarPagamento(d, r)}>
                              ×
                            </button>
                          </li>
                        ))}
                    </ul>
                  )}

                  {d.observacao && <p className="rcb-cartao__obs">{d.observacao}</p>}

                  {aberto ? (
                    <form className="rcb-receber pgr-pagar" onSubmit={(e) => confirmarPagamento(e, d)}>
                      <div className="rcb-receber__linha">
                        <label>
                          Quanto pagou (R$)
                          <input autoFocus inputMode="decimal" value={pagando.valorTexto} onChange={(e) => { setPagando({ ...pagando, valorTexto: e.target.value }); setErroPagamento(''); }} />
                        </label>
                        <label>
                          Quando
                          <input type="date" value={pagando.data} max={dataDeHoje()} onChange={(e) => setPagando({ ...pagando, data: e.target.value })} />
                        </label>
                      </div>
                      <label>
                        Saiu de qual conta?
                        <select value={pagando.conta} onChange={(e) => setPagando({ ...pagando, conta: e.target.value })}>
                          {contas.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                          <option value="">Nenhuma (só anotar)</option>
                        </select>
                      </label>
                      <button type="button" className="rcb-link rcb-receber__tudo" onClick={() => setPagando({ ...pagando, valorTexto: paraTexto(s.faltaComJuros) })}>
                        Paguei tudo o que falta ({reais(s.faltaComJuros)}{s.jurosAbertos > 0 ? ' com juros' : ''})
                      </button>
                      {s.jurosAbertos > 0 && <p className="rcb-receber__nota">O pagamento cobre primeiro os {reais(s.jurosAbertos)} de juros e depois as parcelas. Os juros entram como gasto.</p>}
                      {erroPagamento && <p className="rcb-erro">{erroPagamento}</p>}
                      <div className="rcb-cartao__acoes">
                        <button type="submit" className="rcb-botao rcb-botao--principal">
                          Confirmar
                        </button>
                        <button type="button" className="rcb-botao" onClick={() => setPagando(null)}>
                          Cancelar
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="rcb-cartao__acoes">
                      {!s.quitada && (
                        <button type="button" className="rcb-botao rcb-botao--principal" onClick={() => abrirPagamento(d)}>
                          Registrar pagamento
                        </button>
                      )}
                      <button type="button" className="rcb-botao rcb-botao--pequeno" onClick={() => abrirEdicao(d)}>
                        Editar
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}

        <p className="rcb__nota">
          <b>Empréstimo:</b> o dinheiro entra na conta escolhida e as parcelas saem dela — nada disso conta como ganho ou gasto nos
          relatórios (só os juros por atraso contam como gasto). <b>Compra ou serviço:</b> cada parcela paga entra como gasto na categoria
          escolhida.
        </p>

        {/* ===== Formulário (nova / editar) ===== */}
        {formulario && (
          <div className="rcb-fundo" onClick={() => setFormulario(null)}>
            <form className="rcb-form" role="dialog" aria-modal="true" aria-labelledby="pgr-form-titulo" onSubmit={salvarFormulario} onClick={(e) => e.stopPropagation()} noValidate>
              <div className="rcb-form__topo">
                <h2 id="pgr-form-titulo">{formulario.id ? 'Editar dívida' : 'Nova dívida'}</h2>
                <button type="button" className="rcb-form__fechar" onClick={() => setFormulario(null)} aria-label="Fechar">
                  ×
                </button>
              </div>

              <div className="rcb-form__tipos" role="radiogroup" aria-label="Tipo">
                {[
                  ['emprestimo', 'Empréstimo', 'Peguei dinheiro emprestado'],
                  ['compra', 'Compra ou serviço', 'Comprei algo ou contratei e pago depois'],
                ].map(([valor, titulo, sub]) => (
                  <button key={valor} type="button" role="radio" aria-checked={formulario.tipo === valor} className={formulario.tipo === valor ? 'rcb-tipo rcb-tipo--ativo' : 'rcb-tipo'} onClick={() => atualizar({ tipo: valor })}>
                    <b>{titulo}</b>
                    <small>{sub}</small>
                  </button>
                ))}
              </div>

              <div className="rcb-form__dupla">
                <label className="rcb-form__campo">
                  Para quem você deve
                  <input autoFocus placeholder="Ex.: Banco, loja ou pessoa" value={formulario.pessoa} onChange={(e) => atualizar({ pessoa: e.target.value })} />
                </label>
                <label className="rcb-form__campo">
                  Motivo (opcional)
                  <input placeholder={formulario.tipo === 'compra' ? 'Ex.: Geladeira nova' : 'Ex.: Empréstimo pessoal'} value={formulario.motivo} onChange={(e) => atualizar({ motivo: e.target.value })} />
                </label>
              </div>

              <div className="rcb-form__dupla">
                <label className="rcb-form__campo">
                  Valor total a pagar (R$)
                  <input inputMode="decimal" placeholder="1.200,00" value={formulario.valorTexto} onChange={(e) => atualizar({ valorTexto: e.target.value })} />
                  <small>Com os juros do contrato, se tiver.</small>
                </label>
                <label className="rcb-form__campo">
                  {formulario.tipo === 'compra' ? 'Data da compra' : 'Data do empréstimo'}
                  <input type="date" value={formulario.data} onChange={(e) => atualizar({ data: e.target.value })} />
                </label>
              </div>

              <div className="rcb-form__dupla">
                <label className="rcb-form__campo">
                  Em quantas parcelas
                  <input type="number" min="1" max="120" inputMode="numeric" value={formulario.parcelas} onChange={(e) => atualizar({ parcelas: e.target.value })} />
                </label>
                <label className="rcb-form__campo">
                  {Number(formulario.parcelas) > 1 ? '1ª parcela vence em' : 'Vence em'} <small>(opcional)</small>
                  <input type="date" value={formulario.primeiroVencimento} onChange={(e) => atualizar({ primeiroVencimento: e.target.value })} />
                </label>
              </div>
              {lerNumero(formulario.valorTexto) > 0 && Number(formulario.parcelas) > 1 && (
                <p className="rcb-form__dica">
                  {formulario.parcelas}x de {reais(lerNumero(formulario.valorTexto) / Number(formulario.parcelas))}
                  {formulario.primeiroVencimento ? `, todo dia ${Number(formulario.primeiroVencimento.slice(8))}` : ''}.
                </p>
              )}

              {/* ===== Calendário e Checklist ===== */}
              <div className="rcb-form__juros">
                <span className="rcb-form__pergunta">
                  Mostrar no Calendário e no Checklist?
                  <small className="rcb-form__sub">Cada parcela aparece no dia em que vence. Lá dá para mudar o dia de uma parcela.</small>
                </span>
                <div className="rcb-form__simnao" role="radiogroup" aria-label="Mostrar no Calendário e no Checklist?">
                  {[
                    [true, 'Sim'],
                    [false, 'Não'],
                  ].map(([valor, texto]) => (
                    <button key={texto} type="button" role="radio" aria-checked={formulario.noCalendario === valor} className={formulario.noCalendario === valor ? 'rcb-simnao rcb-simnao--ativo' : 'rcb-simnao'} onClick={() => atualizar({ noCalendario: valor })}>
                      {texto}
                    </button>
                  ))}
                </div>
              </div>

              {/* ===== Juros por atraso ===== */}
              <div className="rcb-form__juros">
                <span className="rcb-form__pergunta">Tem juros se atrasar?</span>
                <div className="rcb-form__simnao" role="radiogroup" aria-label="Tem juros se atrasar?">
                  {[
                    [false, 'Não'],
                    [true, 'Sim'],
                  ].map(([valor, texto]) => (
                    <button key={texto} type="button" role="radio" aria-checked={formulario.temJuros === valor} className={formulario.temJuros === valor ? 'rcb-simnao rcb-simnao--ativo' : 'rcb-simnao'} onClick={() => atualizar({ temJuros: valor })}>
                      {texto}
                    </button>
                  ))}
                </div>
              </div>
              {formulario.temJuros && (
                <>
                  <div className="rcb-form__dupla">
                    <label className="rcb-form__campo">
                      Juros ao mês (%)
                      <input inputMode="decimal" placeholder="1,00" value={formulario.jurosMesTexto} onChange={(e) => atualizar({ jurosMesTexto: e.target.value })} />
                    </label>
                    <label className="rcb-form__campo">
                      Multa por atraso (%) <small>(uma vez)</small>
                      <input inputMode="decimal" placeholder="2,00" value={formulario.multaTexto} onChange={(e) => atualizar({ multaTexto: e.target.value })} />
                    </label>
                  </div>
                  <p className="rcb-form__dica rcb-form__dica--juros">
                    {(() => {
                      const valor = lerNumero(formulario.valorTexto) || 0;
                      const parcela = valor / Math.max(1, Number(formulario.parcelas) || 1);
                      const juros = parcela * ((lerNumero(formulario.jurosMesTexto) || 0) / 100);
                      const multa = parcela * ((lerNumero(formulario.multaTexto) || 0) / 100);
                      return parcela > 0
                        ? `Exemplo: uma parcela de ${reais(parcela)} paga com 30 dias de atraso fica ${reais(parcela + juros + multa)} (${reais(multa)} de multa + ${reais(juros)} de juros). Os juros contam por dia e só sobre o que estiver em aberto.`
                        : 'Os juros contam por dia de atraso e só sobre o que estiver em aberto de cada parcela.';
                    })()}
                  </p>
                </>
              )}

              <div className="rcb-form__dupla">
                {!formulario.id && formulario.tipo === 'emprestimo' && (
                  <label className="rcb-form__campo">
                    O dinheiro entrou em qual conta?
                    <select value={formulario.contaEntrada} onChange={(e) => atualizar({ contaEntrada: e.target.value })}>
                      {contas.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                      <option value="">Nenhuma (só anotar)</option>
                    </select>
                    <small>Entra sem contar como ganho.</small>
                  </label>
                )}
                {formulario.tipo === 'compra' && (
                  <label className="rcb-form__campo">
                    Categoria do gasto
                    <select value={formulario.categoria} onChange={(e) => atualizar({ categoria: e.target.value })}>
                      {categorias.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    <small>Cada parcela paga entra como gasto aqui.</small>
                  </label>
                )}
                {!formulario.id && (
                  <label className="rcb-form__campo">
                    Já pagou alguma parte? <small>(R$)</small>
                    <input inputMode="decimal" placeholder="0,00" value={formulario.jaPagoTexto} onChange={(e) => atualizar({ jaPagoTexto: e.target.value })} />
                  </label>
                )}
              </div>

              <label className="rcb-form__campo">
                Observação <small>(opcional)</small>
                <input placeholder="Ex.: débito automático no dia 10" value={formulario.observacao} onChange={(e) => atualizar({ observacao: e.target.value })} />
              </label>

              {erro && <p className="rcb-erro">{erro}</p>}

              <div className="rcb-form__acoes">
                <button type="submit" className="rcb-botao rcb-botao--principal">
                  Salvar
                </button>
                <button type="button" className="rcb-botao" onClick={() => setFormulario(null)}>
                  Cancelar
                </button>
              </div>
              {formulario.id && (
                <button type="button" className="rcb-form__excluir" onClick={excluir}>
                  Excluir esta dívida
                </button>
              )}
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
