// ===== Datas do ano no calendário =====
// Feriados, datas sazonais (meses com gasto a mais), datas do bolso (13º, Imposto de Renda)
// e as datas especiais que a própria pessoa marca clicando num dia do calendário.
//
// Onde fica guardado (tudo sobe para a nuvem como as outras chaves):
//   "datas-anuais-off" -> ids das datas prontas que a pessoa desligou
//   "datas-pessoais"   -> datas especiais criadas pela pessoa
// Ligar/desligar todas as sazonais de uma vez: Configurações > Preferências > Datas sazonais.
import { chave } from './armazenamento.js';

const CHAVE_DESLIGADAS = () => chave('datas-anuais-off');
const CHAVE_ANTIGA = () => chave('datas-anuais'); // versão anterior: guardava as ligadas
const CHAVE_PESSOAIS = () => chave('datas-pessoais');

export const GRUPOS = [
  { id: 'feriado', nome: 'Feriados nacionais', descricao: 'Dias de folga em todo o Brasil e pontos facultativos.' },
  {
    id: 'sazonal',
    nome: 'Datas sazonais',
    descricao: 'Épocas em que o gasto costuma ser maior: o dia fica colorido e o mês ganha um aviso.',
  },
  { id: 'bolso', nome: 'Datas do bolso', descricao: 'Prazos que mexem com o seu dinheiro.' },
];

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const MESES_LONGOS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

// ----- Ajudantes de data -----
function texto(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function fixa(mes, dia) {
  return (ano) => texto(new Date(ano, mes - 1, dia));
}

// Domingo de Páscoa (cálculo de Meeus/Jones/Butcher)
function pascoa(ano) {
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(ano, mes - 1, dia);
}

function aPartirDaPascoa(dias) {
  return (ano) => {
    const p = pascoa(ano);
    return texto(new Date(ano, p.getMonth(), p.getDate() + dias));
  };
}

// N-ésimo dia da semana do mês (ex.: 2º domingo de maio)
function enesimo(mes, diaDaSemana, n) {
  return (ano) => {
    const primeiro = new Date(ano, mes - 1, 1).getDay();
    const dia = 1 + ((diaDaSemana - primeiro + 7) % 7) + (n - 1) * 7;
    return texto(new Date(ano, mes - 1, dia));
  };
}

// Black Friday: sexta-feira depois da 4ª quinta-feira de novembro. Cyber Monday: a segunda seguinte.
function depoisDaBlackFriday(dias) {
  return (ano) => {
    const [a, m, d] = enesimo(11, 4, 4)(ano).split('-').map(Number);
    return texto(new Date(a, m - 1, d + 1 + dias));
  };
}

// Se cair no sábado ou domingo, vem para a sexta-feira antes (prazo de pagamento é antecipado)
function diaUtilAntes(mes, dia) {
  return (ano) => {
    const d = new Date(ano, mes - 1, dia);
    while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() - 1);
    return texto(d);
  };
}

function ultimoDiaUtil(mes) {
  return (ano) => {
    const d = new Date(ano, mes, 0);
    while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() - 1);
    return texto(d);
  };
}

