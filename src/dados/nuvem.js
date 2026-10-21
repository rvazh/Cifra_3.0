// ===== Nuvem (Supabase): login de verdade e dados sincronizados entre aparelhos =====
//
// Como funciona:
// 1. O login (e-mail e senha) é feito pelo Supabase Auth. A senha nunca passa por aqui guardada.
// 2. O app continua lendo e gravando no localStorage, como sempre (é rápido e funciona sem internet).
//    Este arquivo "observa" cada gravação nas chaves da pessoa logada (cifra:u:<id>:...) e envia
//    para a tabela "dados" do Supabase alguns instantes depois.
// 3. Ao abrir o site (ou entrar), baixamos tudo da tabela "dados" para o localStorage.
//    Assim o celular e o computador mostram as mesmas informações.
// 4. Sem internet, as mudanças ficam numa fila ("pendentes") e são enviadas quando a conexão voltar.
//
// A chave publicável abaixo PODE ficar no site: quem protege os dados são as regras (RLS) do banco,
// que só deixam cada pessoa ler e mudar as próprias linhas. A chave secreta (service_role) NUNCA entra aqui.

import { createClient } from '@supabase/supabase-js';
import { gravarSessao, apagarSessao, usuarioAtualId } from './armazenamento.js';
import { aplicarFotoDoCadastro } from './fotoPerfil.js';

const URL_DO_PROJETO = import.meta.env.VITE_SUPABASE_URL || 'https://iwcdsxtatatrwlblzxye.supabase.co';
const CHAVE_PUBLICA = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_5dEFZ0FHknik2F8nxJb0NQ_JOds1VMX';

// ----- Login só enquanto a página estiver aberta -----
// O login do Supabase fica no sessionStorage (não no localStorage): ao fechar a aba ou o app,
// ele some e a pessoa precisa digitar e-mail e senha de novo. Recarregar a página não desloga.
const CHAVE_LOGIN = 'cifra-login';
const CHAVE_SAIU_EM = 'cifra-saiu-em'; // quando a página foi escondida/fechada pela última vez
const TEMPO_DE_RECARREGAR = 15000; // reabrir depois disso conta como "fechou e abriu de novo"

const armazenamentoDaAba = {
  getItem: (k) => {
    try {
      return sessionStorage.getItem(k);
    } catch {
      return null;
    }
  },
  setItem: (k, v) => {
    try {
      sessionStorage.setItem(k, v);
    } catch {
      /* sem acesso */
    }
  },
  removeItem: (k) => {
    try {
      sessionStorage.removeItem(k);
    } catch {
      /* sem acesso */
    }
  },
};

// Alguns navegadores devolvem o sessionStorage ao restaurar abas fechadas ("continuar de onde parou").
// Se a página ficou fechada mais que alguns segundos, o login antigo não vale: apaga antes de abrir.
function esquecerLoginDeAbaReaberta() {
  try {
    localStorage.removeItem(CHAVE_LOGIN); // versões antigas guardavam o login aqui (ficava para sempre)
    const saiuEm = Number(localStorage.getItem(CHAVE_SAIU_EM)) || 0;
    if (saiuEm && Date.now() - saiuEm > TEMPO_DE_RECARREGAR) {
      sessionStorage.removeItem(CHAVE_LOGIN);
      sessionStorage.removeItem('cifra:sessao');
    }
    localStorage.removeItem(CHAVE_SAIU_EM);
  } catch {
    /* sem acesso */
  }
}

function anotarSaida() {
  try {
    localStorage.setItem(CHAVE_SAIU_EM, String(Date.now()));
  } catch {
    /* sem acesso */
  }
}

esquecerLoginDeAbaReaberta(); // antes de criar o cliente, que lê o login guardado

export const supabase = createClient(URL_DO_PROJETO, CHAVE_PUBLICA, {
  auth: {
    flowType: 'implicit', // os links de e-mail voltam com o login no endereço (tratado em tratarLinkDoEmail)
    detectSessionInUrl: false, // nós mesmos lemos o link, por causa do HashRouter (#/)
    persistSession: true,
    autoRefreshToken: true,
    storageKey: CHAVE_LOGIN,
    storage: armazenamentoDaAba,
  },
});

