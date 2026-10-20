import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import MenuLateral from '../components/MenuLateral.jsx';
import { IconeMais, IconeRepetir } from '../components/Icones.jsx';
import { reais } from '../components/Graficos.jsx';
import { nomesDasContas, garantirConta } from '../dados/contas.js';
import { carregarPreferencias } from '../dados/preferencias.js';
import { pedirPermissaoDeAviso, conferirAlertasAgora } from '../dados/alertas.js';
import {
  categoria,
  carregar,
  salvar,
  novoId,
  dataDeHoje,
  nomeDoMes,
  mudarMes,
  diasNoMes,
  lancamentosDoMes,
  semTransferencias,
} from '../dados/lancamentos.js';
import ParcelaDivida from '../components/ParcelaDivida.jsx';
import { parcelasDoMes, parcelasProximas, totaisDasParcelas } from '../dados/parcelas.js';
import './Painel.css';
import './Calendario.css';
import { mascaraValor } from '../dados/dinheiro.js';
import {
  carregarDesligadas,
  carregarPessoais,
  salvarPessoais,
  datasDoMes,
  diaCurto,
  nomeDoMesLongo,
} from '../dados/datasAnuais.js';
import DatasDoAno from '../components/DatasDoAno.jsx';
import DataEspecial from '../components/DataEspecial.jsx';

const DIAS_DA_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];


function valorComSinal(valor) {
  return `${valor >= 0 ? '+ ' : '− '}${reais(Math.abs(valor))}`;
}

