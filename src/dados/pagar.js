// ===== A pagar: dívidas que VOCÊ tem com alguém (pessoa, banco, loja) =====
// Funciona como a tela "A receber", ao contrário: os pagamentos saem das suas contas.
// Dois tipos:
//   - Empréstimo: você pegou dinheiro emprestado. A entrada e as parcelas pagas não contam como ganho nem gasto
//     (o gasto de verdade são só os juros).
//   - Compra ou serviço: você comprou algo/contratou e paga depois. Cada parcela paga entra como gasto na categoria escolhida.
// Os cálculos de parcelas e juros são os mesmos da tela "A receber" (dados/receber.js).
import { chave } from './armazenamento.js';
import { carregar, salvar, dataDeHoje, novoId, TRANSFERENCIA } from './lancamentos.js';
import { situacaoDaDivida as situacaoBase, ordenarDividas as ordenarBase, simularJuros, totaisDoReceber } from './receber.js';

const CHAVE = () => chave('pagar');

export function carregarPagar() {
  try {
    const lista = JSON.parse(localStorage.getItem(CHAVE()) || '[]');
    return Array.isArray(lista) ? lista : [];
  } catch {
    return [];
  }
}

export function salvarPagar(lista) {
  try {
    localStorage.setItem(CHAVE(), JSON.stringify(lista));
  } catch {
    /* sem acesso ao armazenamento */
  }
}

const centavos = (n) => Math.round(n * 100) / 100;

// As contas de "A receber" guardam os pagamentos em "recebimentos"; aqui eles se chamam "pagamentos"
const comoDivida = (d) => ({ ...d, recebimentos: d.pagamentos || [] });

export function situacaoDaDivida(d) {
  const s = situacaoBase(comoDivida(d));
  return { ...s, pago: s.recebido, pagoTotal: s.recebidoTotal };
}

export function ordenarDividas(lista) {
  const porId = Object.fromEntries(lista.map((d) => [d.id, d]));
  return ordenarBase(lista.map(comoDivida)).map((d) => porId[d.id]);
}

export function totaisDoPagar(lista = carregarPagar()) {
  const t = totaisDoReceber(lista.map(comoDivida));
  return { ...t, pago: t.recebido, credores: t.pessoas };
}

// Dinheiro do empréstimo entrando numa conta (não é ganho)
export function lancamentoDaEntrada(divida, conta) {
  return {
    id: novoId(),
    data: divida.data,
    descricao: `Empréstimo de ${divida.pessoa}`,
    categoria: TRANSFERENCIA.nome,
    conta,
    valor: Math.abs(divida.valor),
    pago: divida.data <= dataDeHoje(),
    repete: false,
    observacao: divida.motivo || '',
    transferencia: novoId(),
    pagar: divida.id,
    pessoa: divida.pessoa,
  };
}

// Quais parcelas este pagamento cobre: "2/5", "2 a 4/5" ou "parte da 2/5"
function quaisParcelas(s, principal) {
  const depois = Math.min(s.parcelas, Math.floor((s.pago + principal + 0.005) / s.valorParcela));
  const primeira = s.parcelasPagas + 1;
  if (depois < primeira) return `parte da ${primeira}/${s.parcelas}`;
  if (depois === primeira) return `${primeira}/${s.parcelas}`;
  return `${primeira} a ${depois}/${s.parcelas}`;
}

// Registra um pagamento seu. Devolve a dívida atualizada.
// Com juros: a parte dos juros vira um gasto separado ("Juros pagos a Fulano").
export function registrarPagamento(divida, { valor, data, conta }) {
  const s = situacaoDaDivida(divida);
  const real = centavos(Math.min(Math.abs(valor), s.faltaComJuros));
  const pagamento = { id: novoId(), data, valor: real, conta: conta || '', lancamentoId: null, lancamentoJurosId: null };

  let juros = 0;
  if (s.comJuros) {
    const antes = simularJuros(comoDivida(divida)).jurosPagos;
    const depois = simularJuros(comoDivida(divida), [...(divida.pagamentos || []), pagamento]).jurosPagos;
    juros = centavos(Math.max(0, depois - antes));
  }
  pagamento.juros = juros;
  const principal = centavos(real - juros);

  if (conta) {
    const emprestimo = divida.tipo !== 'compra';
    const novos = [];
    if (principal > 0) {
      const l = {
        id: novoId(),
        data,
        descricao: `Pago a ${divida.pessoa}${s.parcelas > 1 ? ` (${quaisParcelas(s, principal)})` : ''}`,
        categoria: emprestimo ? TRANSFERENCIA.nome : divida.categoria || 'Outros',
        conta,
        valor: -principal,
        pago: true,
        repete: false,
        observacao: divida.motivo || '',
        pagar: divida.id,
        pessoa: divida.pessoa,
        ...(emprestimo ? { transferencia: novoId() } : {}), // devolver empréstimo não é gasto
      };
      pagamento.lancamentoId = l.id;
      novos.push(l);
    }
    if (juros > 0) {
      const j = {
        id: novoId(),
        data,
        descricao: `Juros pagos a ${divida.pessoa}`,
        categoria: divida.tipo === 'compra' ? divida.categoria || 'Outros' : 'Outros',
        conta,
        valor: -juros,
        pago: true,
        repete: false,
        observacao: divida.motivo || '',
        pagar: divida.id,
        pessoa: divida.pessoa,
        jurosDePagar: true,
      };
      pagamento.lancamentoJurosId = j.id;
      novos.push(j);
    }
    salvar([...novos, ...carregar()]);
  }
  return { ...divida, pagamentos: [...(divida.pagamentos || []), pagamento] };
}

// Desfaz um pagamento (e tira os lançamentos dele da conta)
export function desfazerPagamento(divida, pagamentoId) {
  const p = (divida.pagamentos || []).find((x) => x.id === pagamentoId);
  const ids = [p?.lancamentoId, p?.lancamentoJurosId].filter(Boolean);
  if (ids.length) salvar(carregar().filter((l) => !ids.includes(l.id)));
  return { ...divida, pagamentos: (divida.pagamentos || []).filter((x) => x.id !== pagamentoId) };
}

// Um lançamento ligado foi excluído na tela de Lançamentos: a dívida acompanha.
// Devolve ids de outros lançamentos que também devem sair (os juros do mesmo pagamento).
export function lancamentoDePagarExcluido(item) {
  if (!item?.pagar) return [];
  let extras = [];
  salvarPagar(
    carregarPagar().map((d) => {
      if (d.id !== item.pagar) return d;
      if (item.valor > 0) return { ...d, contaEntrada: '', lancamentoId: null }; // apagou a entrada do empréstimo
      if (item.jurosDePagar) {
        return { ...d, pagamentos: (d.pagamentos || []).map((p) => (p.lancamentoJurosId === item.id ? { ...p, lancamentoJurosId: null } : p)) };
      }
      const p = (d.pagamentos || []).find((x) => x.lancamentoId === item.id);
      if (p?.lancamentoJurosId) extras = [p.lancamentoJurosId];
      return { ...d, pagamentos: (d.pagamentos || []).filter((x) => x.lancamentoId !== item.id) };
    })
  );
  return extras;
}
