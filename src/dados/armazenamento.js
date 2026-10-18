// ===== Onde cada pessoa guarda as suas informações =====
// Cada pessoa logada tem as suas próprias chaves no navegador:
//   cifra:u:<id da pessoa no Supabase>:lancamentos, cifra:u:<id>:contas ...
// Essas chaves são uma cópia local: o arquivo nuvem.js envia cada mudança para o Supabase
// e baixa tudo de volta ao abrir o site (assim funciona em vários aparelhos).
// As chaves antigas sem id (cifra:lancamentos...) eram do antigo acesso de teste; só são lidas
// uma vez, para levar esses dados para uma conta de verdade.

export const CHAVE_SESSAO = 'cifra:sessao';
const PREFIXO_PESSOA = 'u:'; // valor da sessão de quem criou conta: "u:<id>"

// Chaves que são do navegador inteiro, não de uma pessoa
const CHAVES_GERAIS = ['cifra:sessao', 'cifra:usuarios'];

function lerSessao() {
  try {
    return localStorage.getItem(CHAVE_SESSAO);
  } catch {
    return null;
  }
}

// id de quem está logado (ou null se ninguém)
export function usuarioAtualId() {
  const sessao = lerSessao();
  return sessao && sessao.startsWith(PREFIXO_PESSOA) ? sessao.slice(PREFIXO_PESSOA.length) : null;
}

export function temSessao() {
  return Boolean(usuarioAtualId());
}

// Abre a sessão da pessoa (o login de verdade é feito pelo Supabase, em nuvem.js)
export function gravarSessao(id) {
  if (!id) return;
  try {
    localStorage.setItem(CHAVE_SESSAO, `${PREFIXO_PESSOA}${id}`);
  } catch {
    /* sem acesso ao armazenamento */
  }
}

export function apagarSessao() {
  try {
    localStorage.removeItem(CHAVE_SESSAO);
  } catch {
    /* sem acesso ao armazenamento */
  }
}

// Nome completo da chave para a pessoa logada. Ex.: chave('contas')
export function chave(nome, id = usuarioAtualId()) {
  return id ? `cifra:${PREFIXO_PESSOA}${id}:${nome}` : `cifra:${nome}`;
}

// Todas as chaves da pessoa logada (usado no backup e em "Apagar tudo")
export function chavesDoUsuario() {
  let todas = [];
  try {
    todas = Object.keys(localStorage);
  } catch {
    return [];
  }
  const id = usuarioAtualId();
  if (id) return todas.filter((k) => k.startsWith(`cifra:${PREFIXO_PESSOA}${id}:`));
  return todas.filter((k) => k.startsWith('cifra:') && !k.startsWith(`cifra:${PREFIXO_PESSOA}`) && !CHAVES_GERAIS.includes(k));
}

// "cifra:u:abc:contas" -> "contas"   |   "cifra:contas" -> "contas"
export function nomeDaChave(chaveCompleta) {
  const id = usuarioAtualId();
  const prefixo = id ? `cifra:${PREFIXO_PESSOA}${id}:` : 'cifra:';
  return chaveCompleta.startsWith(prefixo) ? chaveCompleta.slice(prefixo.length) : null;
}

// Para separar os comprovantes (IndexedDB) de cada pessoa
export function donoAtual() {
  return usuarioAtualId() || 'principal';
}
