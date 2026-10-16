// ===== A receber: dinheiro que alguém está te devendo =====
// Cada "conta a receber" tem a pessoa, o valor total, em quantas parcelas vai pagar e os recebimentos já feitos.
// Dois tipos:
//   - Empréstimo: o dinheiro saiu da sua conta e volta para ela. Não conta como gasto nem como ganho.
//   - Venda ou serviço: o que você receber entra como ganho (categoria "Extra").
import { chave } from './armazenamento.js';
import { carregar, salvar, dataDeHoje, diasAte, diasNoMes, novoId, TRANSFERENCIA, carregarCategorias } from './lancamentos.js';

const CHAVE = () => chave('receber');

export function carregarReceber() {
  try {
    const lista = JSON.parse(localStorage.getItem(CHAVE()) || '[]');
    return Array.isArray(lista) ? lista : [];
  } catch {
    return [];
  }
}

export function salvarReceber(lista) {
  try {
    localStorage.setItem(CHAVE(), JSON.stringify(lista));
  } catch {
    /* sem acesso ao armazenamento */
  }
}

const centavos = (n) => Math.round(n * 100) / 100;

// "2026-10-20" + 2 meses -> "2026-12-20" (dia 31 vira o último dia do mês)
export function somarMeses(data, meses) {
  const [ano, mes, dia] = data.split('-').map(Number);
  const total = ano * 12 + (mes - 1) + meses;
  const novoAno = Math.floor(total / 12);
  const novoMes = String((total % 12) + 1).padStart(2, '0');
  const d = Math.min(dia, diasNoMes(`${novoAno}-${novoMes}`));
  return `${novoAno}-${novoMes}-${String(d).padStart(2, '0')}`;
}

// ----- Juros por atraso -----
// d.juros = { ativo: true, mes: 1 (% ao mês), multa: 2 (% uma vez) }
// Juros simples, contados por dia de atraso (taxa do mês ÷ 30) sobre o que está em aberto de cada parcela vencida.
// A multa é cobrada uma vez, no dia seguinte ao vencimento, sobre o que ficou em aberto da parcela.
// Cada pagamento paga primeiro os juros acumulados e depois as parcelas, da mais antiga para a mais nova.
const diasEntre = (a, b) => Math.round((Date.UTC(...b.split('-').map((n, i) => (i === 1 ? n - 1 : +n))) - Date.UTC(...a.split('-').map((n, i) => (i === 1 ? n - 1 : +n)))) / 864e5);

export function temJuros(d) {
  return Boolean(d.juros?.ativo && d.primeiroVencimento && ((d.juros.mes || 0) > 0 || (d.juros.multa || 0) > 0));
}

function valoresDasParcelas(d) {
  const n = Math.max(1, d.parcelas || 1);
  const cada = centavos(d.valor / n);
  return Array.from({ length: n }, (_, i) => (i < n - 1 ? cada : centavos(d.valor - cada * (n - 1))));
}

