// ===== Resumo do mês (Relatórios) e envio pelo WhatsApp =====
// O resumo usa o "mês financeiro": se nas Configurações o seu mês começa no dia 5,
// o resumo de setembro vai de 5/set a 4/out e fica pronto no dia 5/out.
import { chave } from './armazenamento.js';

import { carregar, semTransferencias, mesFinanceiro, mudarMes, dataDeHoje, nomeDoMes } from './lancamentos.js';
import { carregarPreferencias, inicioDoMes } from './preferencias.js';

const CHAVE_AVISADOS = () => chave('resumos'); // meses cujo resumo já foi avisado

function reais(valor) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function porcento(valor) {
  return `${valor.toFixed(0)}%`;
}

// O último mês que já fechou (é o que o resumo mostra primeiro)
export function mesParaResumir() {
  return mudarMes(mesFinanceiro(dataDeHoje()), -1);
}

// Números de um mês
export function resumoDoMes(lista, mes, inicio = inicioDoMes()) {
  const itens = semTransferencias(lista).filter((l) => mesFinanceiro(l.data, inicio) === mes);
  const anteriores = semTransferencias(lista).filter((l) => mesFinanceiro(l.data, inicio) === mudarMes(mes, -1));
  const receitas = itens.filter((l) => l.valor > 0).reduce((s, l) => s + l.valor, 0);
  const despesas = itens.filter((l) => l.valor < 0).reduce((s, l) => s - l.valor, 0);
  const despesasAntes = anteriores.filter((l) => l.valor < 0).reduce((s, l) => s - l.valor, 0);

  const porCategoria = {};
  itens.filter((l) => l.valor < 0).forEach((l) => {
    porCategoria[l.categoria] = (porCategoria[l.categoria] || 0) - l.valor;
  });
  const [nomeCategoria, valorCategoria] = Object.entries(porCategoria).sort((a, b) => b[1] - a[1])[0] || [];
  const maiorGasto = itens.filter((l) => l.valor < 0).sort((a, b) => a.valor - b.valor)[0] || null;

  return {
    mes,
    quantidade: itens.length,
    receitas,
    despesas,
    sobra: receitas - despesas,
    economia: receitas > 0 ? ((receitas - despesas) / receitas) * 100 : null,
    variacao: despesasAntes > 0 ? ((despesas - despesasAntes) / despesasAntes) * 100 : null,
    maiorCategoria: nomeCategoria ? { nome: nomeCategoria, valor: valorCategoria, parte: despesas > 0 ? (valorCategoria / despesas) * 100 : 0 } : null,
    maiorGasto: maiorGasto ? { descricao: maiorGasto.descricao, valor: -maiorGasto.valor } : null,
  };
}

// Frases do resumo (aparecem na tela e vão para o WhatsApp)
export function frasesDoResumo(r) {
  const nome = nomeDoMes(r.mes).split(' ')[0].toLowerCase();
  if (!r.quantidade) return [`Nenhum lançamento em ${nome}.`];
  const frases = [`Em ${nome} entraram ${reais(r.receitas)} e saíram ${reais(r.despesas)}.`];
  if (r.sobra >= 0) {
    frases.push(`Sobraram ${reais(r.sobra)}${r.economia !== null ? ` (${porcento(r.economia)} do que entrou)` : ''}.`);
  } else {
    frases.push(`Os gastos passaram os ganhos em ${reais(-r.sobra)}.`);
  }
  if (r.maiorCategoria) {
    frases.push(`${r.maiorCategoria.nome} foi onde você mais gastou: ${reais(r.maiorCategoria.valor)} (${porcento(r.maiorCategoria.parte)} dos gastos).`);
  }
  if (r.variacao !== null && Math.abs(r.variacao) >= 1) {
    frases.push(`Você gastou ${porcento(Math.abs(r.variacao))} ${r.variacao > 0 ? 'a mais' : 'a menos'} que no mês anterior.`);
  }
  if (r.maiorGasto) frases.push(`Maior gasto: ${r.maiorGasto.descricao} (${reais(r.maiorGasto.valor)}).`);
  return frases;
}

// Texto pronto para o WhatsApp (*negrito* é como o WhatsApp entende)
export function textoParaWhatsApp(r) {
  const nome = nomeDoMes(r.mes);
  return [`*CIFRA · Resumo de ${nome}*`, '', ...frasesDoResumo(r).map((f) => `• ${f}`), '', '_Enviado pela CIFRA_'].join('\n');
}

// Link que abre o WhatsApp com a mensagem pronta (com o seu número, se estiver salvo)
export function linkDoWhatsApp(texto, numero = carregarPreferencias().whatsapp) {
  const digitos = String(numero || '').replace(/\D/g, '');
  const comPais = digitos && digitos.length <= 11 ? `55${digitos}` : digitos; // número brasileiro sem o 55
  return `https://wa.me/${comPais}?text=${encodeURIComponent(texto)}`;
}

// ----- Lembrete mensal -----
function lerAvisados() {
  try {
    return JSON.parse(localStorage.getItem(CHAVE_AVISADOS()) || '[]');
  } catch {
    return [];
  }
}

export function anotarResumoAvisado(mes) {
  try {
    localStorage.setItem(CHAVE_AVISADOS(), JSON.stringify([...lerAvisados(), mes].slice(-24)));
  } catch {
    /* sem acesso ao armazenamento */
  }
}

// Se o lembrete está ligado e o mês já virou, devolve o resumo que precisa ser avisado (uma vez por mês)
export function resumoParaAvisar() {
  const preferencias = carregarPreferencias();
  if (!preferencias.resumoMensal) return null;
  const mes = mesParaResumir(); // o mês financeiro vira no dia escolhido em "Meu mês começa no dia"
  if (lerAvisados().includes(mes)) return null;
  const r = resumoDoMes(carregar(), mes);
  if (!r.quantidade) return null; // nada para resumir
  return r;
}