// ----- Lista de datas prontas -----
// quando(ano) -> dia exato; mes -> vale para o mês todo (só aparece no aviso do mês)
// gasto: o que costuma pesar no bolso (deixa o dia colorido e entra no aviso do mês)
// folga: feriado de verdade (número do dia em vermelho)
// Fontes das datas do varejo e das contas de começo de ano: calendários do varejo 2026 e guias de
// planejamento financeiro (veja o README).
export const DATAS = [
  // Feriados nacionais
  { id: 'ano-novo', grupo: 'feriado', nome: 'Confraternização Universal', emoji: '🎆', tipo: 'Feriado nacional', folga: true, quando: fixa(1, 1) },
  { id: 'carnaval', grupo: 'feriado', nome: 'Carnaval', emoji: '🎭', tipo: 'Ponto facultativo', gasto: 'Viagens, festas e fantasias.', quando: aPartirDaPascoa(-47) },
  { id: 'sexta-santa', grupo: 'feriado', nome: 'Sexta-feira Santa', emoji: '✝️', tipo: 'Feriado nacional', folga: true, quando: aPartirDaPascoa(-2) },
  { id: 'tiradentes', grupo: 'feriado', nome: 'Tiradentes', emoji: '📜', tipo: 'Feriado nacional', folga: true, quando: fixa(4, 21) },
  { id: 'trabalho', grupo: 'feriado', nome: 'Dia do Trabalho', emoji: '🛠️', tipo: 'Feriado nacional', folga: true, quando: fixa(5, 1) },
  { id: 'corpus-christi', grupo: 'feriado', nome: 'Corpus Christi', emoji: '⛪', tipo: 'Ponto facultativo', quando: aPartirDaPascoa(60) },
  { id: 'independencia', grupo: 'feriado', nome: 'Independência do Brasil', emoji: '🇧🇷', tipo: 'Feriado nacional', folga: true, quando: fixa(9, 7) },
  { id: 'aparecida', grupo: 'feriado', nome: 'Nossa Senhora Aparecida', emoji: '🙏', tipo: 'Feriado nacional', folga: true, quando: fixa(10, 12) },
  { id: 'finados', grupo: 'feriado', nome: 'Finados', emoji: '🕯️', tipo: 'Feriado nacional', folga: true, quando: fixa(11, 2) },
  { id: 'republica', grupo: 'feriado', nome: 'Proclamação da República', emoji: '🏛️', tipo: 'Feriado nacional', folga: true, quando: fixa(11, 15) },
  { id: 'consciencia-negra', grupo: 'feriado', nome: 'Dia da Consciência Negra', emoji: '✊🏿', tipo: 'Feriado nacional', folga: true, quando: fixa(11, 20) },
  { id: 'natal', grupo: 'feriado', nome: 'Natal', emoji: '🎄', tipo: 'Feriado nacional', folga: true, gasto: 'Presentes, ceia e viagens de fim de ano.', quando: fixa(12, 25) },

  // Datas sazonais (gasto a mais)
  { id: 'impostos-inicio', grupo: 'sazonal', nome: 'IPVA, IPTU e seguros', emoji: '🚗', tipo: 'Começo do ano', gasto: 'IPTU costuma vencer entre janeiro e fevereiro; a cota única do IPVA, no 1º trimestre. Seguros e reajustes de mensalidades também chegam agora.', mes: 1 },
  { id: 'material-escolar', grupo: 'sazonal', nome: 'Material escolar e matrícula', emoji: '🎒', tipo: 'Volta às aulas', gasto: 'Matrícula, uniforme, material e transporte escolar.', mes: 1 },
  { id: 'consumidor', grupo: 'sazonal', nome: 'Dia do Consumidor', emoji: '🏷️', tipo: 'Data sazonal', gasto: 'Semana de promoções: compre só o que já estava planejado.', quando: fixa(3, 15) },
  { id: 'pascoa', grupo: 'sazonal', nome: 'Páscoa', emoji: '🐣', tipo: 'Data sazonal', gasto: 'Ovos de chocolate e almoço em família.', quando: aPartirDaPascoa(0) },
  { id: 'maes', grupo: 'sazonal', nome: 'Dia das Mães', emoji: '💐', tipo: 'Data sazonal', gasto: 'Presentes e almoço fora.', quando: enesimo(5, 0, 2) },
  { id: 'namorados', grupo: 'sazonal', nome: 'Dia dos Namorados', emoji: '❤️', tipo: 'Data sazonal', gasto: 'Presentes, jantar e passeios.', quando: fixa(6, 12) },
  { id: 'sao-joao', grupo: 'sazonal', nome: 'São João (festas juninas)', emoji: '🌽', tipo: 'Data sazonal', gasto: 'Festas, comidas típicas e viagens para o Nordeste.', quando: fixa(6, 24) },
  { id: 'ferias-julho', grupo: 'sazonal', nome: 'Férias escolares de julho', emoji: '🏖️', tipo: 'Férias', gasto: 'Passeios, viagens e as crianças mais tempo em casa.', mes: 7 },
  { id: 'pais', grupo: 'sazonal', nome: 'Dia dos Pais', emoji: '👔', tipo: 'Data sazonal', gasto: 'Presentes e almoço fora.', quando: enesimo(8, 0, 2) },
  { id: 'criancas', grupo: 'sazonal', nome: 'Dia das Crianças', emoji: '🧸', tipo: 'Data sazonal', gasto: 'Brinquedos e passeios.', quando: fixa(10, 12) },
  { id: 'black-friday', grupo: 'sazonal', nome: 'Black Friday', emoji: '🛍️', tipo: 'Data sazonal', gasto: 'Compare os preços antes: nem todo desconto é real.', quando: depoisDaBlackFriday(0) },
  { id: 'cyber-monday', grupo: 'sazonal', nome: 'Cyber Monday', emoji: '💻', tipo: 'Data sazonal', gasto: 'Promoções de lojas on-line logo depois da Black Friday.', quando: depoisDaBlackFriday(3) },
  { id: 'reveillon', grupo: 'sazonal', nome: 'Véspera de Ano-Novo', emoji: '🥂', tipo: 'Data sazonal', gasto: 'Festa, roupa nova e viagem de fim de ano.', quando: fixa(12, 31) },

  // Datas do bolso
  { id: 'imposto-de-renda', grupo: 'bolso', nome: 'Fim do prazo do Imposto de Renda', emoji: '🧾', tipo: 'Data do bolso', dica: 'Costuma ser o último dia útil de maio. Confira a data oficial no site da Receita.', quando: ultimoDiaUtil(5) },
  { id: '13-primeira', grupo: 'bolso', nome: '13º salário: 1ª parcela', emoji: '💰', tipo: 'Data do bolso', dica: 'Prazo para a empresa pagar a 1ª parcela.', quando: diaUtilAntes(11, 30) },
  { id: '13-segunda', grupo: 'bolso', nome: '13º salário: 2ª parcela', emoji: '💰', tipo: 'Data do bolso', dica: 'Prazo para a empresa pagar a 2ª parcela (com os descontos de INSS e IR).', quando: diaUtilAntes(12, 20) },
];