const TABELA = 'dados';
const ESPERA_PARA_ENVIAR = 800; // junta várias gravações seguidas num envio só
const NOME_VALIDO = /^[a-z0-9_-]{1,60}$/;
const SO_NESTE_APARELHO = ['perfil']; // o perfil fica na tabela "perfis", não em "dados"

let uid = null; // quem está sincronizando agora
let escrevendoDaNuvem = false; // true enquanto gravamos o que veio do servidor (não reenviar)
let relogio = null;
let envioEmAndamento = null;
let ultimoDownload = 0;
let saindo = false;
const versoes = new Map(); // quantas vezes cada chave mudou (para não perder mudança feita durante o envio)

// ----- Estado (para o aviso na tela) -----
// 'ok' | 'salvando' | 'erro' (sem internet) | 'limite' (conta cheia) | 'novidades' (outro aparelho mudou algo)
let estado = 'ok';
function mudarEstado(novo) {
  if (estado === novo) return;
  estado = novo;
  window.dispatchEvent(new CustomEvent('cifra:nuvem', { detail: novo }));
}
export const estadoDaNuvem = () => estado;

// ----- Endereço do site (para onde os links dos e-mails levam) -----
export function enderecoDoSite() {
  return `${window.location.origin}${window.location.pathname}`;
}

// ----- Fila de pendentes (guardada, para sobreviver a fechar a aba sem internet) -----
const chavePendentes = () => `cifra-pendentes:${uid}`;
const prefixo = (id = uid) => `cifra:u:${id}:`;
const sincroniza = (nome) => NOME_VALIDO.test(nome) && !SO_NESTE_APARELHO.includes(nome);

function lerPendentes() {
  try {
    return new Set(JSON.parse(localStorage.getItem(chavePendentes()) || '[]'));
  } catch {
    return new Set();
  }
}

function gravarPendentes(conjunto) {
  try {
    if (conjunto.size) localStorage.setItem(chavePendentes(), JSON.stringify([...conjunto]));
    else localStorage.removeItem(chavePendentes());
  } catch {
    /* sem acesso ao armazenamento */
  }
}

export const temPendentes = () => Boolean(uid) && lerPendentes().size > 0;

// ----- Observa as gravações do app no localStorage -----
function anotar(chaveCompleta) {
  if (!uid || escrevendoDaNuvem || !chaveCompleta.startsWith(prefixo())) return;
  const nome = chaveCompleta.slice(prefixo().length);
  if (!sincroniza(nome)) return;
  versoes.set(nome, (versoes.get(nome) || 0) + 1);
  const pendentes = lerPendentes();
  pendentes.add(nome);
  gravarPendentes(pendentes);
  mudarEstado('salvando');
  clearTimeout(relogio);
  relogio = setTimeout(() => enviarPendentes(), ESPERA_PARA_ENVIAR);
}

function observarGravacoes() {
  const proto = Storage.prototype;
  if (proto.__cifraObservando) return;
  const gravarOriginal = proto.setItem;
  const apagarOriginal = proto.removeItem;
  proto.setItem = function setItem(chaveCompleta, valor) {
    const ehLocal = this === window.localStorage;
    const antes = ehLocal ? this.getItem(chaveCompleta) : null;
    gravarOriginal.call(this, chaveCompleta, valor);
    if (ehLocal && antes !== String(valor)) anotar(chaveCompleta);
  };
  proto.removeItem = function removeItem(chaveCompleta) {
    const ehLocal = this === window.localStorage;
    const existia = ehLocal && this.getItem(chaveCompleta) !== null;
    apagarOriginal.call(this, chaveCompleta);
    if (existia) anotar(chaveCompleta);
  };
  Object.defineProperty(proto, '__cifraObservando', { value: true });
}

