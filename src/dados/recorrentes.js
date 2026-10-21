// ===== Ganhos e gastos que se repetem todo mês =====
// Olha o histórico e acha o que parece fixo:
//  1) mesmo "provedor" (quem pagou ou recebeu, tirado da descrição: "PIX RECEBIDO EMPRESA X" -> "EMPRESA X")
//     em 2 ou mais meses (gastos: 3 ou mais), sempre perto do mesmo dia do mês;
//  2) ganhos de valor parecido que caem no mesmo dia (ou bem perto) em 3 ou mais meses, mesmo com
//     descrições diferentes (ex.: salário que cada mês vem com um texto).
// Levar para o Checklist = marcar o lançamento mais recente como "fixo": ele passa a aparecer todo mês
// (previsto) no Checklist, no Calendário e na previsão do Painel.

const IGNORAR = new Set([
  'PIX', 'RECEBIDO', 'RECEBIDA', 'RECEB', 'ENVIADO', 'ENVIADA', 'TRANSFERENCIA', 'TRANSF', 'TED', 'DOC', 'TEF',
  'CREDITO', 'CRED', 'DEBITO', 'DEB', 'PAGAMENTO', 'PAGTO', 'PGTO', 'PAG', 'COMPRA', 'CARTAO', 'DE', 'DA', 'DO',
  'DAS', 'DOS', 'EM', 'PARA', 'REF', 'VIA', 'CONTA', 'LTDA', 'SA', 'ME', 'EIRELI', 'BCO', 'BANCO', 'AG', 'CC',
  'DEPOSITO', 'DEP', 'ELETRONICO', 'ONLINE', 'INTERNET', 'APP', 'QR', 'CODE', 'AGENDADO', 'RECORRENTE',
]);

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

// "PIX RECEBIDO - EMPRESA XPTO LTDA 05/10" -> "EMPRESA XPTO"
export function provedorDe(descricao) {
  const palavras = String(descricao || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/\(\d+\/\d+\)/g, ' ')
    .replace(/[^A-Z ]/g, ' ')
    .split(/\s+/)
    .filter((p) => p.length >= 3 && !IGNORAR.has(p));
  return palavras.slice(0, 3).join(' ');
}

// Distância entre dias do mês (dia 30 e dia 1 ficam perto)
function distanciaDeDia(a, b) {
  const d = Math.abs(a - b);
  return Math.min(d, 31 - d);
}

