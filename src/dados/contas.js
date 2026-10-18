// ===== Contas: bancos, carteira, poupança... =====
// Tudo fica salvo só neste aparelho (localStorage do navegador).
import { chave } from './armazenamento.js';
import { carregar, dataDeHoje, lancamentosDoMes, mesFinanceiro, novoId, mudarMes, diasNoMes } from './lancamentos.js';
import { inicioDoMes } from './preferencias.js';

const CHAVE = () => chave('contas');

export const TIPOS = ['Conta corrente', 'Poupança', 'Carteira', 'Cartão de crédito', 'Investimento', 'Outra'];

// Cores (tons pastel) que a pessoa pode escolher para cada conta
export const CORES = ['#D9CCF0', '#F5C08F', '#A8D5A2', '#9EC5E8', '#E7AFC3', '#F3DE8A', '#EEE6D8'];

// Versões antigas vinham com 3 contas de exemplo (Nubank, Inter e Carteira).
// Elas são tiradas, menos as que a pessoa já usou em algum lançamento dela:
// essas ficam, mas com saldo inicial zerado.
function semExemplos(contas) {
  const usadas = new Set(carregar().map((l) => l.conta));
  return contas
    .filter((c) => !c.exemplo || usadas.has(c.nome))
    .map((c) => (c.exemplo ? { ...c, exemplo: false, saldoInicial: 0 } : c));
}

// Um usuário novo começa sem nenhuma conta
export function carregarContas() {
  try {
    const salvo = localStorage.getItem(CHAVE());
    if (salvo) return semExemplos(JSON.parse(salvo));
  } catch {
    /* sem acesso ao armazenamento */
  }
  return [];
}

export function salvarContas(contas) {
  try {
    localStorage.setItem(CHAVE(), JSON.stringify(contas));
  } catch {
    /* sem acesso ao armazenamento: os dados ficam só até fechar a página */
  }
}

// Só os nomes (usado nos formulários de lançamento e do calendário)
export function nomesDasContas() {
  return carregarContas().map((c) => c.nome);
}

// Compara nomes sem ligar para maiúsculas, acentos e espaços ("nubank " = "Nubank")
export function mesmoNome(a, b) {
  const limpar = (t) => t.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return limpar(a) === limpar(b);
}

// Garante que a conta existe: se a pessoa digitou uma conta nova num lançamento,
// ela é criada na tela de Contas (saldo inicial R$ 0,00).
// Devolve o nome certinho da conta (do jeito que está cadastrada) e se ela foi criada agora.
export function garantirConta(nome) {
  const limpo = nome.trim().replace(/\s+/g, ' ');
  const contas = carregarContas();
  const existente = contas.find((c) => mesmoNome(c.nome, limpo));
  if (existente) return { nome: existente.nome, criada: false };

  const cartao = /cart[aã]o|cr[eé]dito/i.test(limpo);
  const nova = {
    id: novoId(),
    nome: limpo,
    tipo: cartao ? 'Cartão de crédito' : /carteira|dinheiro/i.test(limpo) ? 'Carteira' : 'Conta corrente',
    saldoInicial: 0,
    cor: CORES[contas.length % CORES.length],
    noTotal: !cartao, // cartão não soma no saldo: o dinheiro sai da conta quando a fatura é paga
  };
  salvarContas([...contas, nova]);
  return { nome: nova.nome, criada: true };
}

// Números de uma conta a partir dos lançamentos
export function resumoDaConta(conta, lancamentos) {
  const hoje = dataDeHoje();
  const mes = mesFinanceiro(hoje);
  const daConta = lancamentos.filter((l) => l.conta === conta.nome);

  // Saldo atual: saldo inicial + tudo o que já foi pago/recebido
  const saldo = daConta.filter((l) => l.pago).reduce((s, l) => s + l.valor, conta.saldoInicial);

  // Previsto para o fim do mês: soma o que ainda vai entrar/sair neste mês (inclui os que se repetem)
  const pendentesDoMes = lancamentosDoMes(lancamentos, mes, inicioDoMes()).filter((l) => l.conta === conta.nome && !l.pago);
  const previsto = pendentesDoMes.reduce((s, l) => s + l.valor, saldo);

  const doMes = daConta.filter((l) => mesFinanceiro(l.data) === mes && l.pago && !l.transferencia);
  const entradas = doMes.filter((l) => l.valor > 0).reduce((s, l) => s + l.valor, 0);
  const saidas = doMes.filter((l) => l.valor < 0).reduce((s, l) => s - l.valor, 0);

  // Últimas movimentações: só o que já foi pago ou recebido
  const ultimos = daConta
    .filter((l) => l.pago)
    .sort((a, b) => b.data.localeCompare(a.data))
    .slice(0, 3);

  return { saldo, previsto, entradas, saidas, ultimos, quantidade: daConta.length };
}

