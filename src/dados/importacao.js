// ===== Trazer meses passados: importar extratos, planilhas e resumos =====
// Tudo o que é importado ganha um "lote" (guardado na chave "importacoes"), para poder desfazer depois.
//
// Começo da conta: quando chega histórico mais antigo que o começo da conta, a conta passa a começar na
// data mais antiga e o saldo inicial é recalculado para o saldo de HOJE continuar o mesmo
// (o "Saldo inicial" que virou receita no dia da criação some, porque agora o histórico explica esse saldo).
import { carregar, salvar, novoId, dataDeHoje, carregarCategorias, salvarCategorias, nomeDoMes, diasNoMes } from './lancamentos.js';
import { carregarContas, salvarContas, mesmoNome, CORES } from './contas.js';
import { carregarReceber, salvarReceber, registrarRecebimento, desfazerRecebimento } from './receber.js';
import { carregarPagar, salvarPagar, registrarPagamento, desfazerPagamento } from './pagar.js';
import { chave } from './armazenamento.js';
import { provedorDe } from './recorrentes.js';

const CHAVE_LOTES = () => chave('importacoes');
export const CONTA_DO_RESUMO = 'Histórico (resumo)'; // não é uma conta de verdade: não mexe em nenhum saldo

const centavos = (n) => Math.round(n * 100) / 100;

// ----- Lotes (para desfazer) -----
export function carregarLotes() {
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE_LOTES()));
    return Array.isArray(salvo) ? salvo : [];
  } catch {
    return [];
  }
}

function salvarLotes(lotes) {
  try {
    localStorage.setItem(CHAVE_LOTES(), JSON.stringify(lotes.slice(0, 100)));
  } catch {
    /* sem espaço */
  }
}

function novoLote(origem, descricao) {
  return { id: novoId(), quando: new Date().toISOString(), origem, descricao, qtd: 0, de: '', ate: '', contas: [], contasAntes: [], contasCriadas: [] };
}

function guardarLote(lote, lista) {
  const meus = lista.filter((l) => l.lote === lote.id);
  if (!meus.length) return;
  const datas = meus.map((l) => l.data).sort();
  salvarLotes([{ ...lote, qtd: meus.length, de: datas[0] || '', ate: datas.at(-1) || '' }, ...carregarLotes()]);
}

// Como a conta estava antes da importação (para desfazer o "Deixar o saldo igual ao do banco")
function lembrarConta(lote, c) {
  if (!lote.contasAntes.some((x) => x.id === c.id)) {
    lote.contasAntes.push({ id: c.id, saldoInicial: c.saldoInicial || 0, criadaEm: c.criadaEm || '', inicioReal: c.inicioReal || null });
  }
}

// Conta pelo nome (sem ligar para maiúsculas/acentos); cria se não existir
function garantirNaLista(contas, nome, { cartao = false, criadaEm, lote }) {
  const existente = contas.find((c) => mesmoNome(c.nome, nome));
  if (existente) return existente;
  const nova = {
    id: novoId(),
    nome: nome.trim().replace(/\s+/g, ' '),
    tipo: cartao || /cart[aã]o|cr[eé]dito/i.test(nome) ? 'Cartão de crédito' : /carteira|dinheiro/i.test(nome) ? 'Carteira' : 'Conta corrente',
    saldoInicial: 0,
    criadaEm: criadaEm || dataDeHoje(),
    cor: CORES[contas.length % CORES.length],
    noTotal: !(cartao || /cart[aã]o|cr[eé]dito/i.test(nome)), // cartão não soma no saldo geral
    criadaPorImportacao: true,
  };
  contas.push(nova);
  lote?.contasCriadas.push(nova.id);
  return nova;
}

// Um ganho/gasto importado que é o fixo daquele mês (ex.: o salário de novembro de um salário fixo)
// fica ligado à série ("origem"): assim ele substitui o previsto e aparece como recebido/pago no Checklist,
// em vez de contar duas vezes.
function distanciaDeDia(a, b) {
  const d = Math.abs(a - b);
  return Math.min(d, 31 - d);
}

export function ligarAosFixos(novos, lista) {
  const fixos = lista.filter((l) => l.repete && !l.transferencia && provedorDe(l.descricao));
  if (!fixos.length) return novos;
  const ocupados = new Set(lista.filter((l) => l.origem).map((l) => `${l.origem}@${l.data.slice(0, 7)}`));
  return novos.map((n) => {
    if (n.transferencia || n.origem || n.repete || n.grupo) return n;
    const mes = n.data.slice(0, 7);
    const p = provedorDe(n.descricao);
    const serie = fixos.find(
      (f) =>
        Math.sign(f.valor) === Math.sign(n.valor) &&
        f.data.slice(0, 7) < mes &&
        (!f.ate || mes <= f.ate) &&
        !ocupados.has(`${f.id}@${mes}`) &&
        provedorDe(f.descricao) === p &&
        distanciaDeDia(Number(f.data.slice(8)), Number(n.data.slice(8))) <= 5 &&
        Math.abs(Math.abs(n.valor) - Math.abs(f.valor)) <= Math.abs(f.valor) * 0.3
    );
    if (!serie) return n;
    ocupados.add(`${serie.id}@${mes}`);
    return { ...n, origem: serie.id };
  });
}

