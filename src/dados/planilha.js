// ===== Planilha de lançamentos (modelo da CIFRA, Organizze, Mobills ou outra) =====
// Lê um CSV (no Excel: Arquivo > Salvar como > CSV) e descobre as colunas pelos títulos:
// data, descrição, valor, categoria, conta, tipo (receita/despesa) e situação (pago/pendente).
// Os apps de finanças exportam com títulos parecidos com esses, então a mesma leitura serve para todos.
import { lerArquivoCSV, lerDataCSV, lerValorCSV } from './csv.js';
import { carregarCategorias } from './lancamentos.js';

export const COLUNAS = [
  { id: 'data', nome: 'Data', obrigatoria: true },
  { id: 'descricao', nome: 'Descrição' },
  { id: 'valor', nome: 'Valor', obrigatoria: true },
  { id: 'categoria', nome: 'Categoria' },
  { id: 'conta', nome: 'Conta' },
  { id: 'tipo', nome: 'Tipo (receita/despesa)' },
  { id: 'situacao', nome: 'Situação (pago/pendente)' },
];

// De onde a planilha costuma vir (só muda a dica; as colunas são achadas pelo título)
export const ORIGENS = [
  { id: 'cifra', nome: 'Modelo da CIFRA' },
  { id: 'organizze', nome: 'Organizze' },
  { id: 'mobills', nome: 'Mobills' },
  { id: 'outra', nome: 'Outra planilha' },
];

function limpo(texto) {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

export async function lerPlanilha(arquivo) {
  const csv = await lerArquivoCSV(arquivo);
  const nomes = csv.tabela.cabecalho.map(limpo);
  const acha = (regra, evitar) => nomes.findIndex((n) => regra.test(n) && !(evitar && evitar.test(n)));
  const mapa = {
    data: csv.mapa.data,
    descricao: csv.mapa.descricao,
    valor: csv.mapa.valor,
    categoria: acha(/categoria|category|subcategoria/),
    conta: acha(/^conta$|^conta |carteira|account|^banco/, /contabil/),
    tipo: acha(/^tipo|natureza|^receita\/despesa|entrada.*saida/),
    situacao: acha(/situa|status|^pago|efetivad|confirmad/),
  };
  // Débito e crédito em colunas separadas (alguns bancos): usa a de débito como valor e marca a inversão
  if (mapa.valor < 0 && csv.mapa.debito >= 0) mapa.valor = csv.mapa.debito;
  return { arquivo: arquivo.name, cabecalho: csv.tabela.cabecalho, linhas: csv.tabela.linhas, mapa };
}

const ehDespesa = (t) => /desp|said|debit|^d$|gasto|pagamento/.test(limpo(t));
const ehReceita = (t) => /rece|entr|credit|^c$|ganho|renda/.test(limpo(t));

// Transforma a planilha em lançamentos. semSinal = os gastos vieram sem o "-" (usa o tipo da categoria)
export function linhasDaPlanilha(planilha, mapa = planilha.mapa, { semSinal = false } = {}) {
  const tipoDaCategoria = new Map(carregarCategorias().map((c) => [limpo(c.nome), c.tipo]));
  const pegar = (l, col) => (col >= 0 ? (l[col] ?? '').trim() : '');
  return planilha.linhas
    .map((l, i) => {
      const data = lerDataCSV(pegar(l, mapa.data));
      let valor = lerValorCSV(pegar(l, mapa.valor));
      if (!data || valor === null || valor === 0) return null;
      const tipo = pegar(l, mapa.tipo);
      const categoria = pegar(l, mapa.categoria);
      if (tipo && ehDespesa(tipo)) valor = -Math.abs(valor);
      else if (tipo && ehReceita(tipo)) valor = Math.abs(valor);
      else if (semSinal) valor = tipoDaCategoria.get(limpo(categoria)) === 'receita' ? Math.abs(valor) : -Math.abs(valor);
      const situacao = limpo(pegar(l, mapa.situacao));
      return {
        linha: i + 1,
        data,
        descricao: pegar(l, mapa.descricao) || categoria || 'Importado da planilha',
        valor: Math.round(valor * 100) / 100,
        categoria,
        conta: pegar(l, mapa.conta),
        pago: !/pend|nao|aberto|previst|agendad|a pagar|a receber/.test(situacao),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.data.localeCompare(b.data));
}

// Todos os valores positivos e sem coluna de tipo: provavelmente os gastos vieram sem o "-"
export function pareceSemSinal(planilha, mapa = planilha.mapa) {
  if (mapa.tipo >= 0 || mapa.valor < 0) return false;
  const valores = planilha.linhas.map((l) => lerValorCSV(l[mapa.valor] ?? '')).filter((v) => v !== null);
  return valores.length > 2 && valores.every((v) => v > 0);
}

// Modelo para baixar (abre certinho no Excel: separado por ";" e com acentos)
export function modeloCSV() {
  const linhas = [
    'data;descricao;valor;categoria;conta;tipo',
    '05/07/2026;Salário;4500,00;Salário;Nubank;receita',
    '10/07/2026;Aluguel;1500,00;Moradia;Nubank;despesa',
    '12/07/2026;Mercado do mês;780,50;Alimentação;Cartão Nubank;despesa',
    '20/07/2026;Freela;600,00;Extra;Inter;receita',
  ];
  return `﻿${linhas.join('\r\n')}\r\n`;
}