// Saldo geral (soma das contas marcadas para entrar no total) no fim de um mês ("2026-08").
// Mês atual (ou futuro) = saldo de hoje, igual ao cartão "Saldo geral" do painel.
// Meses passados = saldo inicial + tudo o que foi pago/recebido até o fim daquele mês.
export function saldoGeralNoFimDo(mes, lancamentos, contas = carregarContas()) {
  const mesAtual = mesFinanceiro(dataDeHoje());
  const noTotal = contas.filter((c) => c.noTotal);
  const nomes = new Set(noTotal.map((c) => c.nome));
  const inicial = noTotal.reduce((s, c) => s + (Number(c.saldoInicial) || 0), 0);
  return lancamentos
    .filter((l) => l.pago && nomes.has(l.conta) && (mes >= mesAtual || mesFinanceiro(l.data) <= mes))
    .reduce((s, l) => s + l.valor, inicial);
}

// ===== Cartão de crédito =====
// Cada compra cai numa fatura. A fatura "fecha" num dia do mês e "vence" alguns dias depois.
// Compra feita no dia do fechamento ou depois vai para a fatura seguinte.
// Pagar a fatura é uma transferência da conta corrente para o cartão (não conta como gasto de novo).

export function ehCartao(conta) {
  return conta?.tipo === 'Cartão de crédito';
}

function diaNoMes(mes, dia) {
  return `${mes}-${String(Math.min(dia, diasNoMes(mes))).padStart(2, '0')}`;
}

// Em qual fatura cai uma compra feita em "data"
export function faturaDaCompra(data, fechamento, vencimento) {
  const mes = data.slice(0, 7);
  const mesFechamento = Number(data.slice(8)) >= fechamento ? mudarMes(mes, 1) : mes;
  const mesVencimento = vencimento > fechamento ? mesFechamento : mudarMes(mesFechamento, 1);
  return {
    chave: mesVencimento, // a fatura é conhecida pelo mês em que vence
    fecha: diaNoMes(mesFechamento, fechamento),
    vence: diaNoMes(mesVencimento, vencimento),
  };
}

// Números do cartão: fatura aberta, fatura fechada, limite usado e disponível
export function resumoDoCartao(conta, lancamentos) {
  const hoje = dataDeHoje();
  const fechamento = Number(conta.fechamento) || 0;
  const vencimento = Number(conta.vencimento) || 0;
  const limite = Number(conta.limite) || 0;
  const doCartao = lancamentos.filter((l) => l.conta === conta.nome);
  const compras = doCartao.filter((l) => !l.transferencia);

  // Quanto você deve hoje no cartão (compras já feitas - pagamentos)
  const saldo = doCartao.filter((l) => l.pago).reduce((s, l) => s + l.valor, conta.saldoInicial || 0);
  const devido = Math.max(-saldo, 0);
  // Parcelas futuras também ocupam o limite
  const futuras = compras.filter((l) => !l.pago && l.valor < 0).reduce((s, l) => s - l.valor, 0);
  const usado = devido + futuras;

  if (!fechamento || !vencimento) {
    return { configurado: false, limite, usado, disponivel: limite - usado, devido, faturas: [] };
  }

  // Soma das compras de cada fatura
  const porFatura = {};
  compras.forEach((l) => {
    const f = faturaDaCompra(l.data, fechamento, vencimento);
    porFatura[f.chave] = (porFatura[f.chave] || 0) - l.valor; // compra soma, estorno desconta
  });

  const aberta = faturaDaCompra(hoje, fechamento, vencimento);
  const chaveFechada = mudarMes(aberta.chave, -1);
  const fechada = {
    chave: chaveFechada,
    fecha: diaNoMes(mudarMes(aberta.fecha.slice(0, 7), -1), fechamento),
    vence: diaNoMes(chaveFechada, vencimento),
  };

  // Compras da fatura aberta que já entraram no "devido" (as de hoje para trás)
  const abertaJaFeita = compras
    .filter((l) => l.pago && faturaDaCompra(l.data, fechamento, vencimento).chave === aberta.chave)
    .reduce((s, l) => s - l.valor, 0);
  const faltaPagarFechada = Math.max(Math.round((devido - abertaJaFeita) * 100) / 100, 0);
  const totalFechada = porFatura[fechada.chave] || 0;

  let situacao = 'sem-fatura';
  if (totalFechada > 0 || faltaPagarFechada > 0) {
    if (faltaPagarFechada <= 0.005) situacao = 'paga';
    else situacao = hoje > fechada.vence ? 'vencida' : 'a-pagar';
  }

  // Próximas faturas (com parcelas já lançadas)
  const proximas = [1, 2, 3]
    .map((n) => mudarMes(aberta.chave, n))
    .map((chave) => ({ chave, total: porFatura[chave] || 0 }))
    .filter((f) => f.total > 0);

  return {
    configurado: true,
    limite,
    usado,
    disponivel: limite - usado,
    devido,
    aberta: { ...aberta, total: porFatura[aberta.chave] || 0 },
    fechada: { ...fechada, total: totalFechada, faltaPagar: faltaPagarFechada, situacao },
    proximas,
  };
}