// ----- Começo da conta quando chega histórico mais antigo -----
// A conta tem um "ponto de partida" que você confirmou (o "Saldo inicial" do dia em que criou a conta).
// Histórico de antes desse dia não muda o saldo de hoje: a conta passa a começar na data mais antiga
// e o saldo inicial é recalculado. O ponto de partida original fica guardado em "inicioReal" para,
// ao desfazer todas as importações antigas, a conta voltar a ser exatamente como era.
function somaPaga(itens) {
  return centavos(itens.filter((l) => l.pago).reduce((s, l) => s + l.valor, 0));
}

export function ajustarInicio(c, lista) {
  const daConta = lista.filter((l) => l.conta === c.nome && !l.resumo);
  let ir = c.inicioReal;
  if (!ir) {
    const si = daConta.find((l) => l.saldoInicialDaConta);
    // Conta criada pela própria importação (sem saldo confirmado): só estende o começo
    if (c.criadaPorImportacao && !si) {
      const maisAntigo = daConta.map((l) => l.data).sort()[0];
      if (maisAntigo && (!c.criadaEm || maisAntigo < c.criadaEm)) c.criadaEm = maisAntigo;
      return lista;
    }
    const corte = si ? si.data : c.criadaEm;
    if (!corte) return lista;
    const importadosAntes = daConta.filter((l) => l.lote && l.data < corte && !l.saldoInicialDaConta);
    if (!importadosAntes.length) return lista;
    const ids = new Set(importadosAntes.map((l) => l.id));
    ir = {
      data: corte,
      saldoInicial: Number(c.saldoInicial) || 0,
      criadaEm: c.criadaEm || '',
      lancamento: si || null,
      // o que já estava lançado antes do corte (antes de qualquer importação) já contava no saldo
      somaAntes: somaPaga(daConta.filter((l) => l.data < corte && !l.saldoInicialDaConta && !ids.has(l.id))),
    };
  }
  const antes = daConta.filter((l) => l.data < ir.data && !l.saldoInicialDaConta);
  if (!antes.some((l) => l.lote)) {
    // Não sobrou histórico importado: volta tudo como era
    c.saldoInicial = ir.saldoInicial;
    if (ir.criadaEm) c.criadaEm = ir.criadaEm;
    else delete c.criadaEm;
    delete c.inicioReal;
    if (ir.lancamento && !lista.some((l) => l.id === ir.lancamento.id)) return [ir.lancamento, ...lista];
    return lista;
  }
  const noCorte = ir.saldoInicial + (ir.lancamento?.pago ? ir.lancamento.valor : 0) + ir.somaAntes;
  c.saldoInicial = centavos(noCorte - somaPaga(antes));
  c.criadaEm = antes.map((l) => l.data).sort()[0];
  c.inicioReal = ir;
  return ir.lancamento ? lista.filter((l) => l.id !== ir.lancamento.id) : lista;
}

function ajustarContas(nomes, lista, contas, lote) {
  let mudou = lista;
  [...new Set(nomes)].forEach((nome) => {
    const c = contas.find((x) => mesmoNome(x.nome, nome));
    if (!c) return;
    if (lote) lembrarConta(lote, c);
    mudou = ajustarInicio(c, mudou);
  });
  return mudou;
}