// ----- Enviar o que está na fila -----
export async function enviarPendentes() {
  clearTimeout(relogio);
  if (envioEmAndamento) await envioEmAndamento.catch(() => {});
  if (!uid) return true;
  const nomes = [...lerPendentes()];
  if (!nomes.length) {
    if (estado === 'salvando' || estado === 'erro' || estado === 'limite') mudarEstado('ok');
    return true;
  }
  const quem = uid;
  const fotografia = new Map(nomes.map((n) => [n, versoes.get(n) || 0]));
  envioEmAndamento = (async () => {
    const agora = new Date().toISOString();
    const gravar = [];
    const apagar = [];
    nomes.forEach((nome) => {
      const valor = localStorage.getItem(prefixo(quem) + nome);
      if (valor === null) apagar.push(nome);
      else gravar.push({ usuario: quem, chave: nome, valor, atualizado_em: agora });
    });
    if (gravar.length) {
      const { error } = await supabase.from(TABELA).upsert(gravar);
      if (error) throw error;
    }
    if (apagar.length) {
      const { error } = await supabase.from(TABELA).delete().eq('usuario', quem).in('chave', apagar);
      if (error) throw error;
    }
  })();
  try {
    await envioEmAndamento;
    if (uid !== quem) return true;
    // Tira da fila só o que não mudou de novo durante o envio
    const pendentes = lerPendentes();
    fotografia.forEach((versao, nome) => {
      if ((versoes.get(nome) || 0) === versao) pendentes.delete(nome);
    });
    gravarPendentes(pendentes);
    if (pendentes.size) {
      relogio = setTimeout(() => enviarPendentes(), ESPERA_PARA_ENVIAR);
    } else {
      mudarEstado('ok');
    }
    return true;
  } catch (falha) {
    // Conta cheia (limite do banco): não adianta tentar de novo logo
    const cheia = String(falha?.message || '').includes('limite_dados');
    mudarEstado(cheia ? 'limite' : 'erro');
    clearTimeout(relogio);
    relogio = setTimeout(() => enviarPendentes(), cheia ? 10 * 60000 : 30000); // tenta de novo depois
    return false;
  } finally {
    envioEmAndamento = null;
  }
}

// ----- Baixar tudo do servidor para este aparelho -----
// Devolve { mudou, vazio }: "mudou" = algo diferente veio da nuvem; "vazio" = a pessoa ainda não tem nada salvo lá
export async function baixarTudo() {
  if (!uid) return { mudou: false, vazio: true };
  const quem = uid;
  const { data, error } = await supabase.from(TABELA).select('chave, valor');
  if (error) throw error;
  if (uid !== quem) return { mudou: false, vazio: false };
  ultimoDownload = Date.now();
  const pendentes = lerPendentes();
  const naNuvem = new Map(data.map((linha) => [linha.chave, linha.valor]));
  let mudou = false;
  escrevendoDaNuvem = true;
  try {
    naNuvem.forEach((valor, nome) => {
      if (pendentes.has(nome)) return; // a mudança deste aparelho ainda vai subir: ela vale mais
      const k = prefixo() + nome;
      if (localStorage.getItem(k) !== valor) {
        localStorage.setItem(k, valor);
        mudou = true;
      }
    });
    // O que não está mais na nuvem foi apagado em outro aparelho
    Object.keys(localStorage)
      .filter((k) => k.startsWith(prefixo()))
      .forEach((k) => {
        const nome = k.slice(prefixo().length);
        if (sincroniza(nome) && !naNuvem.has(nome) && !pendentes.has(nome)) {
          localStorage.removeItem(k);
          mudou = true;
        }
      });
  } finally {
    escrevendoDaNuvem = false;
  }
  return { mudou, vazio: data.length === 0 };
}

// Espera no máximo "ms"; depois segue (sem internet o site abre com o que já está no aparelho)
function comLimite(promessa, ms) {
  return Promise.race([promessa, new Promise((_, rejeitar) => setTimeout(() => rejeitar(new Error('demorou')), ms))]);
}

// ----- Perfil (tabela "perfis") guardado também neste aparelho, para as telas lerem na hora -----
const chavePerfil = (id = uid) => `${prefixo(id)}perfil`;

