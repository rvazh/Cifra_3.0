// ===== Onde cada pessoa guarda as suas informações =====
// Cada pessoa que cria conta tem as suas próprias chaves no navegador:
//   cifra:u:<id da pessoa>:lancamentos, cifra:u:<id>:contas ...
// O acesso de teste (o primeiro login da CIFRA) continua usando as chaves antigas:
//   cifra:lancamentos, cifra:contas ...
// Assim ninguém vê os dados de outra pessoa, mesmo usando o mesmo navegador.

export const CHAVE_SESSAO = 'cifra:sessao';
const SESSAO_TESTE = 'ativa'; // valor da sessão do acesso de teste
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

// id de quem está logado com conta criada (ou null para o acesso de teste / ninguém)
export function usuarioAtualId() {
  const sessao = lerSessao();
  return sessao && sessao.startsWith(PREFIXO_PESSOA) ? sessao.slice(PREFIXO_PESSOA.length) : null;
}

export function temSessao() {
  const sessao = lerSessao();
  return sessao === SESSAO_TESTE || Boolean(usuarioAtualId());
}

// Abre a sessão: sem id = acesso de teste; com id = pessoa que criou conta
export function gravarSessao(id = null) {
  try {
    localStorage.setItem(CHAVE_SESSAO, id ? `${PREFIXO_PESSOA}${id}` : SESSAO_TESTE);
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