const mediana = (v) => {
  const s = [...v].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

const maisComum = (v) => {
  const conta = {};
  v.forEach((x) => {
    conta[x] = (conta[x] || 0) + 1;
  });
  return Object.entries(conta).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
};

function nomeBonito(texto) {
  return String(texto)
    .toLowerCase()
    .replace(/(^|\s)(\p{L})/gu, (_, antes, letra) => antes + letra.toUpperCase());
}

// Um por mês (o maior), em ordem
function umPorMes(itens) {
  const porMes = {};
  itens.forEach((l) => {
    const m = l.data.slice(0, 7);
    if (!porMes[m] || Math.abs(l.valor) > Math.abs(porMes[m].valor)) porMes[m] = l;
  });
  return Object.values(porMes).sort((a, b) => a.data.localeCompare(b.data));
}

// Confere se o grupo parece fixo: dia do mês parecido, valor parecido e ainda acontecendo
function avaliar(itens, { minimoMeses, folgaDias, folgaValor, hoje }) {
  const meses = umPorMes(itens);
  if (meses.length < minimoMeses) return null;
  const dias = meses.map((l) => Number(l.data.slice(8)));
  const dia = Math.round(mediana(dias));
  if (!dias.every((d) => distanciaDeDia(d, dia) <= folgaDias)) return null;
  const valores = meses.map((l) => Math.abs(l.valor));
  const valor = mediana(valores);
  if (!valores.every((v) => Math.abs(v - valor) <= valor * folgaValor)) return null;
  // Ainda acontecendo: a última vez foi há no máximo uns 2 meses
  const ultimo = meses.at(-1);
  const [ah, mh] = hoje.slice(0, 7).split('-').map(Number);
  const [au, mu] = ultimo.data.slice(0, 7).split('-').map(Number);
  if ((ah - au) * 12 + (mh - mu) > 2) return null;
  return { meses, dia, valor, ultimo };
}

// Sugestões de fixos a partir da lista de lançamentos
export function acharRecorrentes(lista, hoje = new Date().toISOString().slice(0, 10)) {
  // Só o que ainda não é fixo nem parcelado (e nem transferência ou resumo)
  const candidatos = lista.filter(
    (l) => !l.transferencia && !l.resumo && !l.repete && !l.previsto && !l.origem && !l.grupo && !l.parcela && !l.saldoInicialDaConta && Math.abs(l.valor) >= 1
  );
  // Provedores que já têm um fixo (não sugere de novo)
  const jaFixos = new Set(lista.filter((l) => l.repete || l.origem).map((l) => `${l.valor > 0 ? '+' : '-'}${provedorDe(l.descricao)}`));

  const sugestoes = [];
  const usados = new Set();

  // 1) Mesmo provedor
  const grupos = {};
  candidatos.forEach((l) => {
    const p = provedorDe(l.descricao);
    if (!p) return;
    const k = `${l.valor > 0 ? '+' : '-'}${p}`;
    (grupos[k] ||= []).push(l);
  });
  Object.entries(grupos).forEach(([k, itens]) => {
    if (jaFixos.has(k)) return;
    const ganho = k.startsWith('+');
    const r = avaliar(itens, { minimoMeses: ganho ? 2 : 3, folgaDias: 5, folgaValor: ganho ? 0.3 : 0.15, hoje });
    if (!r) return;
    r.meses.forEach((l) => usados.add(l.id));
    sugestoes.push(montar(k, ganho, r, 'provedor'));
  });

  // 2) Ganhos no mesmo dia (ou perto) e de valor parecido, mesmo com descrições diferentes
  const soltos = candidatos.filter((l) => l.valor >= 50 && !usados.has(l.id)).sort((a, b) => b.data.localeCompare(a.data));
  soltos.forEach((base) => {
    if (usados.has(base.id)) return;
    const dia = Number(base.data.slice(8));
    const parecidos = soltos.filter(
      (l) => !usados.has(l.id) && distanciaDeDia(Number(l.data.slice(8)), dia) <= 3 && Math.abs(l.valor - base.valor) <= base.valor * 0.1
    );
    const r = avaliar(parecidos, { minimoMeses: 3, folgaDias: 3, folgaValor: 0.1, hoje });
    if (!r) return;
    r.meses.forEach((l) => usados.add(l.id));
    sugestoes.push(montar(`+dia${r.dia}-${Math.round(r.valor)}`, true, r, 'data'));
  });

  return sugestoes.sort((a, b) => (a.tipo === b.tipo ? b.valor - a.valor : a.tipo === 'receita' ? -1 : 1));
}

function montar(chave, ganho, r, motivo) {
  const descricoes = r.meses.map((l) => l.descricao);
  const primeiro = r.meses[0].data;
  const ultimo = r.ultimo.data;
  return {
    chave,
    tipo: ganho ? 'receita' : 'despesa',
    nome: nomeBonito(maisComum(descricoes)),
    dia: r.dia,
    valor: Math.round(r.valor * 100) / 100,
    vezes: r.meses.length,
    periodo: `${MESES[Number(primeiro.slice(5, 7)) - 1]}/${primeiro.slice(2, 4)} a ${MESES[Number(ultimo.slice(5, 7)) - 1]}/${ultimo.slice(2, 4)}`,
    conta: maisComum(r.meses.map((l) => l.conta)),
    categoria: maisComum(r.meses.map((l) => l.categoria)),
    motivo, // 'provedor' (mesmo pagador/recebedor) ou 'data' (mesmo dia e valor parecido)
    ultimoId: r.ultimo.id,
    ids: r.meses.map((l) => l.id),
  };
}

// Marca como fixo (o mais recente de cada sugestão): passa a aparecer todo mês e no Checklist
export function marcarComoFixos(lista, sugestoes) {
  const ids = new Set(sugestoes.map((s) => s.ultimoId));
  return lista.map((l) => (ids.has(l.id) ? { ...l, repete: true } : l));
}