export function perfilGuardado(id = usuarioAtualId()) {
  if (!id) return null;
  try {
    const p = JSON.parse(localStorage.getItem(chavePerfil(id)) || 'null');
    return p ? { ...p, id } : null;
  } catch {
    return null;
  }
}

export function guardarPerfil(perfil, id = uid) {
  try {
    localStorage.setItem(chavePerfil(id), JSON.stringify(perfil));
  } catch {
    /* sem acesso ao armazenamento */
  }
}

// ----- Verificação em duas etapas (2FA) -----
// A conta tem 2FA ativo?
export async function temSegundoFatorAtivo() {
  try {
    const { data } = await supabase.auth.mfa.listFactors();
    return Boolean(data?.totp?.some((f) => f.status === 'verified'));
  } catch {
    return false;
  }
}

// A sessão atual entrou com senha, mas ainda falta o código do 2FA?
export async function faltaCodigoDoSegundoFator() {
  try {
    const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (error || !data) return false;
    return data.nextLevel === 'aal2' && data.currentLevel !== 'aal2';
  } catch {
    return false;
  }
}

async function buscarPerfil(usuario) {
  const { data, error } = await supabase.from('perfis').select('nome, sobrenome, idade, endereco').eq('id', usuario.id).maybeSingle();
  if (error) throw error;
  const meta = usuario.user_metadata || {};
  const perfil = {
    nome: data?.nome || meta.nome || '',
    sobrenome: data?.sobrenome || meta.sobrenome || '',
    idade: data?.idade ?? meta.idade ?? null,
    endereco: data?.endereco || meta.endereco || {},
    email: usuario.email || '',
    emailNovo: usuario.new_email || '',
    doisFatores: await temSegundoFatorAtivo(),
  };
  guardarPerfil(perfil, usuario.id);
  return perfil;
}

// Nome no painel e e-mail nas preferências, para quem acabou de chegar
function completarDadosIniciais(perfil) {
  const kNome = `${prefixo()}usuario`;
  const kPref = `${prefixo()}preferencias`;
  try {
    if (!localStorage.getItem(kNome) && perfil.nome) localStorage.setItem(kNome, perfil.nome);
    const pref = JSON.parse(localStorage.getItem(kPref) || '{}');
    if (!pref.email && perfil.email) localStorage.setItem(kPref, JSON.stringify({ ...pref, email: perfil.email }));
  } catch {
    /* sem acesso ao armazenamento */
  }
}

// ----- Começar a sincronizar uma pessoa -----
async function comecarSincronia(usuario, { limite = 8000 } = {}) {
  uid = usuario.id;
  gravarSessao(usuario.id);
  let vazio = false;
  try {
    await comLimite(enviarPendentes(), limite);
    ({ vazio } = await comLimite(baixarTudo(), limite));
    aplicarFotoDoCadastro(usuario.email); // foto escolhida no cadastro (fica esperando até o 1º login)
    const perfil = await comLimite(buscarPerfil(usuario), limite);
    completarDadosIniciais(perfil);
  } catch {
    mudarEstado('erro');
  }
  return { vazio };
}

// ===== Trazer para a conta os dados que já estavam neste navegador =====
// 1) conta antiga criada neste navegador (antes do Supabase) com o mesmo e-mail;
// 2) dados do antigo acesso de teste (só se a pessoa confirmar).
const CHAVES_GERAIS = ['cifra:sessao', 'cifra:usuarios'];

function chavesDoAcessoDeTeste() {
  return Object.keys(localStorage).filter((k) => k.startsWith('cifra:') && !k.startsWith('cifra:u:') && !CHAVES_GERAIS.includes(k));
}