// ----- Extrato ou fatura (OFX/CSV), vindo da janela de conferência -----
export function aplicarImportacao({ conta: nomeDigitado, cartao, itens, saldo, saldoData }, { descricao = 'Extrato' } = {}) {
  const lote = novoLote(cartao ? 'fatura' : 'extrato', descricao);
  const contas = carregarContas();
  const datas = itens.map((t) => t.data).sort();
  const conta = garantirNaLista(contas, nomeDigitado, { cartao, criadaEm: datas[0], lote });
  const nome = conta.nome;
  const criada = lote.contasCriadas.includes(conta.id);
  lote.contas = [nome];

  // Movimentações ligadas a uma dívida viram pagamento/recebimento de parcela
  const ligadas = itens.filter((t) => t.divida);
  const novos = ligarAosFixos(itens
    .filter((t) => !t.divida)
    .map((t) => ({
      id: novoId(),
      data: t.data,
      descricao: t.descricao,
      categoria: t.categoria,
      conta: nome,
      valor: t.valor,
      pago: true, // movimentação do extrato já aconteceu
      repete: false,
      observacao: 'Importado do extrato',
      ofx: t.chave, // evita importar a mesma movimentação duas vezes
      lote: lote.id,
    })), carregar());
  salvar([...novos, ...carregar()]);
  salvarContas(contas);

  let quitadas = 0;
  if (ligadas.length) {
    let receber = carregarReceber();
    let pagar = carregarPagar();
    ligadas.forEach((t) => {
      const [tipo, id] = t.divida.split(':');
      const d = (tipo === 'receber' ? receber : pagar).find((x) => x.id === id);
      if (!d) return;
      const nova = (tipo === 'receber' ? registrarRecebimento : registrarPagamento)(d, { valor: Math.abs(t.valor), data: t.data, conta: nome });
      const ultimo = (tipo === 'receber' ? nova.recebimentos : nova.pagamentos).at(-1);
      const ids = [ultimo?.lancamentoId, ultimo?.lancamentoJurosId].filter(Boolean);
      salvar(carregar().map((l) => (ids.includes(l.id) ? { ...l, ofx: l.id === ultimo.lancamentoId ? t.chave : l.ofx, lote: lote.id } : l)));
      if (tipo === 'receber') receber = receber.map((x) => (x.id === id ? nova : x));
      else pagar = pagar.map((x) => (x.id === id ? nova : x));
      quitadas += 1;
    });
    salvarReceber(receber);
    salvarPagar(pagar);
  }

  let lista = ajustarContas([nome], carregar(), contas, lote);

  // Saldo igual ao do banco (opção da janela de conferência): o banco passa a ser o ponto de partida
  if (saldo !== null && saldo !== undefined) {
    if (conta.inicioReal?.lancamento) lista = lista.filter((l) => l.id !== conta.inicioReal.lancamento.id);
    delete conta.inicioReal;
    delete conta.criadaPorImportacao;
    const movimentado = lista.filter((l) => l.conta === nome && l.pago && l.data <= saldoData).reduce((s, l) => s + l.valor, 0);
    conta.saldoInicial = centavos(saldo - movimentado);
    const maisAntigo = lista.filter((l) => l.conta === nome).map((l) => l.data).sort()[0];
    if (maisAntigo && (!conta.criadaEm || maisAntigo < conta.criadaEm)) conta.criadaEm = maisAntigo;
    lote.ancorou = true;
  }

  salvar(lista);
  salvarContas(contas);
  guardarLote(lote, lista);
  return { nome, criada, importados: novos.length, quitadas, loteId: lote.id };
}

// ----- Planilha (modelo da CIFRA, Organizze, Mobills ou outra) -----
// linhas: [{ data, descricao, valor, categoria, conta, pago }]
export function aplicarPlanilha(linhas, { descricao = 'Planilha', contaPadrao = 'Planilha importada' } = {}) {
  const lote = novoLote('planilha', descricao);
  const contas = carregarContas();
  const categorias = [...carregarCategorias()];
  const nomesDasCategorias = new Map(categorias.map((c) => [semAcento(c.nome), c.nome]));
  let criouCategoria = false;
  const usadas = [];

  const novos = linhas.map((r) => {
    const conta = garantirNaLista(contas, r.conta || contaPadrao, { criadaEm: r.data, lote });
    usadas.push(conta.nome);
    let cat = 'Outros';
    if (r.categoria) {
      const achada = nomesDasCategorias.get(semAcento(r.categoria));
      if (achada) cat = achada;
      else {
        // Categoria que veio do outro app: cria igual, para não perder a organização da pessoa
        const nova = { nome: r.categoria.trim().slice(0, 30), emoji: '🏷️', cor: CORES[categorias.length % CORES.length], tipo: r.valor >= 0 ? 'receita' : 'despesa' };
        categorias.push(nova);
        nomesDasCategorias.set(semAcento(nova.nome), nova.nome);
        cat = nova.nome;
        criouCategoria = true;
      }
    }
    return {
      id: novoId(),
      data: r.data,
      descricao: r.descricao || 'Importado da planilha',
      categoria: cat,
      conta: conta.nome,
      valor: r.valor,
      pago: r.pago !== false,
      repete: false,
      observacao: 'Importado da planilha',
      lote: lote.id,
    };
  });
  if (criouCategoria) salvarCategorias(categorias);
  lote.contas = [...new Set(usadas)];
  const atuais = carregar();
  let lista = [...ligarAosFixos(novos, atuais), ...atuais];
  lista = ajustarContas(lote.contas, lista, contas, lote);
  salvar(lista);
  salvarContas(contas);
  guardarLote(lote, lista);
  return { importados: novos.length, contas: lote.contas, contasCriadas: lote.contasCriadas.length, categoriasCriadas: criouCategoria };
}