// Simula a dívida do começo até "ate" (hoje) e devolve quanto do que foi pago foi para juros e quanto para as parcelas
export function simularJuros(d, recebimentos = d.recebimentos || [], ate = dataDeHoje()) {
  const parcelas = valoresDasParcelas(d);
  const vencimentos = parcelas.map((_, i) => somarMeses(d.primeiroVencimento, i));
  const aberto = [...parcelas];
  const multaAplicada = parcelas.map(() => false);
  const taxaDia = (d.juros?.mes || 0) / 100 / 30;
  const multa = (d.juros?.multa || 0) / 100;
  const pagamentos = recebimentos.filter((r) => r.data <= ate).map((r, i) => ({ ...r, ordem: i })).sort((x, y) => x.data.localeCompare(y.data) || x.ordem - y.ordem);

  const datas = [...new Set([...vencimentos.filter((v) => v < ate), ...pagamentos.map((r) => r.data), ate])].sort();
  let anterior = datas[0] < d.data ? datas[0] : d.data;
  let jurosAbertos = 0;
  let jurosPagos = 0;
  let principalPago = 0;
  const jurosDaParcela = parcelas.map(() => 0); // quanto de juros cada parcela gerou (para mostrar)

  datas.forEach((dia) => {
    // 1) Juros dos dias entre a data anterior e esta, só das parcelas já vencidas
    vencimentos.forEach((venc, i) => {
      if (aberto[i] <= 0) return;
      const inicio = venc > anterior ? venc : anterior;
      const dias = diasEntre(inicio, dia);
      if (dias > 0) {
        const j = aberto[i] * taxaDia * dias;
        jurosAbertos += j;
        jurosDaParcela[i] += j;
      }
    });
    // 2) Multa das parcelas que venceram antes deste dia e continuam em aberto
    vencimentos.forEach((venc, i) => {
      if (multaAplicada[i] || venc >= dia || aberto[i] <= 0) return;
      multaAplicada[i] = true;
      const m = aberto[i] * multa;
      jurosAbertos += m;
      jurosDaParcela[i] += m;
    });
    // 3) Pagamentos deste dia: primeiro os juros, depois as parcelas mais antigas
    pagamentos
      .filter((r) => r.data === dia)
      .forEach((r) => {
        let resto = r.valor;
        const paraJuros = Math.min(resto, jurosAbertos);
        jurosAbertos -= paraJuros;
        jurosPagos += paraJuros;
        resto -= paraJuros;
        for (let i = 0; i < aberto.length && resto > 0.0001; i++) {
          const usa = Math.min(resto, aberto[i]);
          aberto[i] -= usa;
          principalPago += usa;
          resto -= usa;
        }
      });
    anterior = dia;
  });

  return {
    jurosAbertos: centavos(jurosAbertos),
    jurosPagos: centavos(jurosPagos),
    jurosTotal: centavos(jurosAbertos + jurosPagos),
    principalPago: centavos(principalPago),
    jurosDaParcela: jurosDaParcela.map(centavos),
  };
}

// ----- Situação de uma conta a receber -----
export function situacaoDaDivida(d) {
  const recebidoTotal = centavos((d.recebimentos || []).reduce((s, r) => s + r.valor, 0));
  const comJuros = temJuros(d);
  const sim = comJuros ? simularJuros(d) : null;
  // "recebido" = quanto do valor original já voltou (sem contar os juros)
  const recebido = comJuros ? sim.principalPago : recebidoTotal;
  const total = d.valor;
  const falta = centavos(Math.max(total - recebido, 0));
  const parcelas = Math.max(1, d.parcelas || 1);
  const valorParcela = centavos(total / parcelas);
  // Parcelas inteiras já cobertas pelo que foi recebido (pagar meia parcela não conta como parcela paga)
  const parcelasPagas = falta === 0 ? parcelas : Math.min(parcelas, Math.floor((recebido + 0.005) / valorParcela));
  const jurosAbertos = comJuros ? sim.jurosAbertos : 0;
  const quitada = falta === 0 && jurosAbertos < 0.005;
  const parte = total > 0 ? Math.min(100, (recebido / total) * 100) : 0;

  let proxima = null;
  if (!quitada) {
    const numero = Math.min(parcelasPagas + 1, parcelas);
    const vence = d.primeiroVencimento ? somarMeses(d.primeiroVencimento, numero - 1) : null;
    // O que falta desta parcela (se já recebeu uma parte dela, mostra só o resto)
    const valor = centavos(Math.max(0, Math.min(falta, valorParcela * numero - recebido)));
    const dias = vence ? diasAte(vence) : null;
    // Para quitar a parcela atrasada hoje: o que falta dela + todos os juros acumulados
    proxima = { numero, vence, valor, dias, atrasada: dias !== null && dias < 0, comJuros: centavos(valor + jurosAbertos) };
  }
  const ultimo = (d.recebimentos || []).reduce((m, r) => (r.data > m ? r.data : m), '');
  return {
    recebido,
    recebidoTotal,
    falta,
    parcelas,
    valorParcela,
    parcelasPagas,
    quitada,
    quitadaEm: quitada ? ultimo : null,
    parte,
    proxima,
    comJuros,
    jurosAbertos, // juros acumulados que ainda não foram pagos
    jurosPagos: comJuros ? sim.jurosPagos : 0,
    jurosTotal: comJuros ? sim.jurosTotal : 0,
    faltaComJuros: centavos(falta + jurosAbertos),
    estado: quitada ? 'quitada' : proxima?.atrasada ? 'atrasada' : 'em-dia',
  };
}