async function trazerDadosDesteNavegador(usuario, perguntar) {
  let origem = null;
  let donoAntigo = null;
  let contaAntiga = null;
  try {
    const antigas = JSON.parse(localStorage.getItem('cifra:usuarios') || '[]');
    contaAntiga = Array.isArray(antigas) ? antigas.find((c) => c.email === String(usuario.email).toLowerCase()) : null;
  } catch {
    contaAntiga = null;
  }
  if (contaAntiga) {
    const p = `cifra:u:${contaAntiga.id}:`;
    origem = Object.keys(localStorage).filter((k) => k.startsWith(p)).map((k) => [k, k.slice(p.length)]);
    donoAntigo = contaAntiga.id;
  } else {
    const doTeste = chavesDoAcessoDeTeste();
    const temAlgo = doTeste.some((k) => ['cifra:lancamentos', 'cifra:contas', 'cifra:objetivos'].includes(k));
    if (temAlgo && perguntar('Encontramos neste navegador dados do antigo acesso de teste da CIFRA.\n\nQuer levar esses dados para a sua conta?')) {
      origem = doTeste.map((k) => [k, k.slice('cifra:'.length)]);
      donoAntigo = 'principal';
    }
  }
  if (!origem?.length) return false;

  origem.forEach(([k, nome]) => {
    if (!sincroniza(nome)) return;
    const valor = localStorage.getItem(k);
    if (valor !== null) localStorage.setItem(prefixo() + nome, valor); // vira pendente e sobe
  });
  try {
    const { levarComprovantesParaNuvem } = await import('./comprovantes.js');
    await levarComprovantesParaNuvem(donoAntigo);
  } catch {
    /* os arquivos ficam neste aparelho; os dados já foram */
  }
  // Os dados agora estão na conta: tira as cópias antigas deste navegador
  origem.forEach(([k]) => localStorage.removeItem(k));
  if (contaAntiga) {
    try {
      const antigas = JSON.parse(localStorage.getItem('cifra:usuarios') || '[]');
      localStorage.setItem('cifra:usuarios', JSON.stringify(antigas.filter((c) => c.id !== contaAntiga.id)));
    } catch {
      /* sem acesso ao armazenamento */
    }
  }
  await enviarPendentes();
  return true;
}

// Chamado logo depois de entrar ou de criar conta (com o login já aceito pelo Supabase)
export async function aposEntrar(usuario, { perguntar = (texto) => window.confirm(texto) } = {}) {
  const { vazio } = await comecarSincronia(usuario);
  if (vazio) await trazerDadosDesteNavegador(usuario, perguntar);
  await enviarPendentes();
}

// ===== Abrir o site =====
// Roda antes de desenhar a primeira tela (main.jsx)
export async function prepararNuvem() {
  observarGravacoes();
  await tratarLinkDoEmail();

  let sessao = null;
  try {
    ({
      data: { session: sessao },
    } = await supabase.auth.getSession());
  } catch {
    sessao = null;
  }

  // Marca quando a página é escondida ou fechada (para saber, na próxima abertura, se foi só um recarregar)
  window.addEventListener('pagehide', anotarSaida);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') anotarSaida();
  });

  if (!sessao) {
    // Ninguém logado nesta aba: pede e-mail e senha e tira deste aparelho a cópia dos dados
    // (o que ainda não subiu para a nuvem fica guardado e sobe no próximo login da pessoa)
    apagarSessao();
    await limparCopiasSemLogin();
  } else if (await faltaCodigoDoSegundoFator()) {
    // Entrou com a senha, mas não digitou o código do 2FA: o banco não libera os dados.
    // Na tela "Criar senha nova" (link do e-mail) a sessão fica, para pedir o código lá.
    apagarSessao();
    if (!window.location.hash.startsWith('#/nova-senha')) {
      try {
        await supabase.auth.signOut({ scope: 'local' });
      } catch {
        /* sem internet */
      }
    }
  } else {
    await comecarSincronia(sessao.user, { limite: 6000 });
  }

  // O Supabase avisa quando o login acaba (saiu em outra aba, conta excluída, senha trocada...)
  supabase.auth.onAuthStateChange((evento) => {
    if (evento === 'SIGNED_OUT' && uid && !saindo) {
      pararSincronia();
      apagarSessao();
      window.location.hash = '#/entrar';
      window.location.reload();
    }
  });

  // Ao voltar para a aba, confere se outro aparelho mudou algo
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState !== 'visible' || !uid || Date.now() - ultimoDownload < 60000) return;
    await enviarPendentes();
    if (temPendentes()) return;
    try {
      const { mudou } = await baixarTudo();
      if (mudou) mudarEstado('novidades');
    } catch {
      /* sem internet agora */
    }
  });
  window.addEventListener('online', () => enviarPendentes());
}

