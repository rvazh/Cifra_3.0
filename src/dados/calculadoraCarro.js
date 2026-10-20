// ===== Calculadora: quanto um carro custa =====
// Recebe os números do formulário e devolve o custo por mês, por km e a renda mínima.
// Tudo fica guardado na chave "calculadora-carro" (sobe para a nuvem como as outras).
//
// Referências usadas nos valores sugeridos (veja o README):
//  - IPVA 2026 por estado: tabela de alíquotas para carros a gasolina/flex (numerando.com.br/ipva)
//  - Depreciação: em torno de 7% a 10% do valor do carro por ano
//  - Pneus: preço do jogo dividido pelo tempo (ou km) que ele dura
//  - Renda: o custo TOTAL do carro (parcela + IPVA, seguro, combustível, manutenção...) caber em
//    10% (conservador), 20% (equilibrado, o mais usado) ou 30% (arrojado) da renda líquida
import { chave } from './armazenamento.js';

const CHAVE = () => chave('calculadora-carro');

// Alíquota do IPVA 2026 para carros a gasolina/flex (%). Elétricos e híbridos têm regras próprias.
export const IPVA_POR_ESTADO = {
  AC: 2, AL: 2.75, AP: 3, AM: 1.5, BA: 2.5, CE: 2.5, DF: 3, ES: 2, GO: 3, MA: 2.5, MT: 2, MS: 3, MG: 4, PA: 2.5,
  PB: 2.5, PR: 1.9, PE: 2.4, PI: 2.5, RJ: 4, RN: 3, RS: 3, RO: 2, RR: 3, SC: 2, SP: 4, SE: 2.5, TO: 2.5,
};

export const PERFIS_DE_RENDA = [
  { id: 'conservador', nome: 'Conservador', parte: 0.1, dica: 'Para quem ainda está montando a reserva de emergência.' },
  { id: 'equilibrado', nome: 'Equilibrado', parte: 0.2, dica: 'A regra mais usada: todos os custos do carro em até 20% da renda.' },
  { id: 'arrojado', nome: 'Arrojado', parte: 0.3, dica: 'Só para rendas maiores e sem outras dívidas.' },
];

// Exemplo para a tela já abrir com uma conta pronta (a pessoa troca pelos números dela)
export const EXEMPLO = {
  valorCarro: 80000,
  estado: 'SP',
  ipva: 4,
  kmPorMes: 1000,
  consumo: 12, // km por litro
  precoLitro: 6.3,
  seguroAno: 3500,
  licenciamentoAno: 160,
  manutencaoAno: 2000,
  precoPneus: 2400, // jogo com 4 pneus
  duracaoPneusKm: 40000,
  parcela: 0, // financiamento (por mês)
  outrosMes: 150, // estacionamento, pedágio, lavagem
  depreciacao: 10, // % do valor por ano
  contarDepreciacao: true,
  rendimento: 10, // % ao ano que o dinheiro renderia aplicado
  contarRendimento: false,
};

export function carregarCarro() {
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE()));
    if (salvo && typeof salvo === 'object') return { ...EXEMPLO, ...salvo };
  } catch {
    /* sem acesso ou valor estragado */
  }
  return { ...EXEMPLO };
}

export function salvarCarro(dados) {
  try {
    localStorage.setItem(CHAVE(), JSON.stringify(dados));
  } catch {
    /* sem acesso ao armazenamento */
  }
}

const n = (v) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : 0);

// Faz a conta. Devolve os itens do custo (por mês), os totais, o custo por km e a renda mínima.
export function calcularCarro(d) {
  const km = n(d.kmPorMes);
  const valor = n(d.valorCarro);

  // ----- Gastos que dependem de rodar (variáveis) -----
  const combustivel = n(d.consumo) ? (km / n(d.consumo)) * n(d.precoLitro) : 0;
  const pneus = n(d.duracaoPneusKm) ? (km / n(d.duracaoPneusKm)) * n(d.precoPneus) : 0;
  const manutencao = n(d.manutencaoAno) / 12;

  // ----- Gastos fixos (rodando ou não) -----
  const ipva = (valor * n(d.ipva)) / 100 / 12;
  const seguro = n(d.seguroAno) / 12;
  const licenciamento = n(d.licenciamentoAno) / 12;
  const parcela = n(d.parcela);
  const outros = n(d.outrosMes);

  // ----- Custos escondidos (não saem do bolso todo mês, mas existem) -----
  const depreciacao = d.contarDepreciacao ? (valor * n(d.depreciacao)) / 100 / 12 : 0;
  const rendimento = d.contarRendimento ? (valor * n(d.rendimento)) / 100 / 12 : 0;

  const itens = [
    { id: 'combustivel', nome: 'Combustível', valor: combustivel, tipo: 'rodar', dica: `${km.toLocaleString('pt-BR')} km ÷ ${n(d.consumo) || 0} km/l × preço do litro` },
    { id: 'parcela', nome: 'Parcela do financiamento', valor: parcela, tipo: 'fixo' },
    { id: 'seguro', nome: 'Seguro', valor: seguro, tipo: 'fixo', dica: 'Valor do ano ÷ 12' },
    { id: 'ipva', nome: 'IPVA', valor: ipva, tipo: 'fixo', dica: `${String(n(d.ipva)).replace('.', ',')}% do valor do carro ÷ 12` },
    { id: 'manutencao', nome: 'Revisões e manutenção', valor: manutencao, tipo: 'rodar', dica: 'Valor do ano ÷ 12' },
    { id: 'pneus', nome: 'Pneus', valor: pneus, tipo: 'rodar', dica: 'Preço do jogo ÷ km que ele dura × km do mês' },
    { id: 'licenciamento', nome: 'Licenciamento', valor: licenciamento, tipo: 'fixo', dica: 'Taxa do ano ÷ 12' },
    { id: 'outros', nome: 'Estacionamento, pedágio e lavagem', valor: outros, tipo: 'fixo' },
    { id: 'depreciacao', nome: 'Desvalorização do carro', valor: depreciacao, tipo: 'escondido', dica: `${String(n(d.depreciacao)).replace('.', ',')}% do valor por ano ÷ 12` },
    { id: 'rendimento', nome: 'Rendimento que o dinheiro teria', valor: rendimento, tipo: 'escondido', dica: `${String(n(d.rendimento)).replace('.', ',')}% ao ano sobre o valor do carro ÷ 12` },
  ].filter((i) => i.valor > 0);

  const soma = (tipo) => itens.filter((i) => !tipo || tipo.includes(i.tipo)).reduce((s, i) => s + i.valor, 0);
  const doBolso = soma(['rodar', 'fixo']); // o que sai da conta todo mês
  const total = soma(); // custo real, com desvalorização e rendimento perdido
  const rodar = soma(['rodar']);

  return {
    itens: itens.sort((a, b) => b.valor - a.valor),
    doBolso,
    total,
    porAno: total * 12,
    porDia: total / 30,
    porKmRodar: km ? rodar / km : 0, // só o que gasta para andar (combustível, pneus, manutenção)
    porKmTotal: km ? total / km : 0, // tudo dividido pelos km do mês
    rendaMinima: PERFIS_DE_RENDA.map((p) => ({ ...p, renda: doBolso / p.parte })),
  };
}
