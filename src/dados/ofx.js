// ===== Importar extrato bancário (OFX) =====
// O OFX é o arquivo de extrato que os bancos deixam baixar (no app ou no internet banking).
// Ele traz, para cada movimentação: data, valor, um código único (FITID) e a descrição do banco.
// O OFX NÃO traz categoria. Por isso a categoria é adivinhada pela descrição:
//   1) primeiro olhamos se você já lançou algo com a mesma descrição (e usamos a categoria que você escolheu);
//   2) depois procuramos palavras conhecidas (IFOOD, UBER, NETFLIX, ENEL, DROGASIL...);
//   3) se nada bater, fica em "Outros" e você escolhe na tela de conferência.

import { carregarCategorias } from './lancamentos.js';

// ----- Ler o arquivo -----

// Bancos costumam salvar o OFX em "windows-1252" (acentos antigos). Lemos os bytes e escolhemos a codificação.
export async function lerArquivoOFX(arquivo) {
  const bytes = await arquivo.arrayBuffer();
  const comeco = new TextDecoder('ascii').decode(bytes.slice(0, 400));
  const utf8 = /CHARSET:\s*UTF-?8|encoding="utf-8"/i.test(comeco);
  let texto;
  try {
    texto = new TextDecoder(utf8 ? 'utf-8' : 'windows-1252').decode(bytes);
  } catch {
    texto = new TextDecoder('utf-8').decode(bytes);
  }
  return lerOFX(texto);
}

// Pega o valor de uma etiqueta: funciona no OFX antigo (<TAG>valor) e no novo, em XML (<TAG>valor</TAG>)
function campo(bloco, nome) {
  const achado = bloco.match(new RegExp(`<${nome}>([^<\\r\\n]*)`, 'i'));
  return achado ? achado[1].trim() : '';
}

