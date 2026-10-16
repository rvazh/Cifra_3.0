// ===== Preferências da tela de Configurações =====
// Tudo fica salvo só neste aparelho (localStorage do navegador).
import { chave } from './armazenamento.js';

const CHAVE = () => chave('preferencias');
const CHAVE_SESSAO = 'cifra:valores'; // "mostrar" ou "esconder", só enquanto o navegador estiver aberto

export const PADRAO = {
  email: '',
  primeiroDiaDaSemana: 0, // 0 = domingo, 1 = segunda
  inicioDoMes: 1, // dia em que o mês financeiro começa (1 a 28)
  esconderValores: false, // esconder valores ao abrir a CIFRA
  avisarContas: true, // aviso no painel sobre contas a vencer
  diasDeAviso: 3, // com quantos dias de antecedência
  desde: '', // mês em que a pessoa começou a usar ("2026-10")
  resumoMensal: false, // avisar no dia em que o mês começa que o resumo do mês anterior está pronto
  whatsapp: '', // número para abrir o WhatsApp com o resumo (opcional)
  lembreteSemanal: true, // toda segunda: lembrar de importar o extrato (OFX ou CSV)
  avisoOrcamento: 80, // avisar quando o gasto da categoria chegar nesta % do orçamento
  tema: 'escuro', // 'escuro' (padrão da CIFRA) ou 'claro'
};

let guardadas = null; // lidas uma vez e guardadas aqui para não ler o armazenamento toda hora

export function carregarPreferencias() {
  if (guardadas) return guardadas;
  let salvo = {};
  try {
    salvo = JSON.parse(localStorage.getItem(CHAVE()) || '{}');
  } catch {
    /* sem acesso ao armazenamento */
  }
  guardadas = { ...PADRAO, ...salvo };
  if (!guardadas.desde) {
    const hoje = new Date();
    guardadas.desde = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
    salvarPreferencias(guardadas);
  }
  return guardadas;
}

export function salvarPreferencias(preferencias) {
  guardadas = { ...PADRAO, ...preferencias };
  try {
    localStorage.setItem(CHAVE(), JSON.stringify(guardadas));
  } catch {
    /* sem acesso ao armazenamento */
  }
}

export function inicioDoMes() {
  return carregarPreferencias().inicioDoMes || 1;
}

// ----- Esconder valores (••••) -----
// Decidido uma vez quando a tela abre (o botão do olho recarrega a tela)
let escondidos = null;

export function valoresEscondidos() {
  if (escondidos !== null) return escondidos;
  escondidos = carregarPreferencias().esconderValores;
  try {
    const sessao = sessionStorage.getItem(CHAVE_SESSAO);
    if (sessao) escondidos = sessao === 'esconder';
  } catch {
    /* sem acesso ao armazenamento */
  }
  return escondidos;
}

// Botão do olho: mostra ou esconde os valores e recarrega a tela
export function alternarValores() {
  try {
    sessionStorage.setItem(CHAVE_SESSAO, valoresEscondidos() ? 'mostrar' : 'esconder');
  } catch {
    /* sem acesso ao armazenamento */
  }
  window.location.reload();
}

// ----- Tema do painel: 'escuro' (padrão) ou 'claro' -----
export function aplicarTema(tema = carregarPreferencias().tema) {
  try {
    document.documentElement.dataset.tema = tema === 'claro' ? 'claro' : 'escuro';
  } catch {
    /* fora do navegador */
  }
}