// "2026-10-09" -> "Sexta-feira, 9 de outubro"
function diaPorExtenso(data) {
  const [ano, mes, dia] = data.split('-').map(Number);
  const texto = new Date(ano, mes - 1, dia).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

// Quantos dias faltam de hoje até a data
function diasAte(data) {
  const [ano, mes, dia] = data.split('-').map(Number);
  const [ha, hm, hd] = dataDeHoje().split('-').map(Number);
  return Math.round((new Date(ano, mes - 1, dia) - new Date(ha, hm - 1, hd)) / 86400000);
}

function quandoVence(data) {
  const dias = diasAte(data);
  if (dias < 0) return dias === -1 ? 'Venceu ontem' : `Venceu há ${-dias} dias`;
  if (dias === 0) return 'Vence hoje';
  if (dias === 1) return 'Vence amanhã';
  return `Vence em ${dias} dias`;
}

// Situação de cada lançamento: pago, a pagar, atrasado ou previsto
function situacao(l, hoje) {
  if (l.pago) return { classe: 'pago', texto: l.valor >= 0 ? 'Recebido' : 'Pago' };
  if (l.guardado) return { classe: 'guardado', texto: 'Guardado' };
  if (l.data < hoje) return { classe: 'atrasado', texto: 'Atrasado' };
  if (l.previsto) return { classe: 'previsto', texto: 'Previsto' };
  return { classe: 'pendente', texto: l.valor >= 0 ? 'A receber' : 'A pagar' };
}

export default function Calendario() {
  const hoje = dataDeHoje();
  const [lista, setLista] = useState(carregar);
  const [mes, setMes] = useState(hoje.slice(0, 7));
  const [diaEscolhido, setDiaEscolhido] = useState(hoje);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [evento, setEvento] = useState(null); // formulário de novo evento (aberto/fechado)
  const [desligadas, setDesligadas] = useState(carregarDesligadas); // datas do ano que a pessoa desligou
  const [pessoais, setPessoais] = useState(carregarPessoais); // datas especiais criadas pela pessoa
  const [escolhendoDatas, setEscolhendoDatas] = useState(false);
  const [especial, setEspecial] = useState(false); // formulário de data especial aberto
  const sazonaisLigadas = carregarPreferencias().datasSazonais !== false; // Configurações > Datas sazonais

  // Sempre que a lista mudar, salva no aparelho
  useEffect(() => salvar(lista), [lista]);

  const itensDoMes = useMemo(() => lancamentosDoMes(lista, mes), [lista, mes]);
  // Parcelas de "A receber" e "A pagar" (ficam guardadas à parte; "versao" recarrega depois de uma mudança)
  const [versao, setVersao] = useState(0);
  const parcelas = useMemo(() => parcelasDoMes(mes), [mes, versao, lista]); // eslint-disable-line react-hooks/exhaustive-deps
  const totaisParcelas = useMemo(() => totaisDasParcelas(mes), [mes, versao, lista]); // eslint-disable-line react-hooks/exhaustive-deps
  function parcelaMudou(texto) {
    setLista(carregar()); // registrar uma parcela pode criar lançamentos nas contas
    setVersao((v) => v + 1);
    setAviso(texto);
  }

  // Conta fixa = lançamento que se repete todo mês (o original, os previstos e os já confirmados)
  const ehFixa = (l) => Boolean((l.repete || l.previsto || l.origem) && !l.transferencia);
  // Dias com conta fixa vencendo: { "2026-10-05": 2 }
  const fixasPorDia = useMemo(() => {
    const dias = {};
    itensDoMes.filter((l) => ehFixa(l) && l.valor < 0).forEach((l) => {
      dias[l.data] = (dias[l.data] || 0) + 1;
    });
    return dias;
  }, [itensDoMes]); // eslint-disable-line react-hooks/exhaustive-deps

  // Feriados e datas do ano escolhidas: { "2026-12-25": [{ nome, emoji, ... }] }
  const opcoesDeDatas = { desligadas, sazonais: sazonaisLigadas, pessoais };
  const datas = useMemo(() => datasDoMes(mes, opcoesDeDatas), [mes, desligadas, pessoais, sazonaisLigadas]); // eslint-disable-line react-hooks/exhaustive-deps
  const proximoMes = mudarMes(mes, 1);
  const gastosDoProximo = useMemo(() => datasDoMes(proximoMes, opcoesDeDatas).gastos, [proximoMes, desligadas, pessoais, sazonaisLigadas]); // eslint-disable-line react-hooks/exhaustive-deps
  const anuaisPorDia = datas.porDia;
  const previstoExtra = datas.gastos.reduce((s, d) => s + (d.valor || 0), 0);

  // Agrupa os lançamentos por dia: { "2026-10-05": [...] }
  const porDia = useMemo(() => {
    const grupos = {};
    itensDoMes.forEach((l) => {
      (grupos[l.data] = grupos[l.data] || []).push(l);
    });
    Object.values(grupos).forEach((g) => g.sort((a, b) => Math.abs(b.valor) - Math.abs(a.valor)));
    return grupos;
  }, [itensDoMes]);

  // Quadradinhos do mês: espaços vazios antes do dia 1 e depois do último dia
  const [ano, numeroMes] = mes.split('-').map(Number);
  // A semana começa no domingo ou na segunda, conforme as Configurações
  const comecaNa = carregarPreferencias().primeiroDiaDaSemana;
  const diasDaSemana = [...DIAS_DA_SEMANA.slice(comecaNa), ...DIAS_DA_SEMANA.slice(0, comecaNa)];
  const primeiroDiaDaSemana = (new Date(ano, numeroMes - 1, 1).getDay() - comecaNa + 7) % 7;
  const totalDias = diasNoMes(mes);
  const quadros = [];
  for (let i = 0; i < primeiroDiaDaSemana; i++) quadros.push(null);
  for (let d = 1; d <= totalDias; d++) quadros.push(`${mes}-${String(d).padStart(2, '0')}`);
  while (quadros.length % 7 !== 0) quadros.push(null);

  // Resumo do mês
  const movimentos = semTransferencias(itensDoMes); // transferência entre contas não é entrada nem saída
  // Parcelas em aberto de "A receber"/"A pagar" entram no que ainda vai entrar e sair (as já pagas viraram lançamentos)
  const entradas = movimentos.filter((l) => l.valor > 0).reduce((s, l) => s + l.valor, 0) + totaisParcelas.aReceber;
  const saidas = movimentos.filter((l) => l.valor < 0).reduce((s, l) => s - l.valor, 0) + totaisParcelas.aPagar;
  const aPagar = movimentos.filter((l) => l.valor < 0 && !l.pago).reduce((s, l) => s - l.valor, 0) + totaisParcelas.aPagar;
  const atrasadas = itensDoMes.filter((l) => !l.pago && l.data < hoje).length + parcelas.filter((p) => p.tipo === 'pagar' && p.atrasada).length;

  // Próximos vencimentos: contas em aberto deste mês e do próximo (as atrasadas primeiro)
  const proximos = useMemo(() => {
    const mesAtual = hoje.slice(0, 7);
    return [...lancamentosDoMes(lista, mesAtual), ...lancamentosDoMes(lista, mudarMes(mesAtual, 1))]
      .filter((l) => l.valor < 0 && !l.pago && !l.transferencia)
      .filter((l) => diasAte(l.data) <= 30)
      .concat(
        // Parcelas das suas dívidas ("A pagar") também vencem
        parcelasProximas(30, 'pagar').map((p) => ({
          id: p.chave,
          data: p.vence,
          descricao: `${p.divida.pessoa}${p.total > 1 ? ` (${p.numero}/${p.total})` : ''}`,
          valor: -p.aPagarAgora,
        }))
      )
      .sort((a, b) => a.data.localeCompare(b.data))
      .slice(0, 5);
  }, [lista, hoje, versao]); // eslint-disable-line react-hooks/exhaustive-deps

  const doDia = (diaEscolhido.startsWith(mes) && porDia[diaEscolhido]) || [];
  const datasDoDia = (diaEscolhido.startsWith(mes) && anuaisPorDia[diaEscolhido]) || [];
  const parcelasDoDia = parcelas.filter((p) => p.vence === diaEscolhido);
  const saldoDoDia =
    doDia.reduce((s, l) => s + l.valor, 0) +
    parcelasDoDia.filter((p) => p.estado !== 'paga').reduce((s, p) => s + (p.tipo === 'receber' ? p.aPagarAgora : -p.aPagarAgora), 0);

  function irPara(data) {
    setMes(data.slice(0, 7));
    setDiaEscolhido(data);
  }

  function trocarMes(quanto) {
    const novo = mudarMes(mes, quanto);
    setMes(novo);
    // Escolhe hoje, se estiver no mês, ou o dia 1
    setDiaEscolhido(hoje.startsWith(novo) ? hoje : `${novo}-01`);
  }

  // Marca como pago/recebido (ou desfaz). Um lançamento "previsto" vira um lançamento de verdade.
  function alternarPago(l) {
    if (l.previsto) {
      const confirmado = { ...l, id: novoId(), pago: true, repete: false, previsto: false, exemplo: false };
      delete confirmado.previsto;
      setLista((atual) => [confirmado, ...atual]);
      return;
    }
    setLista((atual) => atual.map((item) => (item.id === l.id ? { ...item, pago: !item.pago } : item)));
  }

  // ----- Novo evento (vencimento) -----
  const contas = nomesDasContas(); // a pessoa também pode digitar uma conta nova

  function abrirEvento() {
    setEspecial(false);
    setErro('');
    setAviso('');
    setEvento({
      titulo: '',
      valorTexto: '',
      tipo: 'despesa',
      data: diaEscolhido,
      conta: contas[0] || '',
      fixo: false,
    });
  }

  function mudarEvento(campo, valor) {
    setEvento((atual) => ({ ...atual, [campo]: valor }));
    setErro('');
  }

  function criarEvento(e) {
    e.preventDefault();
    const titulo = evento.titulo.trim();
    const valor = Math.abs(parseFloat(String(evento.valorTexto).replace(/\./g, '').replace(',', '.'))) || 0;
    if (!titulo) return setErro('Dê um nome para o evento, por exemplo "Conta de luz".');
    if (!valor) return setErro('Coloque o valor, por exemplo 189,90.');
    if (!evento.data) return setErro('Escolha a data do vencimento.');
    if (!evento.conta.trim()) return setErro('Diga de qual conta sai (ou entra) o dinheiro, por exemplo "Nubank".');

    // Conta nova? Já cria na tela de Contas
    const { nome: nomeDaConta, criada: contaCriada } = garantirConta(evento.conta);

    const novo = {
      id: novoId(),
      data: evento.data,
      descricao: titulo,
      categoria: 'Outros',
      conta: nomeDaConta,
      valor: evento.tipo === 'receita' ? valor : -valor,
      pago: false, // é um vencimento: fica "a pagar" até ser marcado
      repete: evento.fixo, // fixo = aparece todo mês a partir desta data
      observacao: '',
      evento: true,
    };
    setLista((atual) => [novo, ...atual]);
    setEvento(null);
    setMes(evento.data.slice(0, 7));
    setDiaEscolhido(evento.data);
    setAviso(
      (evento.tipo === 'receita'
        ? 'Receita criada.'
        : 'Conta criada. Você será avisado 3 dias antes e 1 dia antes do vencimento.') +
        (contaCriada ? ` Conta "${nomeDaConta}" criada.` : '')
    );
    pedirPermissaoDeAviso(); // pede para mostrar notificações (só pergunta uma vez)
    conferirAlertasAgora(); // se já está perto de vencer, o aviso sai na hora
    return undefined;
  }

  // ----- Datas especiais (marcadas pela pessoa) -----
  function abrirEspecial() {
    setEvento(null);
    setAviso('');
    setEspecial(true);
  }

  function salvarEspecial(nova) {
    const lista = [...pessoais, { id: novoId(), ...nova }];
    salvarPessoais(lista);
    setPessoais(lista);
    setEspecial(false);
    setAviso(nova.gasto ? 'Data salva. O dia ficou colorido e o mês mostra o aviso de gasto a mais.' : 'Data salva.');
  }

  function apagarEspecial(id) {
    const lista = pessoais.filter((p) => p.id !== id);
    salvarPessoais(lista);
    setPessoais(lista);
    setAviso('Data especial apagada.');
  }

  function escolherDia(data) {
    setDiaEscolhido(data);
    setAviso('');
    setEvento((atual) => (atual ? { ...atual, data } : atual));
    // Em telas pequenas o painel do dia fica embaixo do calendário: rola até ele
    if (window.innerWidth <= 1100) {
      setTimeout(() => document.querySelector('.cal-dia')?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  }

  return (
    <div className="pp-app">
      <MenuLateral />

      <main className="pp cal">
        <div className="pp__topo">
          <div>
            <h1 className="pp__titulo">Calendário</h1>
            <p className="pp__subtitulo">Veja quando cada conta vence e o que já foi pago</p>
          </div>
          <div className="cal__navegacao">
            <button type="button" className="cal__hoje" onClick={() => setEscolhendoDatas(true)}>
              Datas do ano
            </button>
            <button type="button" className="cal__hoje" onClick={() => irPara(hoje)}>
              Hoje
            </button>
            <button type="button" className="cal__seta" onClick={() => trocarMes(-1)} aria-label="Mês anterior">
              ‹
            </button>
            <b className="cal__mes">{nomeDoMes(mes)}</b>
            <button type="button" className="cal__seta" onClick={() => trocarMes(1)} aria-label="Próximo mês">
              ›
            </button>
          </div>
        </div>


        {/* ===== Resumo do mês ===== */}
        <div className="cal__resumos">
          <div className="cal-resumo">
            <span className="cal-resumo__rotulo">Entradas do mês</span>
            <b className="cal-resumo__valor valor--entrada">{reais(entradas)}</b>
          </div>
          <div className="cal-resumo">
            <span className="cal-resumo__rotulo">Saídas do mês</span>
            <b className="cal-resumo__valor valor--saida">{reais(saidas)}</b>
          </div>
          <div className="cal-resumo cal-resumo--destaque">
            <span className="cal-resumo__rotulo">Ainda a pagar</span>
            <b className="cal-resumo__valor">{reais(aPagar)}</b>
            {atrasadas > 0 && (
              <span className="cal-resumo__alerta">
                {atrasadas} {atrasadas === 1 ? 'conta atrasada' : 'contas atrasadas'}
              </span>
            )}
          </div>
          <div className="cal-resumo">
            <span className="cal-resumo__rotulo">Saldo previsto</span>
            <b className={entradas - saidas >= 0 ? 'cal-resumo__valor valor--entrada' : 'cal-resumo__valor valor--saida'}>
              {valorComSinal(entradas - saidas)}
            </b>
          </div>
        </div>

        {/* ===== Aviso: mês com gasto a mais (datas sazonais e datas especiais) ===== */}
        {(datas.gastos.length > 0 || gastosDoProximo.length > 0) && (
          <section className={datas.gastos.length ? 'cal-sazonal' : 'cal-sazonal cal-sazonal--leve'} aria-label="Gasto a mais no mês">
            {datas.gastos.length > 0 && (
              <>
                <div className="cal-sazonal__topo">
                  <span className="cal-sazonal__icone" aria-hidden="true">⚠️</span>
                  <div>
                    <b>Em {nomeDoMesLongo(Number(mes.slice(5, 7)))} haverá um gasto a mais</b>
                    <span>
                      Separe um valor extra para não apertar o orçamento do mês
                      {previstoExtra > 0 ? ` · ${reais(previstoExtra)} já previstos nas suas datas especiais` : ''}.
                    </span>
                  </div>
                </div>
                <ul className="cal-sazonal__lista">
                  {datas.gastos.map((d) => (
                    <li key={d.chave}>
                      <button type="button" className="cal-sazonal__item" onClick={() => d.data && irPara(d.data)} disabled={!d.data}>
                        <span aria-hidden="true">{d.emoji}</span>
                        <b>{d.nome}</b>
                        <small>{d.data ? diaCurto(d.data) : 'o mês todo'}</small>
                        {d.valor > 0 && <small className="cal-sazonal__valor">{reais(d.valor)}</small>}
                      </button>
                    </li>
                  ))}
                </ul>
                {datas.doMesTodo.filter((d) => d.sazonal).map((d) => (
                  <p key={d.chave} className="cal-sazonal__dica">
                    <b>{d.nome}:</b> {d.gasto}
                  </p>
                ))}
              </>
            )}
            {gastosDoProximo.length > 0 && (
              <p className="cal-sazonal__proximo">
                <b>Próximo mês ({nomeDoMesLongo(Number(proximoMes.slice(5, 7)))}):</b>{' '}
                {gastosDoProximo.map((d) => d.nome).join(', ')}. Já dá para começar a separar.
              </p>
            )}
          </section>
        )}

        <div className="cal__colunas">
          {/* ===== Grade do mês ===== */}
          <section className="cartao cal-grade">
            <div className="cal-grade__semana" aria-hidden="true">
              {diasDaSemana.map((d) => (
                <span key={d}>{d}</span>
              ))}
            </div>
            <div className="cal-grade__dias">
              {quadros.map((data, i) => {
                if (!data) return <span key={`vazio-${i}`} className="cal-quadro cal-quadro--vazio" />;
                const classes = ['cal-quadro'];
                if (data === hoje) classes.push('cal-quadro--hoje');
                if (data === diaEscolhido) classes.push('cal-quadro--escolhido');
                const anuais = anuaisPorDia[data] || [];
                if (anuais.some((d) => d.folga)) classes.push('cal-quadro--feriado');
                if (anuais.some((d) => d.sazonal)) classes.push('cal-quadro--sazonal');
                // Os dias ficam limpos: o que acontece em cada dia aparece no painel ao lado
                return (
                  <button
                    key={data}
                    type="button"
                    className={classes.join(' ')}
                    onClick={() => escolherDia(data)}
                    aria-pressed={data === diaEscolhido}
                    aria-label={`${diaPorExtenso(data)}${anuais.length ? ` · ${anuais.map((d) => d.nome).join(', ')}` : ''}${fixasPorDia[data] ? ` · ${fixasPorDia[data] === 1 ? 'vence 1 conta fixa' : `vencem ${fixasPorDia[data]} contas fixas`}` : ''}`}
                  >
                    <span className="cal-quadro__numero">{Number(data.slice(8))}</span>
                    {anuais.length > 0 && (
                      <span className="cal-quadro__anual" title={anuais.map((d) => d.nome).join(' · ')} aria-hidden="true">
                        {anuais.slice(0, 2).map((d) => d.emoji).join('')}
                      </span>
                    )}
                    {fixasPorDia[data] > 0 && (
                      <span className="cal-quadro__fixa" title="Vencimento de conta fixa" aria-hidden="true">
                        <IconeRepetir tamanho={11} espessura={2.6} />
                        {fixasPorDia[data] > 1 ? fixasPorDia[data] : 'Fixa'}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <p className="cal-grade__legenda">
              <span className="cal-quadro__fixa" aria-hidden="true">
                <IconeRepetir tamanho={11} espessura={2.6} />
                Fixa
              </span>
              dia de vencimento de conta fixa
              <span className="cal-grade__legenda-feriado" aria-hidden="true">7</span>
              feriado
              <span className="cal-grade__legenda-sazonal" aria-hidden="true" />
              gasto a mais
              <button type="button" className="cal-grade__datas" onClick={() => setEscolhendoDatas(true)}>
                Escolher datas do ano
              </button>
            </p>
          </section>

          <div className="cal__lado">
            {/* ===== Dia escolhido ===== */}
            <section className="cartao cal-dia" aria-live="polite">
              <div className="cal-dia__topo">
                <h2 className="cartao__titulo">{diaPorExtenso(diaEscolhido)}</h2>
                {doDia.length + parcelasDoDia.length > 0 && (
                  <b className={saldoDoDia >= 0 ? 'cal-dia__saldo valor--entrada' : 'cal-dia__saldo valor--saida'}>
                    {valorComSinal(saldoDoDia)}
                  </b>
                )}
              </div>

              {datasDoDia.length > 0 && (
                <ul className="cal-dia__datas">
                  {datasDoDia.map((d) => (
                    <li
                      key={d.chave}
                      className={['cal-data', d.folga && 'cal-data--folga', d.sazonal && 'cal-data--sazonal'].filter(Boolean).join(' ')}
                    >
                      <span className="cal-data__emoji" aria-hidden="true">{d.emoji}</span>
                      <span className="cal-data__textos">
                        <b>{d.nome}</b>
                        <small>
                          {d.tipo}
                          {d.dica ? ` · ${d.dica}` : ''}
                        </small>
                        {d.sazonal && (
                          <span className="cal-data__gasto">
                            Gasto a mais{d.valor ? ` · ${reais(d.valor)}` : ''}
                          </span>
                        )}
                      </span>
                      {d.pessoal && (
                        <button type="button" className="cal-data__apagar" onClick={() => apagarEspecial(d.id)}>
                          Apagar
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              {doDia.length === 0 && parcelasDoDia.length === 0 ? (
                <p className="cal-dia__vazio">{datasDoDia.length ? 'Nenhuma conta para este dia.' : 'Nada marcado para este dia.'}</p>
              ) : doDia.length === 0 ? null : (
                <ul className="cal-dia__lista">
                  {doDia.map((l) => {
                    const s = situacao(l, hoje);
                    return (
                      <li key={l.id} className="cal-item">
                        <span className="cal-item__icone" style={{ background: categoria(l.categoria).cor }}>
                          {categoria(l.categoria).emoji}
                        </span>
                        <span className="cal-item__textos">
                          <b className="cal-item__nome">{l.descricao}</b>
                          <span className="cal-item__detalhe">
                            {l.categoria} · {l.conta}
                          </span>
                          <span className="cal-item__selos">
                            <span className={`cal-selo cal-selo--${s.classe}`}>{s.texto}</span>
                            {ehFixa(l) && (
                              <span className="cal-selo cal-selo--fixa">
                                <IconeRepetir tamanho={11} espessura={2.6} /> Conta fixa
                              </span>
                            )}
                          </span>
                        </span>
                        <span className="cal-item__direita">
                          <b className={l.valor >= 0 ? 'cal-item__valor valor--entrada' : 'cal-item__valor valor--saida'}>
                            {valorComSinal(l.valor)}
                          </b>
                          <button type="button" className="cal-item__acao" onClick={() => alternarPago(l)}>
                            {l.pago ? 'Desfazer' : l.valor >= 0 ? 'Marcar recebido' : 'Marcar pago'}
                          </button>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}

              {parcelasDoDia.length > 0 && (
                <ul className="cal-dia__lista cal-dia__parcelas">
                  {parcelasDoDia.map((p) => (
                    <ParcelaDivida key={p.chave} p={p} aoMudar={parcelaMudou} />
                  ))}
                </ul>
              )}

              {aviso && (
                <p className="cal-evento__ok" role="status">
                  {aviso}
                </p>
              )}

              {/* Adicionar neste dia: data especial (aniversário, viagem...) ou conta/receita */}
              {especial && (
                <DataEspecial data={diaEscolhido} aoSalvar={salvarEspecial} aoFechar={() => setEspecial(false)} />
              )}
              {!evento && !especial ? (
                <div className="cal-dia__adicionar">
                  <button type="button" className="cal-evento__abrir cal-evento__abrir--especial" onClick={abrirEspecial}>
                    <IconeMais tamanho={18} espessura={2.6} />
                    Data especial
                  </button>
                  <button type="button" className="cal-evento__abrir" onClick={abrirEvento}>
                    <IconeMais tamanho={18} espessura={2.6} />
                    Conta ou receita
                  </button>
                </div>
              ) : !evento ? null : (
                <form className="cal-evento" onSubmit={criarEvento} noValidate>
                  <div className="cal-evento__topo">
                    <b>Nova conta ou receita</b>
                    <button type="button" className="cal-evento__fechar" onClick={() => setEvento(null)} aria-label="Fechar">
                      ×
                    </button>
                  </div>

                  <div className="cal-evento__opcoes" role="group" aria-label="Despesa ou ganho">
                    {[
                      ['despesa', 'Despesa'],
                      ['receita', 'Ganho'],
                    ].map(([v, t]) => (
                      <button
                        key={v}
                        type="button"
                        aria-pressed={evento.tipo === v}
                        className={evento.tipo === v ? `cal-evento__opcao cal-evento__opcao--${v}` : 'cal-evento__opcao'}
                        onClick={() => mudarEvento('tipo', v)}
                      >
                        {t}
                      </button>
                    ))}
                  </div>

                  <label className="cal-evento__campo">
                    Nome
                    <input
                      autoFocus
                      autoComplete="off"
                      placeholder="Ex.: Conta de luz, IPVA"
                      value={evento.titulo}
                      onChange={(e) => mudarEvento('titulo', e.target.value)}
                    />
                  </label>
                  <div className="cal-evento__dupla">
                    <label className="cal-evento__campo">
                      Valor (R$)
                      <input
                        inputMode="decimal"
                        autoComplete="off"
                        placeholder="0,00"
                        value={evento.valorTexto}
                        onChange={(e) => mudarEvento('valorTexto', mascaraValor(e.target.value))}
                      />
                    </label>
                    <label className="cal-evento__campo">
                      Vencimento
                      <input type="date" value={evento.data} onChange={(e) => mudarEvento('data', e.target.value)} />
                    </label>
                  </div>
                  <label className="cal-evento__campo">
                    Conta
                    <input
                      list="cal-contas"
                      autoComplete="off"
                      placeholder="Ex.: Nubank"
                      value={evento.conta}
                      onChange={(e) => mudarEvento('conta', e.target.value)}
                    />
                    <datalist id="cal-contas">
                      {contas.map((c) => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>
                  </label>

                  <div className="cal-evento__opcoes" role="group" aria-label="Frequência">
                    <button
                      type="button"
                      aria-pressed={!evento.fixo}
                      className={!evento.fixo ? 'cal-evento__opcao cal-evento__opcao--ativa' : 'cal-evento__opcao'}
                      onClick={() => mudarEvento('fixo', false)}
                    >
                      Só nesta data
                    </button>
                    <button
                      type="button"
                      aria-pressed={evento.fixo}
                      className={evento.fixo ? 'cal-evento__opcao cal-evento__opcao--ativa' : 'cal-evento__opcao'}
                      onClick={() => mudarEvento('fixo', true)}
                    >
                      Fixo (todo mês)
                    </button>
                  </div>
                  <p className="cal-evento__dica">
                    {evento.fixo
                      ? `Vai aparecer todo mês, no dia ${Number(evento.data.slice(8)) || ''}.`
                      : 'Aparece só uma vez. Para outro mês, é só mudar a data.'}{' '}
                    {evento.tipo === 'despesa' && 'Você recebe um aviso 3 dias e 1 dia antes.'}
                  </p>

                  {erro && <p className="cal-dia__erro">{erro}</p>}
                  <button type="submit" className="cal-evento__salvar">
                    Salvar
                  </button>
                </form>
              )}
            </section>

            {/* ===== Parcelas de A receber e A pagar neste mês ===== */}
            {parcelas.length > 0 && (
              <section className="cartao">
                <div className="cartao__titulo-linha">
                  <h2 className="cartao__titulo">Parcelas do mês</h2>
                  <span className="cal-parcelas__links">
                    <Link to="/painel/receber" className="cartao__link">
                      A receber
                    </Link>
                    <Link to="/painel/pagar" className="cartao__link">
                      A pagar
                    </Link>
                  </span>
                </div>
                <ul className="cal-proximos">
                  {parcelas.map((p) => {
                    const [, m, d] = p.vence.split('-');
                    const receber = p.tipo === 'receber';
                    return (
                      <li key={p.chave}>
                        <button type="button" className="cal-proximo" onClick={() => irPara(p.vence)}>
                          <span className={p.atrasada ? 'vencimento cal-proximo__data--atrasado' : 'vencimento'}>
                            <b>{Number(d)}</b>
                            {MESES_CURTOS[Number(m) - 1]}
                          </span>
                          <span className="cal-proximo__textos">
                            <b className="cal-proximo__nome">
                              {receber ? '🤝 ' : '🧾 '}
                              {p.divida.pessoa}
                              {p.total > 1 ? ` (${p.numero}/${p.total})` : ''}
                            </b>
                            <span className={p.atrasada ? 'cal-proximo__quando valor--saida' : 'cal-proximo__quando'}>
                              {p.estado === 'paga' ? (receber ? 'Recebida' : 'Paga') : `${receber ? 'A receber' : 'A pagar'} · ${quandoVence(p.vence)}`}
                            </span>
                          </span>
                          <b className={receber ? 'cal-proximo__valor valor--entrada' : 'cal-proximo__valor'}>
                            {reais(p.estado === 'paga' ? p.valor : p.aPagarAgora)}
                          </b>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            {/* ===== Próximos vencimentos ===== */}
            <section className="cartao">
              <div className="cartao__titulo-linha">
                <h2 className="cartao__titulo">Próximos vencimentos</h2>
                <Link to="/painel/lancamentos" className="cartao__link">
                  Lançamentos
                </Link>
              </div>
              {proximos.length === 0 ? (
                <p className="cal-dia__vazio">Nenhuma conta em aberto nos próximos 30 dias. 🎉</p>
              ) : (
                <ul className="cal-proximos">
                  {proximos.map((l) => {
                    const [, m, d] = l.data.split('-');
                    const atrasado = l.data < hoje;
                    return (
                      <li key={l.id}>
                        <button type="button" className="cal-proximo" onClick={() => irPara(l.data)}>
                          <span className={atrasado ? 'vencimento cal-proximo__data--atrasado' : 'vencimento'}>
                            <b>{Number(d)}</b>
                            {MESES_CURTOS[Number(m) - 1]}
                          </span>
                          <span className="cal-proximo__textos">
                            <b className="cal-proximo__nome">{l.descricao}</b>
                            <span className={atrasado ? 'cal-proximo__quando valor--saida' : 'cal-proximo__quando'}>
                              {quandoVence(l.data)}
                            </span>
                          </span>
                          <b className="cal-proximo__valor">{reais(Math.abs(l.valor))}</b>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>
        </div>
        {escolhendoDatas && (
          <DatasDoAno
            desligadas={desligadas}
            ano={ano}
            sazonaisLigadas={sazonaisLigadas}
            aoMudar={setDesligadas}
            aoFechar={() => setEscolhendoDatas(false)}
          />
        )}
      </main>
    </div>
  );
}