// Atrasadas primeiro, depois pela data da próxima parcela; quitadas por último
export function ordenarDividas(lista) {
  const peso = { atrasada: 0, 'em-dia': 1, quitada: 2 };
  return [...lista].sort((a, b) => {
    const sa = situacaoDaDivida(a);
    const sb = situacaoDaDivida(b);
    if (peso[sa.estado] !== peso[sb.estado]) return peso[sa.estado] - peso[sb.estado];
    return (sa.proxima?.vence || '9999').localeCompare(sb.proxima?.vence || '9999') || a.pessoa.localeCompare(b.pessoa);
  });
}

// ----- Lançamentos ligados -----
function categoriaDeGanho() {
  const nomes = carregarCategorias().map((c) => c.nome);
  return nomes.includes('Extra') ? 'Extra' : 'Outros';
}

// Empréstimo saindo da conta (no dia em que emprestou)
export function lancamentoDoEmprestimo(divida, conta) {
  return {
    id: novoId(),
    data: divida.data,
    descricao: `Emprestado para ${divida.pessoa}`,
    categoria: TRANSFERENCIA.nome,
    conta,
    valor: -Math.abs(divida.valor),
    pago: divida.data <= dataDeHoje(),
    repete: false,
    observacao: divida.motivo || '',
    transferencia: novoId(), // não conta como gasto
    receber: divida.id,
    pessoa: divida.pessoa,
  };
}

// Quais parcelas este pagamento cobre: "2/5", "2 a 4/5" ou "parte da 2/5"
function quaisParcelas(s, principal) {
  const depois = Math.min(s.parcelas, Math.floor((s.recebido + principal + 0.005) / s.valorParcela));
  const primeira = s.parcelasPagas + 1;
  if (depois < primeira) return `parte da ${primeira}/${s.parcelas}`;
  if (depois === primeira) return `${primeira}/${s.parcelas}`;
  return `${primeira} a ${depois}/${s.parcelas}`;
}

// Registra um recebimento: devolve a dívida atualizada.
// Com juros: a parte que pagou juros vira um ganho ("Juros de Fulano"); o resto volta como parcela.
export function registrarRecebimento(divida, { valor, data, conta }) {
  const s = situacaoDaDivida(divida);
  const real = centavos(Math.min(Math.abs(valor), s.faltaComJuros));
  const recebimento = { id: novoId(), data, valor: real, conta: conta || '', lancamentoId: null, lancamentoJurosId: null };

  // Quanto deste pagamento foi para juros (compara a simulação com e sem ele)
  let juros = 0;
  if (s.comJuros) {
    const antes = simularJuros(divida).jurosPagos;
    const depois = simularJuros(divida, [...(divida.recebimentos || []), recebimento]).jurosPagos;
    juros = centavos(Math.max(0, depois - antes));
  }
  recebimento.juros = juros;
  const principal = centavos(real - juros);

  if (conta) {
    const emprestimo = divida.tipo !== 'venda';
    const novos = [];
    if (principal > 0) {
      const l = {
        id: novoId(),
        data,
        descricao: `Recebido de ${divida.pessoa}${s.parcelas > 1 ? ` (${quaisParcelas(s, principal)})` : ''}`,
        categoria: emprestimo ? TRANSFERENCIA.nome : categoriaDeGanho(),
        conta,
        valor: principal,
        pago: true,
        repete: false,
        observacao: divida.motivo || '',
        receber: divida.id,
        pessoa: divida.pessoa,
        ...(emprestimo ? { transferencia: novoId() } : {}), // empréstimo devolvido não é ganho
      };
      recebimento.lancamentoId = l.id;
      novos.push(l);
    }
    if (juros > 0) {
      // Juros são ganho de verdade, mesmo num empréstimo
      const j = {
        id: novoId(),
        data,
        descricao: `Juros de ${divida.pessoa}`,
        categoria: categoriaDeGanho(),
        conta,
        valor: juros,
        pago: true,
        repete: false,
        observacao: divida.motivo || '',
        receber: divida.id,
        pessoa: divida.pessoa,
        jurosDeReceber: true,
      };
      recebimento.lancamentoJurosId = j.id;
      novos.push(j);
    }
    salvar([...novos, ...carregar()]);
  }
  return { ...divida, recebimentos: [...(divida.recebimentos || []), recebimento] };
}

// Desfaz um recebimento (e apaga o lançamento dele na conta)
export function desfazerRecebimento(divida, recebimentoId) {
  const r = (divida.recebimentos || []).find((x) => x.id === recebimentoId);
  const ids = [r?.lancamentoId, r?.lancamentoJurosId].filter(Boolean);
  if (ids.length) salvar(carregar().filter((l) => !ids.includes(l.id)));
  return { ...divida, recebimentos: (divida.recebimentos || []).filter((x) => x.id !== recebimentoId) };
}

