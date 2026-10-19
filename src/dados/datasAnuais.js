// ===== Datas do ano no calendário =====
// Feriados, datas que mexem no bolso (13º, Imposto de Renda, Black Friday) e datas comemorativas.
// A pessoa escolhe quais aparecem; a escolha fica na chave "datas-anuais" (sobe para a nuvem como as outras).
import { chave } from './armazenamento.js';

const CHAVE = () => chave('datas-anuais');

export const GRUPOS = [
  { id: 'feriado', nome: 'Feriados nacionais', descricao: 'Dias de folga em todo o Brasil e pontos facultativos.' },
  { id: 'bolso', nome: 'Datas do bolso', descricao: 'Datas que mexem com o seu dinheiro.' },
  { id: 'comemorativa', nome: 'Datas comemorativas', descricao: 'Datas em que costuma ter gasto com presentes.' },
];

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

// Se cair no sábado ou domingo, vem para a sexta-feira antes (prazo de pagamento é antecipado)
function diaUtilAntes(mes, dia) {
  return (ano) => {
    const d = new Date(ano, mes - 1, dia);
    while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() - 1);
    return texto(d);
  };
}

// Último dia útil do mês
function ultimoDiaUtil(mes) {
  return (ano) => {
    const d = new Date(ano, mes, 0);
    while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() - 1);
    return texto(d);
  };
}

// ----- Lista de datas -----
// tipo: aparece no dia escolhido (ex.: "Feriado nacional"); folga: deixa o número do dia em vermelho
export const DATAS = [
  // Feriados nacionais
  { id: 'ano-novo', grupo: 'feriado', nome: 'Confraternização Universal', emoji: '🎆', tipo: 'Feriado nacional', folga: true, quando: fixa(1, 1) },
  { id: 'carnaval', grupo: 'feriado', nome: 'Carnaval', emoji: '🎭', tipo: 'Ponto facultativo', quando: aPartirDaPascoa(-47) },
  { id: 'sexta-santa', grupo: 'feriado', nome: 'Sexta-feira Santa', emoji: '✝️', tipo: 'Feriado nacional', folga: true, quando: aPartirDaPascoa(-2) },
  { id: 'tiradentes', grupo: 'feriado', nome: 'Tiradentes', emoji: '📜', tipo: 'Feriado nacional', folga: true, quando: fixa(4, 21) },
  { id: 'trabalho', grupo: 'feriado', nome: 'Dia do Trabalho', emoji: '🛠️', tipo: 'Feriado nacional', folga: true, quando: fixa(5, 1) },
  { id: 'corpus-christi', grupo: 'feriado', nome: 'Corpus Christi', emoji: '⛪', tipo: 'Ponto facultativo', quando: aPartirDaPascoa(60) },
  { id: 'independencia', grupo: 'feriado', nome: 'Independência do Brasil', emoji: '🇧🇷', tipo: 'Feriado nacional', folga: true, quando: fixa(9, 7) },
  { id: 'aparecida', grupo: 'feriado', nome: 'Nossa Senhora Aparecida', emoji: '🙏', tipo: 'Feriado nacional', folga: true, quando: fixa(10, 12) },
  { id: 'finados', grupo: 'feriado', nome: 'Finados', emoji: '🕯️', tipo: 'Feriado nacional', folga: true, quando: fixa(11, 2) },
  { id: 'republica', grupo: 'feriado', nome: 'Proclamação da República', emoji: '🏛️', tipo: 'Feriado nacional', folga: true, quando: fixa(11, 15) },
  { id: 'consciencia-negra', grupo: 'feriado', nome: 'Dia da Consciência Negra', emoji: '✊🏿', tipo: 'Feriado nacional', folga: true, quando: fixa(11, 20) },
  { id: 'natal', grupo: 'feriado', nome: 'Natal', emoji: '🎄', tipo: 'Feriado nacional', folga: true, quando: fixa(12, 25) },

  // Datas do bolso
  { id: 'consumidor', grupo: 'bolso', nome: 'Dia do Consumidor', emoji: '🏷️', tipo: 'Data do bolso', dica: 'Muitas lojas fazem promoções.', quando: fixa(3, 15) },
  { id: 'imposto-de-renda', grupo: 'bolso', nome: 'Fim do prazo do Imposto de Renda', emoji: '🧾', tipo: 'Data do bolso', dica: 'Costuma ser o último dia útil de maio. Confira a data oficial no site da Receita.', quando: ultimoDiaUtil(5) },
  { id: '13-primeira', grupo: 'bolso', nome: '13º salário: 1ª parcela', emoji: '💰', tipo: 'Data do bolso', dica: 'Prazo para a empresa pagar a 1ª parcela.', quando: diaUtilAntes(11, 30) },
  { id: 'black-friday', grupo: 'bolso', nome: 'Black Friday', emoji: '🛍️', tipo: 'Data do bolso', dica: 'Compare os preços antes: nem todo desconto é real.', quando: (ano) => { const q = enesimo(11, 4, 4)(ano); const [a, m, d] = q.split('-').map(Number); return texto(new Date(a, m - 1, d + 1)); } },
  { id: '13-segunda', grupo: 'bolso', nome: '13º salário: 2ª parcela', emoji: '💰', tipo: 'Data do bolso', dica: 'Prazo para a empresa pagar a 2ª parcela (com os descontos de INSS e IR).', quando: diaUtilAntes(12, 20) },

  // Datas comemorativas
  { id: 'pascoa', grupo: 'comemorativa', nome: 'Páscoa', emoji: '🐣', tipo: 'Data comemorativa', quando: aPartirDaPascoa(0) },
  { id: 'maes', grupo: 'comemorativa', nome: 'Dia das Mães', emoji: '💐', tipo: 'Data comemorativa', quando: enesimo(5, 0, 2) },
  { id: 'namorados', grupo: 'comemorativa', nome: 'Dia dos Namorados', emoji: '❤️', tipo: 'Data comemorativa', quando: fixa(6, 12) },
  { id: 'pais', grupo: 'comemorativa', nome: 'Dia dos Pais', emoji: '👔', tipo: 'Data comemorativa', quando: enesimo(8, 0, 2) },
  { id: 'criancas', grupo: 'comemorativa', nome: 'Dia das Crianças', emoji: '🧸', tipo: 'Data comemorativa', quando: fixa(10, 12) },
  { id: 'reveillon', grupo: 'comemorativa', nome: 'Véspera de Ano-Novo', emoji: '🥂', tipo: 'Data comemorativa', quando: fixa(12, 31) },
];

