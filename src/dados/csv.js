// ===== Importar extrato em CSV (planilha) =====
// Cada banco monta o CSV de um jeito: separador (; ou ,), nome das colunas, formato da data e do valor.
// Aqui a CIFRA tenta descobrir tudo sozinha. Na tela de conferência dá para corrigir as colunas.

// ----- Ler o arquivo -----
export async function lerArquivoCSV(arquivo) {
  const bytes = await arquivo.arrayBuffer();
  let texto;
  try {
    texto = new TextDecoder('utf-8', { fatal: true }).decode(bytes); // a maioria vem em UTF-8
  } catch {
    texto = new TextDecoder('windows-1252').decode(bytes); // planilhas antigas do Excel
  }
  return lerCSV(texto.replace(/^﻿/, ''), arquivo.name);
}

// Descobre o separador olhando as primeiras linhas
function separadorDe(texto) {
  const linhas = texto.split(/\r?\n/).filter((l) => l.trim()).slice(0, 10);
  const candidatos = [';', ',', '\t', '|'];
  let melhor = ',';
  let maior = 0;
  candidatos.forEach((sep) => {
    const contagens = linhas.map((l) => l.split(sep).length - 1);
    const minimo = Math.min(...contagens.slice(-5));
    if (minimo > maior) {
      maior = minimo;
      melhor = sep;
    }
  });
  return melhor;
}

// Divide o texto em linhas e colunas, respeitando "aspas, com separador dentro"
function quebrar(texto, sep) {
  const linhas = [];
  let linha = [];
  let campo = '';
  let aspas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (aspas) {
      if (c === '"' && texto[i + 1] === '"') {
        campo += '"';
        i++;
      } else if (c === '"') aspas = false;
      else campo += c;
    } else if (c === '"') aspas = true;
    else if (c === sep) {
      linha.push(campo.trim());
      campo = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && texto[i + 1] === '\n') i++;
      linha.push(campo.trim());
      if (linha.some((v) => v !== '')) linhas.push(linha);
      linha = [];
      campo = '';
    } else campo += c;
  }
  linha.push(campo.trim());
  if (linha.some((v) => v !== '')) linhas.push(linha);
  return linhas;
}

// ----- Datas e valores -----
// Aceita 05/10/2026, 05/10/26, 2026-10-05, 05-10-2026, 05.10.2026 (e com hora depois)
export function lerDataCSV(texto) {
  const t = String(texto).trim();
  let m = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = t.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/);
  if (m) {
    const ano = m[3].length === 2 ? `20${m[3]}` : m[3];
    const mes = Number(m[2]);
    const dia = Number(m[1]);
    if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return '';
    return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
  }
  return '';
}

// Aceita "R$ -1.234,56", "-1234.56", "1,234.56", "(45,90)", "45,90 D", "45,90 C"
export function lerValorCSV(texto) {
  let t = String(texto).trim();
  if (!t) return null;
  let negativo = /^-|-$|^\(.*\)$|\sD$/i.test(t) || /^-\s*R\$/.test(t);
  if (/\sC$/i.test(t)) negativo = false;
  t = t.replace(/R\$|\s|[()]|[DC]$/gi, '').replace(/-/g, '');
  if (!/\d/.test(t)) return null;
  const ultimaVirgula = t.lastIndexOf(',');
  const ultimoPonto = t.lastIndexOf('.');
  if (ultimaVirgula > ultimoPonto) t = t.replace(/\./g, '').replace(',', '.'); // 1.234,56
  else t = t.replace(/,/g, ''); // 1,234.56 ou 1234.56
  const n = parseFloat(t);
  if (!Number.isFinite(n)) return null;
  return Math.round((negativo ? -n : n) * 100) / 100;
}