// ----- Datas prontas desligadas pela pessoa -----
export function carregarDesligadas() {
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE_DESLIGADAS()));
    if (Array.isArray(salvo)) return salvo;
    // Versão anterior guardava as LIGADAS: converte uma vez, mantendo as escolhas de feriados e
    // datas do bolso (as sazonais são novas e começam ligadas)
    const antigas = JSON.parse(localStorage.getItem(CHAVE_ANTIGA()));
    if (Array.isArray(antigas)) {
      const desligadas = DATAS.filter((d) => d.grupo !== 'sazonal' && !antigas.includes(d.id)).map((d) => d.id);
      salvarDesligadas(desligadas);
      return desligadas;
    }
  } catch {
    /* sem acesso ou valor estragado: tudo ligado */
  }
  return [];
}

export function salvarDesligadas(ids) {
  try {
    localStorage.setItem(CHAVE_DESLIGADAS(), JSON.stringify(ids));
  } catch {
    /* sem acesso ao armazenamento */
  }
}

// ----- Datas especiais da pessoa -----
// { id, data: "2026-11-12", nome, emoji, anual: true, gasto: true, valor: 300 }
export const EMOJIS_PESSOAIS = ['🎂', '🎁', '💍', '✈️', '🎉', '🏥', '🚗', '📌'];