// "20261005120000[-3:BRT]" -> "2026-10-05"
function lerData(texto) {
  const m = texto.match(/^(\d{4})(\d{2})(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : '';
}

// "-45.90" ou "-45,90" -> -45.9
function lerValor(texto) {
  let limpo = texto.replace(/\s/g, '');
  if (limpo.includes(',') && !limpo.includes('.')) limpo = limpo.replace(',', '.');
  else if (limpo.includes(',') && limpo.includes('.')) limpo = limpo.replace(/\./g, '').replace(',', '.');
  const n = parseFloat(limpo);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}

// Código do banco (COMPE) -> nome que a pessoa reconhece
const BANCOS = {
  '001': 'Banco do Brasil',
  '033': 'Santander',
  '041': 'Banrisul',
  '077': 'Inter',
  '104': 'Caixa',
  '197': 'Stone',
  '208': 'BTG',
  '212': 'Banco Original',
  '237': 'Bradesco',
  '260': 'Nubank',
  '290': 'PagBank',
  '323': 'Mercado Pago',
  '336': 'C6 Bank',
  '341': 'Itaú',
  '380': 'PicPay',
  '422': 'Safra',
  '655': 'Neon',
  '748': 'Sicredi',
  '756': 'Sicoob',
};

// Deixa a descrição do banco mais legível: "COMPRA CARTAO   IFOOD *REST" -> "Compra Cartao Ifood *Rest"
function descricaoLegivel(texto) {
  const limpo = texto.replace(/\s+/g, ' ').trim();
  if (!limpo) return 'Movimentação do extrato';
  if (limpo !== limpo.toUpperCase()) return limpo; // já vem com maiúsculas e minúsculas
  return limpo.toLowerCase().replace(/(^|[\s/*-])(\p{L})/gu, (_, antes, letra) => antes + letra.toUpperCase());
}

// Lê o texto do OFX e devolve as informações do extrato
export function lerOFX(texto) {
  if (!/<OFX>/i.test(texto) || !/<STMTTRN>/i.test(texto)) {
    throw new Error('Este arquivo não parece um extrato OFX (ou está sem movimentações).');
  }

  const cartao = /<CCSTMTRS>/i.test(texto); // extrato de cartão de crédito
  const codigoBanco = campo(texto, 'BANKID').replace(/\D/g, '').padStart(3, '0').slice(-3);
  const org = campo(texto, 'ORG');
  const banco = BANCOS[codigoBanco] || (org ? descricaoLegivel(org) : '');
  const contaId = campo(texto, 'ACCTID');

  // Saldo informado pelo banco (nem todo OFX tem)
  const blocoSaldo = (texto.match(/<LEDGERBAL>[\s\S]*?(<\/LEDGERBAL>|<AVAILBAL>|<\/STMTRS>|<\/CCSTMTRS>)/i) || [''])[0];
  const saldo = blocoSaldo ? lerValor(campo(blocoSaldo, 'BALAMT')) : null;
  const saldoData = blocoSaldo ? lerData(campo(blocoSaldo, 'DTASOF')) : '';

  const blocos = texto.match(/<STMTTRN>[\s\S]*?<\/STMTTRN>/gi) || [];
  const transacoes = blocos
    .map((bloco, i) => {
      const data = lerData(campo(bloco, 'DTPOSTED'));
      const valor = lerValor(campo(bloco, 'TRNAMT'));
      const memo = campo(bloco, 'MEMO');
      const nome = campo(bloco, 'NAME');
      // Alguns bancos põem o texto no MEMO, outros no NAME; quando vêm os dois e são diferentes, juntamos
      const original = memo && nome && !memo.includes(nome) && !nome.includes(memo) ? `${nome} ${memo}` : memo || nome;
      const fitid = campo(bloco, 'FITID') || `${data}|${valor}|${original}|${i}`;
      return {
        chave: `${codigoBanco}-${contaId}-${fitid}`, // identifica a movimentação para não importar duas vezes
        data,
        valor,
        original,
        descricao: descricaoLegivel(original),
      };
    })
    .filter((t) => t.data && t.valor !== null && t.valor !== 0)
    .sort((a, b) => a.data.localeCompare(b.data));

  if (!transacoes.length) throw new Error('Não encontrei movimentações com data e valor neste arquivo.');

  return {
    banco,
    cartao,
    contaId,
    saldo: cartao ? null : saldo, // no cartão, o "saldo" é a fatura: não serve para ajustar a conta
    saldoData,
    inicio: transacoes[0].data,
    fim: transacoes[transacoes.length - 1].data,
    transacoes,
  };
}

// ----- Descobrir a categoria -----

// Tira acentos, números e símbolos: "PAG*IFOOD 12/10 ref 8812" -> "PAG IFOOD REF"
function simplificar(texto) {
  return ` ${texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()} `;
}

// Palavras que aparecem nas descrições dos extratos. Os espaços nas pontas evitam pegar pedaço de outra palavra.
const PALAVRAS = [
  ['Alimentação', [' IFOOD', ' RAPPI', ' ZE DELIVERY', 'MERCADO', 'SUPERMERC', 'MERCEARIA', 'PADARIA', 'PANIFIC', 'RESTAURANTE', 'LANCHONETE', 'CARREFOUR', ' ASSAI', 'ATACADAO', 'PAO DE ACUCAR', 'HORTIFRUTI', 'ACOUGUE', 'BURGER', 'MCDONALD', ' MC DONALD', 'SUBWAY', 'PIZZA', ' CAFE ', 'CAFETERIA', 'SORVETE', 'DOCERIA', 'CHURRASC', 'FEIRA ', ' OXXO']],
  ['Transporte', [' UBER', 'CABIFY', ' POSTO', 'COMBUSTIV', ' SHELL', 'IPIRANGA', 'PETROBRAS', ' AUTO POSTO', 'ESTACIONA', 'ESTAPAR', 'PEDAGIO', 'SEM PARAR', 'CONECTCAR', ' VELOE', ' METRO ', 'BILHETE UNICO', 'ONIBUS', 'DETRAN', ' IPVA', 'LOCALIZA', ' MOVIDA', 'OFICINA', 'AUTOPECAS']],
  ['Moradia', ['ALUGUEL', 'CONDOMINIO', ' ENEL', ' CEMIG', ' COPEL', ' LIGHT ', ' CELESC', ' COELBA', ' CPFL', 'ENERGISA', 'EQUATORIAL', 'NEOENERGIA', ' SABESP', ' CEDAE', ' COPASA', ' SANEPAR', ' EMBASA', ' COMGAS', 'NATURGY', ' VIVO ', ' CLARO ', ' TIM ', ' OI ', ' NET ', 'INTERNET', ' IPTU', ' LUZ ', ' AGUA ', 'ENERGIA', ' GAS ']],
  ['Saúde', ['DROGASIL', 'DROGA RAIA', ' RAIA ', 'DROGARIA', 'FARMACIA', 'PAGUE MENOS', ' PANVEL', ' UNIMED', ' AMIL', 'HAPVIDA', 'SULAMERICA', 'BRADESCO SAUDE', 'LABORATORIO', 'CLINICA', 'HOSPITAL', 'ODONTO', 'DENTISTA', 'SMART FIT', 'SMARTFIT', 'ACADEMIA', 'BLUEFIT', 'TOTALPASS', 'GYMPASS', 'WELLHUB']],
  ['Lazer', ['NETFLIX', 'SPOTIFY', 'DISNEY', ' HBO', ' MAX ', 'PRIME VIDEO', 'AMAZON PRIME', 'GLOBOPLAY', 'YOUTUBE', 'DEEZER', 'STEAM', 'PLAYSTATION', ' XBOX', 'NINTENDO', 'CINEMA', 'CINEMARK', 'INGRESSO', 'SYMPLA', 'EVENTIM', ' BAR ', 'CERVEJ', ' SHOW ', 'PARQUE', 'TEATRO', 'APPLE COM BILL', 'GOOGLE PLAY']],
];

const PALAVRAS_RECEITA = [
  ['Salário', ['SALARIO', ' FOLHA', 'PROVENTO', 'VENCIMENTO', 'PAGTO SAL', 'PAG SAL', 'REMUNERACAO']],
  ['Extra', ['PIX RECEBIDO', 'PIX RECEB', 'TED RECEBIDA', 'TED RECEB', 'DOC RECEB', 'TRANSF RECEB', 'TRANSFERENCIA RECEBIDA', 'RENDIMENTO', 'REEMBOLSO', 'ESTORNO', 'CASHBACK', 'DEVOLUCAO', 'RESGATE']],
];

// A categoria existe para o usuário e combina com o tipo (gasto ou ganho)?
function categoriaValida(nome, valor, categorias) {
  const c = categorias.find((item) => item.nome === nome);
  if (!c) return null;
  if (c.tipo === 'ambos' || !c.tipo) return c.nome;
  return (valor >= 0 ? c.tipo === 'receita' : c.tipo === 'despesa') ? c.nome : null;
}

// Monta o "dicionário" do que você já lançou: descrição simplificada -> categoria escolhida por você
export function aprenderDoHistorico(lancamentos) {
  const mapa = new Map();
  [...lancamentos]
    .sort((a, b) => a.data.localeCompare(b.data)) // o mais recente vence
    .forEach((l) => {
      if (l.categoria && l.categoria !== 'Outros') mapa.set(`${l.valor >= 0 ? '+' : '-'}${simplificar(l.descricao)}`, l.categoria);
    });
  return mapa;
}

// Sugere a categoria de uma movimentação.
// Devolve { categoria, como }: como = 'historico' | 'palavra' | 'nome' | null (não identificada)
export function sugerirCategoria(descricao, valor, historico, categorias = carregarCategorias()) {
  const texto = simplificar(descricao);

  // 1) Você já lançou algo com essa descrição
  const daMemoria = historico.get(`${valor >= 0 ? '+' : '-'}${texto}`);
  const valida = daMemoria && categoriaValida(daMemoria, valor, categorias);
  if (valida) return { categoria: valida, como: 'historico' };

  // 2) O nome de uma categoria sua aparece na descrição (ex.: categoria "Pet" e "PET SHOP")
  for (const c of categorias) {
    if (c.nome === 'Outros') continue;
    if (texto.includes(simplificar(c.nome)) && categoriaValida(c.nome, valor, categorias)) {
      return { categoria: c.nome, como: 'nome' };
    }
  }

  // 3) Palavras conhecidas (o "99" do app de corrida some ao tirar os números, então é conferido à parte)
  if (valor < 0 && /\b99\s?(APP|POP|TAXI|MOTO)\b/i.test(descricao)) {
    const ok = categoriaValida('Transporte', valor, categorias);
    if (ok) return { categoria: ok, como: 'palavra' };
  }
  const regras = valor >= 0 ? PALAVRAS_RECEITA : PALAVRAS;
  for (const [nome, palavras] of regras) {
    if (palavras.some((p) => texto.includes(p))) {
      const ok = categoriaValida(nome, valor, categorias);
      if (ok) return { categoria: ok, como: 'palavra' };
    }
  }

  return { categoria: 'Outros', como: null };
}