function semAcento(texto) {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

// ----- Resumo de um mês antigo (sem o detalhe de cada gasto) -----
// itens: [{ categoria, valor }] com valor positivo para ganhos e negativo para gastos.
// Fica na conta "Histórico (resumo)", que não é uma conta de verdade: aparece nos gráficos e relatórios,
// mas não muda o saldo das suas contas. Salvar de novo o mesmo mês troca o resumo anterior.
export function aplicarResumo(mes, itens) {
  const anterior = carregarLotes().find((l) => l.origem === 'resumo' && l.de.startsWith(mes));
  if (anterior) desfazerLote(anterior.id);
  const validos = itens.filter((i) => Math.abs(i.valor) >= 0.01);
  if (!validos.length) return 0;
  const lote = novoLote('resumo', `Resumo de ${nomeDoMes(mes).toLowerCase()}`);
  lote.contas = [CONTA_DO_RESUMO];
  const data = `${mes}-${String(diasNoMes(mes)).padStart(2, '0')}`;
  const novos = validos.map((i) => ({
    id: novoId(),
    data,
    descricao: `Resumo de ${nomeDoMes(mes).toLowerCase()} · ${i.categoria}`,
    categoria: i.categoria,
    conta: CONTA_DO_RESUMO,
    valor: centavos(i.valor),
    pago: true,
    repete: false,
    observacao: 'Total do mês informado em "Trazer meses passados"',
    resumo: true,
    lote: lote.id,
  }));
  const lista = [...novos, ...carregar()];
  salvar(lista);
  guardarLote(lote, lista);
  return novos.length;
}

// Resumo já salvo de um mês: { categoria: valor }
export function resumoDoMes(mes) {
  const r = {};
  carregar()
    .filter((l) => l.resumo && l.data.startsWith(mes))
    .forEach((l) => {
      r[l.categoria] = (r[l.categoria] || 0) + l.valor;
    });
  return r;
}

// ----- Desfazer uma importação -----
export function desfazerLote(id) {
  const lote = carregarLotes().find((l) => l.id === id);
  if (!lote) return false;
  const doLote = carregar().filter((l) => l.lote === id);

  // Pagamentos/recebimentos de dívidas feitos pela importação
  let receber = carregarReceber();
  let pagar = carregarPagar();
  doLote.forEach((l) => {
    if (l.receber) {
      const d = receber.find((x) => x.id === l.receber);
      const r = d?.recebimentos?.find((x) => x.lancamentoId === l.id);
      if (d && r) receber = receber.map((x) => (x.id === d.id ? desfazerRecebimento(d, r.id) : x));
    }
    if (l.pagar) {
      const d = pagar.find((x) => x.id === l.pagar);
      const p = d?.pagamentos?.find((x) => x.lancamentoId === l.id);
      if (d && p) pagar = pagar.map((x) => (x.id === d.id ? desfazerPagamento(d, p.id) : x));
    }
  });
  salvarReceber(receber);
  salvarPagar(pagar);

  // Tira os lançamentos do lote e acerta o começo das contas (o saldo de hoje volta a ser o de antes)
  const saindo = new Set(doLote.map((l) => l.id));
  // Meses que estavam ligados a um fixo que sai junto deixam de ser "daquele fixo"
  let lista = carregar()
    .filter((l) => l.lote !== id)
    .map((l) => {
      if (!l.origem || !saindo.has(l.origem)) return l;
      const solto = { ...l };
      delete solto.origem;
      return solto;
    });
  let contas = carregarContas();
  if (lote.ancorou) {
    // Este lote mudou o saldo para o do banco: volta a conta como estava
    contas = contas.map((c) => {
      const antes = lote.contasAntes.find((x) => x.id === c.id);
      if (!antes) return c;
      const volta = { ...c, saldoInicial: antes.saldoInicial, criadaEm: antes.criadaEm };
      if (antes.inicioReal) volta.inicioReal = antes.inicioReal;
      else delete volta.inicioReal;
      if (!volta.criadaEm) delete volta.criadaEm;
      return volta;
    });
    const si = lote.contasAntes.map((x) => x.inicioReal?.lancamento).filter(Boolean);
    lista = [...si.filter((l) => !lista.some((x) => x.id === l.id)), ...lista];
  }
  lote.contas.forEach((nome) => {
    const c = contas.find((x) => mesmoNome(x.nome, nome));
    if (c && !lote.ancorou) lista = ajustarInicio(c, lista);
  });
  salvar(lista);
  // Contas que a importação criou e ficaram vazias saem
  contas = contas.filter((c) => !lote.contasCriadas.includes(c.id) || lista.some((l) => l.conta === c.nome));
  salvarContas(contas);

  salvarLotes(carregarLotes().filter((l) => l.id !== id));
  return true;
}