function pararSincronia() {
  clearTimeout(relogio);
  uid = null;
}

// Para de sincronizar sem avisar a tela (usado ao excluir a conta)
export function encerrarSincronia() {
  saindo = true;
  pararSincronia();
}

// ===== Links que chegam por e-mail (confirmar conta, nova senha, trocar e-mail) =====
// O Supabase volta para o site com "#access_token=...&type=..." (ou "#error=...").
// Lemos isso antes do HashRouter, abrimos a sessão e mandamos para a tela certa.
const AVISO_ENTRAR = 'cifra-aviso-entrar';

export function lerAvisoDoEntrar() {
  try {
    const texto = sessionStorage.getItem(AVISO_ENTRAR);
    sessionStorage.removeItem(AVISO_ENTRAR);
    return texto || '';
  } catch {
    return '';
  }
}

function avisarNoEntrar(texto) {
  try {
    sessionStorage.setItem(AVISO_ENTRAR, texto);
  } catch {
    /* sem acesso */
  }
}

function trocarEndereco(rota) {
  window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#${rota}`);
}

async function tratarLinkDoEmail() {
  const hash = window.location.hash;
  if (!/(access_token|error_description|error_code)=/.test(hash)) return;
  const p = new URLSearchParams(hash.replace(/^#\/?/, ''));
  if (p.get('error') || p.get('error_code')) {
    avisarNoEntrar(
      p.get('error_code') === 'otp_expired'
        ? 'Este link expirou ou já foi usado. Peça um novo.'
        : 'Não foi possível usar este link. Peça um novo.'
    );
    trocarEndereco('/entrar');
    return;
  }
  const tipo = p.get('type');
  try {
    const { error } = await supabase.auth.setSession({
      access_token: p.get('access_token'),
      refresh_token: p.get('refresh_token'),
    });
    if (error) throw error;
  } catch {
    avisarNoEntrar('Não foi possível usar este link. Peça um novo.');
    trocarEndereco('/entrar');
    return;
  }
  if (tipo === 'recovery') trocarEndereco('/nova-senha');
  else trocarEndereco('/painel');
}

// ===== Sair =====
// Envia o que falta, encerra o login e limpa as informações da pessoa deste aparelho
export async function sairDaConta() {
  saindo = true;
  const quem = uid;
  const tudoEnviado = await comLimite(enviarPendentes(), 8000).catch(() => false);
  try {
    await supabase.auth.signOut({ scope: 'local' });
  } catch {
    /* mesmo sem internet o login local é apagado */
  }
  pararSincronia();
  apagarSessao();
  // Os dados estão na nuvem: tira a cópia deste aparelho (se algo não subiu, fica guardado para a próxima vez)
  if (quem && tudoEnviado) await limparDesteAparelho(quem);
}

// Apaga a cópia local de quem não está logado, menos de quem tem mudanças que ainda não subiram
async function limparCopiasSemLogin() {
  let ids = [];
  try {
    ids = [...new Set(Object.keys(localStorage).filter((k) => k.startsWith('cifra:u:')).map((k) => k.split(':')[2]))];
  } catch {
    return;
  }
  for (const id of ids) {
    let pendentes = [];
    try {
      pendentes = JSON.parse(localStorage.getItem(`cifra-pendentes:${id}`) || '[]');
    } catch {
      pendentes = [];
    }
    if (!pendentes.length) await limparDesteAparelho(id);
  }
}

export async function limparDesteAparelho(id) {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(`cifra:u:${id}:`) || k === `cifra-pendentes:${id}`)
      .forEach((k) => window.localStorage.removeItem(k));
  } catch {
    /* sem acesso */
  }
  try {
    const { limparComprovantesDoAparelho } = await import('./comprovantes.js');
    await limparComprovantesDoAparelho(id);
  } catch {
    /* sem IndexedDB */
  }
}

