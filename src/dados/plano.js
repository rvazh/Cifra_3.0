// ===== Plano da pessoa e teste grátis =====
// O teste grátis libera o Plano Essencial por 14 dias.
// Quando acaba: se a pessoa assinou um plano, fica com ele; se não, volta para o Plano Gratuito.
// (Sem servidor, isso fica guardado só neste navegador.)
import { chave } from './armazenamento.js';

import { dataDeHoje, diasAte, dataPorExtenso } from './lancamentos.js';

const CHAVE = () => chave('plano');
export const DIAS_DE_TESTE = 14;
export const PLANO_DO_TESTE = 'Plano Essencial';

function ler() {
  try {
    return JSON.parse(localStorage.getItem(CHAVE())) || {};
  } catch {
    return {};
  }
}

function gravar(dados) {
  try {
    localStorage.setItem(CHAVE(), JSON.stringify(dados));
  } catch {
    /* sem acesso ao armazenamento */
  }
}

// "2026-10-10" + 14 -> "2026-10-24"
function somarDias(data, dias) {
  const [ano, mes, dia] = data.split('-').map(Number);
  const d = new Date(ano, mes - 1, dia + dias);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Começa o teste (cada pessoa só tem um teste; chamar de novo não reinicia)
export function iniciarTeste() {
  const atual = ler();
  if (atual.testeInicio) return false;
  gravar({ ...atual, testeInicio: dataDeHoje() });
  return true;
}

// Para quando existir pagamento: guarda o plano assinado
export function assinarPlano(nome) {
  gravar({ ...ler(), assinado: nome });
}

export function jaUsouOTeste() {
  return Boolean(ler().testeInicio);
}

// Situação atual do plano, pronta para mostrar na tela
export function situacaoDoPlano() {
  const { testeInicio, assinado } = ler();
  const fim = testeInicio ? somarDias(testeInicio, DIAS_DE_TESTE) : null;
  const restantes = fim ? diasAte(fim) : 0;
  const emTeste = Boolean(testeInicio) && restantes > 0;

  return {
    // Durante o teste vale o Essencial; depois vale o assinado ou o Gratuito
    nome: emTeste ? PLANO_DO_TESTE : assinado || 'Plano Gratuito',
    emTeste,
    assinado: assinado || null,
    diasRestantes: emTeste ? restantes : 0,
    diasUsados: emTeste ? DIAS_DE_TESTE - restantes : 0,
    testeTerminou: Boolean(testeInicio) && !emTeste,
    fimDoTeste: fim,
    fimPorExtenso: fim ? dataPorExtenso(fim) : '',
  };
}