// Quando um lançamento ligado é excluído na tela de Lançamentos, a conta a receber acompanha.
// Devolve os ids de outros lançamentos que também devem sair (ex.: os juros do mesmo recebimento).
export function lancamentoDeReceberExcluido(item) {
  if (!item?.receber) return [];
  let extras = [];
  salvarReceber(
    carregarReceber().map((d) => {
      if (d.id !== item.receber) return d;
      if (item.valor < 0) return { ...d, contaSaida: '', lancamentoId: null }; // apagou o empréstimo: a dívida continua
      if (item.jurosDeReceber) {
        // Apagou só o lançamento dos juros: o recebimento continua, sem a ligação
        return { ...d, recebimentos: (d.recebimentos || []).map((r) => (r.lancamentoJurosId === item.id ? { ...r, lancamentoJurosId: null } : r)) };
      }
      const r = (d.recebimentos || []).find((x) => x.lancamentoId === item.id);
      if (r?.lancamentoJurosId) extras = [r.lancamentoJurosId];
      return { ...d, recebimentos: (d.recebimentos || []).filter((x) => x.lancamentoId !== item.id) };
    })
  );
  return extras;
}

// Mensagem pronta para cobrar pelo WhatsApp (sem número, a pessoa escolhe o contato)
export function linkDeCobranca(divida) {
  const s = situacaoDaDivida(divida);
  const reais = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const p = s.proxima;
  const partes = [`Oi, ${divida.pessoa.split(' ')[0]}! Tudo bem?`];
  if (p && s.parcelas > 1) {
    const quando = p.vence ? (p.atrasada ? ` que venceu em ${p.vence.split('-').reverse().slice(0, 2).join('/')}` : ` que vence em ${p.vence.split('-').reverse().slice(0, 2).join('/')}`) : '';
    partes.push(`Passando para lembrar da parcela ${p.numero} de ${s.parcelas} (${reais(p.valor)})${quando}${divida.motivo ? `, referente a ${divida.motivo.toLowerCase()}` : ''}.`);
  } else {
    partes.push(`Passando para lembrar dos ${reais(s.falta)}${divida.motivo ? ` de ${divida.motivo.toLowerCase()}` : ''}${p?.vence ? `, combinados para ${p.vence.split('-').reverse().slice(0, 2).join('/')}` : ''}.`);
  }
  if (s.jurosAbertos > 0) partes.push(`Com os juros do atraso (combinados), o valor fica em ${reais(p && s.parcelas > 1 ? p.comJuros : s.faltaComJuros)}.`);
  if (s.recebido > 0) partes.push(`Até agora recebi ${reais(s.recebidoTotal)} e faltam ${reais(s.faltaComJuros)}.`);
  partes.push('Obrigado!');
  const digitos = String(divida.whatsapp || '').replace(/\D/g, '');
  const numero = digitos && digitos.length <= 11 ? `55${digitos}` : digitos;
  return `https://wa.me/${numero}?text=${encodeURIComponent(partes.join(' '))}`;
}

// Totais do topo da tela
export function totaisDoReceber(lista = carregarReceber()) {
  const s = lista.map((d) => ({ d, s: situacaoDaDivida(d) }));
  const abertas = s.filter((x) => !x.s.quitada);
  return {
    falta: centavos(abertas.reduce((t, x) => t + x.s.falta, 0)),
    juros: centavos(abertas.reduce((t, x) => t + x.s.jurosAbertos, 0)),
    faltaComJuros: centavos(abertas.reduce((t, x) => t + x.s.faltaComJuros, 0)),
    recebido: centavos(s.reduce((t, x) => t + x.s.recebidoTotal, 0)),
    total: centavos(s.reduce((t, x) => t + x.d.valor, 0)),
    atrasadas: abertas.filter((x) => x.s.estado === 'atrasada').length,
    valorAtrasado: centavos(abertas.filter((x) => x.s.estado === 'atrasada').reduce((t, x) => t + x.s.proxima.comJuros, 0)),
    pessoas: new Set(abertas.map((x) => x.d.pessoa.trim().toLowerCase())).size,
    abertas: abertas.length,
    quitadas: s.length - abertas.length,
  };
}