export function carregarPessoais() {
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE_PESSOAIS()));
    return Array.isArray(salvo) ? salvo : [];
  } catch {
    return [];
  }
}

export function salvarPessoais(lista) {
  try {
    localStorage.setItem(CHAVE_PESSOAIS(), JSON.stringify(lista));
  } catch {
    /* sem acesso ao armazenamento */
  }
}

// Em que dia a data especial cai no ano (as anuais repetem a partir do ano em que foram criadas)
function diaDaPessoal(p, ano) {
  if (!p.anual) return p.data.startsWith(String(ano)) ? p.data : null;
  if (ano < Number(p.data.slice(0, 4))) return null;
  const [, mes, dia] = p.data.split('-').map(Number);
  const d = new Date(ano, mes - 1, dia);
  return d.getMonth() === mes - 1 ? texto(d) : null; // 29/fev só nos anos bissextos
}

// ----- Tudo o que aparece num mês do calendário -----
// Devolve:
//   porDia:    { "2026-12-25": [item, ...] }  -> marcas nos dias
//   doMesTodo: [item]                          -> sazonais do mês inteiro (IPVA, férias...)
//   gastos:    [item]                          -> o que entra no aviso "gasto a mais" do mês
// item = { chave, id, nome, emoji, tipo, dica, gasto, valor, folga, sazonal, pessoal, data }
export function datasDoMes(mes, { desligadas = [], sazonais = true, pessoais = [] } = {}) {
  const ano = Number(mes.slice(0, 4));
  const numeroMes = Number(mes.slice(5, 7));
  const porDia = {};
  const doMesTodo = [];

  DATAS.filter((d) => !desligadas.includes(d.id) && (sazonais || d.grupo !== 'sazonal')).forEach((d) => {
    const sazonal = Boolean(sazonais && d.gasto);
    const item = {
      chave: d.id,
      id: d.id,
      nome: d.nome,
      emoji: d.emoji,
      tipo: d.tipo,
      dica: sazonal ? d.gasto : d.dica || '',
      gasto: sazonal ? d.gasto : '',
      folga: Boolean(d.folga),
      sazonal,
      pessoal: false,
    };
    if (d.mes) {
      if (d.mes === numeroMes) doMesTodo.push({ ...item, data: null });
      return;
    }
    const data = d.quando(ano);
    if (data.startsWith(mes)) (porDia[data] = porDia[data] || []).push({ ...item, data });
  });

  pessoais.forEach((p) => {
    const data = diaDaPessoal(p, ano);
    if (!data || !data.startsWith(mes)) return;
    (porDia[data] = porDia[data] || []).push({
      chave: `p-${p.id}`,
      id: p.id,
      nome: p.nome,
      emoji: p.emoji || '📌',
      tipo: p.anual ? 'Data especial · todo ano' : 'Data especial',
      dica: '',
      gasto: p.gasto ? 'Gasto a mais' : '',
      valor: p.gasto && p.valor > 0 ? p.valor : 0,
      folga: false,
      sazonal: Boolean(p.gasto),
      pessoal: true,
      data,
    });
  });

  const gastos = [
    ...doMesTodo.filter((i) => i.sazonal),
    ...Object.keys(porDia)
      .sort()
      .flatMap((data) => porDia[data].filter((i) => i.sazonal)),
  ];
  return { porDia, doMesTodo, gastos };
}

// "2026-12-25" -> "25/dez"
export function diaCurto(data) {
  return `${Number(data.slice(8))}/${MESES[Number(data.slice(5, 7)) - 1]}`;
}

// 1 -> "janeiro"
export function nomeDoMesLongo(numero) {
  return MESES_LONGOS[numero - 1];
}

// Texto curto de quando a data cai no ano (para a lista de escolha)
export function quandoNoAno(d, ano) {
  return d.mes ? `${MESES[d.mes - 1]} (o mês)` : diaCurto(d.quando(ano));
}
