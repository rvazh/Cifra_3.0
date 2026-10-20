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
  fundo: 'padrao', // fundo do painel: um dos FUNDOS abaixo ou 'foto'
  datasSazonais: true, // calendário: pinta os dias com gasto a mais (Dia das Mães, Black Friday...) e avisa no mês
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

// ----- Fundo do painel (Configurações > Preferências > Fundo) -----
const BASE = '#faf8f4';
export const FUNDOS = [
  { id: 'padrao', nome: 'Padrão', css: BASE },
  { id: 'creme', nome: 'Creme', css: '#fbf1dc' },
  { id: 'areia', nome: 'Areia', css: '#efe6d6' },
  { id: 'cinza', nome: 'Cinza', css: '#eeeeec' },
  { id: 'verde', nome: 'Verde', css: '#e8f2ea' },
  { id: 'azul', nome: 'Azul', css: '#e7eff7' },
  { id: 'rosa', nome: 'Rosa', css: '#f7e9ec' },
  { id: 'lavanda', nome: 'Lavanda', css: '#eeebf7' },
  { id: 'dourado', nome: 'Dourado', css: 'linear-gradient(160deg, #fdf8ee 0%, #f3e2bb 100%)' },
  { id: 'pontos', nome: 'Pontinhos', css: `radial-gradient(rgba(201, 162, 77, 0.45) 1.3px, transparent 1.5px) 0 0 / 18px 18px, ${BASE}` },
  {
    id: 'quadriculado',
    nome: 'Quadriculado',
    css: `linear-gradient(rgba(20, 20, 20, 0.06) 1px, transparent 1px) 0 0 / 24px 24px, linear-gradient(90deg, rgba(20, 20, 20, 0.06) 1px, transparent 1px) 0 0 / 24px 24px, ${BASE}`,
  },
];

const CHAVE_FOTO = () => chave('fundo-foto');
const VEU = 'linear-gradient(rgba(250, 248, 244, 0.55), rgba(250, 248, 244, 0.55))'; // clareia a foto para o texto continuar legível

export function fotoDeFundo() {
  try {
    return localStorage.getItem(CHAVE_FOTO()) || '';
  } catch {
    return '';
  }
}

// Desenha o fundo escolhido atrás das telas do painel (.pp-app, ver MenuLateral.css)
export function aplicarFundo(id = carregarPreferencias().fundo) {
  try {
    const raiz = document.documentElement;
    const foto = id === 'foto' ? fotoDeFundo() : '';
    const escolhido = FUNDOS.find((f) => f.id === id);
    const css = foto ? `${VEU}, url("${foto}") center / cover no-repeat` : escolhido && id !== 'padrao' ? escolhido.css : '';
    if (css) {
      raiz.style.setProperty('--fundo-app', css);
      raiz.dataset.fundo = id;
    } else {
      raiz.style.removeProperty('--fundo-app');
      delete raiz.dataset.fundo;
    }
  } catch {
    /* fora do navegador */
  }
}

// Reduz a foto (até 1600 px, JPEG) para ocupar pouco espaço e subir rápido para a nuvem
function lerImagem(arquivo) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(arquivo);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Não foi possível abrir essa imagem. Use uma foto JPG, PNG ou WEBP.'));
    };
    img.src = url;
  });
}

export async function guardarFotoDeFundo(arquivo) {
  if (!arquivo || !/^image\/(jpeg|png|webp|gif)$/.test(arquivo.type)) {
    throw new Error('Escolha uma foto JPG, PNG ou WEBP.');
  }
  if (arquivo.size > 15 * 1024 * 1024) throw new Error('A foto pode ter no máximo 15 MB.');
  const img = await lerImagem(arquivo);
  const escala = Math.min(1, 1600 / Math.max(img.width, img.height));
  const tela = document.createElement('canvas');
  tela.width = Math.round(img.width * escala);
  tela.height = Math.round(img.height * escala);
  tela.getContext('2d').drawImage(img, 0, 0, tela.width, tela.height);
  let qualidade = 0.82;
  let dados = tela.toDataURL('image/jpeg', qualidade);
  while (dados.length > 600 * 1024 && qualidade > 0.4) {
    qualidade -= 0.12;
    dados = tela.toDataURL('image/jpeg', qualidade);
  }
  try {
    localStorage.setItem(CHAVE_FOTO(), dados);
  } catch {
    throw new Error('Não foi possível guardar a foto neste aparelho (sem espaço).');
  }
  return dados;
}

export function apagarFotoDeFundo() {
  try {
    localStorage.removeItem(CHAVE_FOTO());
  } catch {
    /* sem acesso ao armazenamento */
  }
}