// Na primeira vez: feriados e datas do bolso ligados, comemorativas desligadas
const PADRAO = DATAS.filter((d) => d.grupo !== 'comemorativa').map((d) => d.id);

// Ids das datas que aparecem no calendário
export function carregarDatasEscolhidas() {
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE()));
    if (Array.isArray(salvo)) return salvo.filter((id) => DATAS.some((d) => d.id === id));
  } catch {
    /* sem acesso ou valor estragado: usa o padrão */
  }
  return PADRAO;
}

export function salvarDatasEscolhidas(ids) {
  try {
    localStorage.setItem(CHAVE(), JSON.stringify(ids));
  } catch {
    /* sem acesso ao armazenamento */
  }
}

// Datas escolhidas que caem no mês: { "2026-12-25": [{ id, nome, emoji, ... }] }
export function datasAnuaisDoMes(mes, escolhidas) {
  const ano = Number(mes.slice(0, 4));
  const porDia = {};
  DATAS.filter((d) => escolhidas.includes(d.id)).forEach((d) => {
    const data = d.quando(ano);
    if (data.startsWith(mes)) (porDia[data] = porDia[data] || []).push({ ...d, data });
  });
  return porDia;
}

// "2026-12-25" -> "25/dez"
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
export function diaCurto(data) {
  return `${Number(data.slice(8))}/${MESES[Number(data.slice(5, 7)) - 1]}`;
}