function limpo(texto) {
  return String(texto)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

// Banco pelo nome do arquivo (ex.: "Nubank_2026-10.csv")
const BANCOS_ARQUIVO = [
  [/nubank|^nu[_-]/i, 'Nubank'],
  [/inter/i, 'Inter'],
  [/itau|itaú/i, 'Itaú'],
  [/bradesco/i, 'Bradesco'],
  [/santander/i, 'Santander'],
  [/caixa/i, 'Caixa'],
  [/c6/i, 'C6 Bank'],
  [/picpay/i, 'PicPay'],
  [/mercado ?pago/i, 'Mercado Pago'],
  [/brasil|bb[_-]/i, 'Banco do Brasil'],
];

// ----- Descobrir as colunas -----
export function lerCSV(texto, nomeArquivo = '') {
  const sep = separadorDe(texto);
  const linhas = quebrar(texto, sep);
  if (linhas.length < 2) throw new Error('Este CSV está vazio ou tem só uma linha.');

  // A linha de títulos é a primeira que fala de data (alguns bancos põem informações antes)
  let cabecalhoNa = linhas.findIndex((l) => l.some((c) => /^(data|date|dt)\b/i.test(limpo(c))) && l.length >= 2);
  const temCabecalho = cabecalhoNa >= 0;
  if (!temCabecalho) cabecalhoNa = -1;
  const largura = Math.max(...linhas.map((l) => l.length));
  const cabecalho = temCabecalho
    ? Array.from({ length: largura }, (_, i) => linhas[cabecalhoNa][i] || `Coluna ${i + 1}`)
    : Array.from({ length: largura }, (_, i) => `Coluna ${i + 1}`);
  const dados = linhas.slice(cabecalhoNa + 1).filter((l) => l.length >= 2);
  if (!dados.length) throw new Error('Não encontrei linhas com movimentações neste CSV.');

  const nomes = cabecalho.map(limpo);
  const acha = (regra, evitar) => nomes.findIndex((n) => regra.test(n) && !(evitar && evitar.test(n)));

  // Pelo título da coluna
  let data = acha(/^(data|date|dt)/);
  // "Descrição" ganha de "Histórico"; quando vêm as duas, juntamos (ex.: "Pix enviado - Drogasil")
  let descricao = acha(/descri/, /^data|valor|amount/);
  const historico = acha(/historico|lancamento|title|titulo|estabelecimento|memo|detalhe|nome/, /^data|valor|amount|identificador$/);
  if (descricao < 0) descricao = historico;
  const complemento = historico >= 0 && historico !== descricao ? historico : -1;
  let valor = acha(/^(valor|amount|quantia|montante|value)|valor \(r\$\)|^r\$/, /saldo/);
  const debito = acha(/debito|saida/);
  const credito = acha(/credito|entrada/);
  const id = acha(/^(identificador|id|fitid|codigo|cod\.?)$/);

  // Sem títulos (ou títulos estranhos): olha o conteúdo das colunas
  const amostra = dados.slice(0, 20);
  const proporcao = (i, teste) => amostra.filter((l) => teste(l[i] ?? '')).length / amostra.length;
  if (data < 0) data = cabecalho.findIndex((_, i) => proporcao(i, (v) => lerDataCSV(v)) > 0.7);
  if (valor < 0 && (debito < 0 || credito < 0)) {
    valor = cabecalho.findIndex((_, i) => i !== data && proporcao(i, (v) => lerValorCSV(v) !== null && /\d/.test(v)) > 0.7 && !/saldo/.test(nomes[i]));
  }
  if (descricao < 0) {
    // a coluna com mais letras costuma ser a descrição
    let melhor = -1;
    let mais = 0;
    cabecalho.forEach((_, i) => {
      if ([data, valor, debito, credito, id].includes(i)) return;
      const letras = amostra.reduce((s, l) => s + ((l[i] || '').match(/\p{L}/gu) || []).length, 0);
      if (letras > mais) {
        mais = letras;
        melhor = i;
      }
    });
    descricao = melhor;
  }

  const mapa = {
    data,
    descricao,
    valor: debito >= 0 && credito >= 0 && valor < 0 ? -1 : valor,
    debito: debito >= 0 && credito >= 0 && valor < 0 ? debito : -1,
    credito: debito >= 0 && credito >= 0 && valor < 0 ? credito : -1,
    id,
    complemento,
  };

  // Fatura de cartão costuma trazer as compras como valores positivos
  const valores = mapa.valor >= 0 ? dados.map((l) => lerValorCSV(l[mapa.valor] ?? '')).filter((v) => v !== null) : [];
  const positivos = valores.filter((v) => v > 0).length;
  const cartao = /cart|fatura|credit|card/i.test(nomeArquivo) || (valores.length > 2 && positivos / valores.length > 0.75);

  const banco = (BANCOS_ARQUIVO.find(([regra]) => regra.test(nomeArquivo)) || [])[1] || '';

  return {
    tipo: 'csv',
    nomeArquivo,
    banco,
    cartao,
    tabela: { cabecalho, linhas: dados },
    mapa,
    inverter: cartao && mapa.valor >= 0, // compras positivas viram gasto
    proporcaoPositiva: valores.length ? positivos / valores.length : 0, // na fatura de cartão as compras costumam vir positivas
  };
}

// Deixa a descrição legível (igual ao OFX): tira espaços sobrando e o "TUDO MAIÚSCULO"
function descricaoLegivel(texto) {
  const t = String(texto).replace(/\s+/g, ' ').trim();
  if (!t) return 'Movimentação do extrato';
  if (t !== t.toUpperCase()) return t;
  return t.toLowerCase().replace(/(^|[\s/*-])(\p{L})/gu, (_, antes, letra) => antes + letra.toUpperCase());
}

// Monta o extrato (mesmo formato do OFX) a partir das colunas escolhidas
export function extratoDoCSV(csv, mapa = csv.mapa, inverter = csv.inverter) {
  const vistos = {};
  const transacoes = [];
  csv.tabela.linhas.forEach((l) => {
    const data = lerDataCSV(l[mapa.data] ?? '');
    let valor = null;
    if (mapa.valor >= 0) valor = lerValorCSV(l[mapa.valor] ?? '');
    else if (mapa.debito >= 0 || mapa.credito >= 0) {
      const d = mapa.debito >= 0 ? lerValorCSV(l[mapa.debito] ?? '') : null;
      const c = mapa.credito >= 0 ? lerValorCSV(l[mapa.credito] ?? '') : null;
      if (d) valor = -Math.abs(d);
      else if (c) valor = Math.abs(c);
    }
    if (!data || valor === null || valor === 0) return;
    if (inverter) valor = -valor;
    const partes = [mapa.complemento >= 0 ? l[mapa.complemento] : '', mapa.descricao >= 0 ? l[mapa.descricao] : ''];
    const original = partes.filter((p) => p && p.trim()).join(' - ');
    // Código para não importar duas vezes: o do banco, se houver; senão data + valor + descrição (+ quantas vezes repetiu)
    const base = mapa.id >= 0 && l[mapa.id] ? `id:${l[mapa.id]}` : `${data}|${valor}|${limpo(original).replace(/\s+/g, ' ')}`;
    vistos[base] = (vistos[base] || 0) + 1;
    transacoes.push({
      chave: `csv-${base}-${vistos[base]}`,
      data,
      valor,
      original,
      descricao: descricaoLegivel(original),
    });
  });
  transacoes.sort((a, b) => a.data.localeCompare(b.data));
  return {
    banco: csv.banco,
    cartao: csv.cartao,
    saldo: null, // CSV quase nunca traz o saldo final de um jeito confiável
    saldoData: '',
    inicio: transacoes[0]?.data || '',
    fim: transacoes[transacoes.length - 1]?.data || '',
    transacoes,
  };
}
