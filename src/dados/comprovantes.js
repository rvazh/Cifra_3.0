// ===== Comprovantes =====
// Os arquivos (fotos e PDFs) ficam no Supabase Storage, numa pasta privada de cada pessoa:
//   comprovantes/<id da pessoa>/<id do comprovante>
// A lista (nome, tipo, tamanho, lançamento ligado) fica na chave "comprovantes", que sincroniza como os outros dados.
// Uma cópia de cada arquivo fica no IndexedDB deste aparelho, para abrir rápido e sem baixar de novo.

import { chave, donoAtual, usuarioAtualId } from './armazenamento.js';
import { supabase } from './nuvem.js';

const BANCO = 'cifra';
const LOJA = 'comprovantes';
const PASTA = 'comprovantes'; // bucket no Supabase
const LIMITE = 10 * 1024 * 1024; // 10 MB por arquivo
const LADO_MAXIMO = 1800; // fotos maiores são reduzidas para ocupar menos espaço

export const TIPOS_ACEITOS = 'image/jpeg,image/png,image/webp,image/heic,application/pdf';

// ----- Lista (sincronizada) -----
const CHAVE = () => chave('comprovantes');

function lerLista() {
  try {
    const lista = JSON.parse(localStorage.getItem(CHAVE()) || '[]');
    return Array.isArray(lista) ? lista : [];
  } catch {
    return [];
  }
}

function gravarLista(lista) {
  try {
    if (lista.length) localStorage.setItem(CHAVE(), JSON.stringify(lista));
    else localStorage.removeItem(CHAVE());
  } catch {
    /* sem acesso ao armazenamento */
  }
}

const caminho = (id, dono = usuarioAtualId()) => `${dono}/${id}`;

// ----- Cópia no aparelho (IndexedDB) -----
function abrir() {
  return new Promise((resolver, rejeitar) => {
    if (!window.indexedDB) {
      rejeitar(new Error('sem-indexeddb'));
      return;
    }
    const pedido = indexedDB.open(BANCO, 1);
    pedido.onupgradeneeded = () => {
      const banco = pedido.result;
      if (!banco.objectStoreNames.contains(LOJA)) banco.createObjectStore(LOJA, { keyPath: 'id' });
    };
    pedido.onsuccess = () => resolver(pedido.result);
    pedido.onerror = () => rejeitar(pedido.error);
  });
}

// Executa uma operação na "loja" de comprovantes e devolve o resultado
async function naLoja(modo, operacao) {
  const banco = await abrir();
  return new Promise((resolver, rejeitar) => {
    const transacao = banco.transaction(LOJA, modo);
    const pedido = operacao(transacao.objectStore(LOJA));
    transacao.oncomplete = () => {
      banco.close();
      resolver(pedido?.result);
    };
    transacao.onerror = () => rejeitar(transacao.error);
    transacao.onabort = () => rejeitar(transacao.error);
  });
}

async function copiaLocal(id) {
  try {
    const registro = await naLoja('readonly', (loja) => loja.get(id));
    return registro && registro.dono === donoAtual() && registro.blob ? registro : null;
  } catch {
    return null;
  }
}

async function guardarCopia(registro) {
  try {
    await naLoja('readwrite', (loja) => loja.put({ ...registro, dono: donoAtual() }));
  } catch {
    /* sem IndexedDB: o arquivo continua na nuvem */
  }
}

async function apagarCopias(ids) {
  try {
    await naLoja('readwrite', (loja) => {
      ids.forEach((id) => loja.delete(id));
      return null;
    });
  } catch {
    /* sem IndexedDB */
  }
}

// ----- Fotos grandes viram JPEG menor; PDFs e fotos pequenas ficam como estão -----
async function reduzirFoto(arquivo) {
  if (!arquivo.type.startsWith('image/') || arquivo.type === 'image/heic') return arquivo;
  try {
    const imagem = await createImageBitmap(arquivo);
    const escala = Math.min(1, LADO_MAXIMO / Math.max(imagem.width, imagem.height));
    if (escala === 1 && arquivo.size < 1.5 * 1024 * 1024) return arquivo;
    const tela = document.createElement('canvas');
    tela.width = Math.round(imagem.width * escala);
    tela.height = Math.round(imagem.height * escala);
    tela.getContext('2d').drawImage(imagem, 0, 0, tela.width, tela.height);
    const blob = await new Promise((r) => tela.toBlob(r, 'image/jpeg', 0.82));
    if (!blob || blob.size >= arquivo.size) return arquivo;
    const nome = arquivo.name.replace(/\.[^.]+$/, '') + '.jpg';
    return new File([blob], nome, { type: 'image/jpeg' });
  } catch {
    return arquivo;
  }
}

// Limites por conta (o banco confere de verdade; aqui é só para avisar antes)
export const LIMITE_DE_ARQUIVOS = 300;
export const LIMITE_DE_ESPACO = 100 * 1000 * 1000; // 100 MB
const AVISO_DE_LIMITE = 'Sua conta chegou ao limite de comprovantes (300 arquivos ou 100 MB). Apague alguns antigos para enviar novos.';

async function enviarArquivo(id, blob, tipo) {
  const { error } = await supabase.storage.from(PASTA).upload(caminho(id), blob, { contentType: tipo, upsert: true });
  if (!error) return;
  const texto = String(error.message || '').toLowerCase();
  if (texto.includes('row-level security') || texto.includes('policy')) throw new Error(AVISO_DE_LIMITE);
  throw new Error('Não foi possível enviar o comprovante. Confira a internet e tente de novo.');
}

// ----- Funções usadas pelas telas -----
// Confere o arquivo, envia e guarda. Devolve o registro salvo (com o arquivo em "blob").
export async function guardarComprovante(arquivo, lancamentoId = null) {
  const tipoOk = arquivo.type.startsWith('image/') || arquivo.type === 'application/pdf';
  if (!tipoOk) throw new Error('Envie uma foto (JPG, PNG) ou um PDF.');
  const pronto = await reduzirFoto(arquivo);
  if (pronto.size > LIMITE) throw new Error('O arquivo passa de 10 MB. Tente uma foto menor ou um PDF mais leve.');
  const lista = lerLista();
  const ocupado = lista.reduce((s, c) => s + (c.tamanho || 0), 0);
  if (lista.length >= LIMITE_DE_ARQUIVOS || ocupado + pronto.size > LIMITE_DE_ESPACO) throw new Error(AVISO_DE_LIMITE);

  const dados = {
    id: `comp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    nome: pronto.name || 'comprovante',
    tipo: pronto.type,
    tamanho: pronto.size,
    criadoEm: new Date().toISOString(),
    lancamentoId,
  };
  await enviarArquivo(dados.id, pronto, pronto.type);
  await guardarCopia({ ...dados, blob: pronto });
  gravarLista([dados, ...lerLista().filter((c) => c.id !== dados.id)]);
  return { ...dados, blob: pronto };
}

// Baixa o arquivo da nuvem (e guarda a cópia neste aparelho)
async function comArquivo(dados) {
  const copia = await copiaLocal(dados.id);
  if (copia) return { ...dados, blob: copia.blob };
  const { data, error } = await supabase.storage.from(PASTA).download(caminho(dados.id));
  if (error || !data) return { ...dados, blob: null, indisponivel: true };
  const blob = data.type ? data : new Blob([data], { type: dados.tipo });
  await guardarCopia({ ...dados, blob });
  return { ...dados, blob };
}

export async function listarComprovantes() {
  const lista = [...lerLista()].sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
  const resultado = [];
  // De 4 em 4, para não abrir muitos downloads ao mesmo tempo
  for (let i = 0; i < lista.length; i += 4) {
    resultado.push(...(await Promise.all(lista.slice(i, i + 4).map(comArquivo))));
  }
  // Sem internet, o que não está no aparelho fica com um arquivo vazio (a tela mostra o nome)
  return resultado.map((c) => (c.blob ? c : { ...c, blob: new Blob([], { type: c.tipo }) }));
}

export async function pegarComprovante(id) {
  const dados = lerLista().find((c) => c.id === id);
  if (!dados) return undefined;
  const completo = await comArquivo(dados);
  return completo.blob ? completo : undefined;
}

export async function apagarComprovante(id) {
  if (!lerLista().some((c) => c.id === id)) return; // não é desta pessoa
  await supabase.storage.from(PASTA).remove([caminho(id)]);
  await apagarCopias([id]);
  gravarLista(lerLista().filter((c) => c.id !== id));
}

export async function vincularComprovante(id, lancamentoId) {
  gravarLista(lerLista().map((c) => (c.id === id ? { ...c, lancamentoId } : c)));
}

// Apaga os arquivos da nuvem de uma pessoa (inclusive os que ficaram fora da lista)
export async function apagarArquivosDaConta(dono = usuarioAtualId()) {
  if (!dono) return;
  const loja = supabase.storage.from(PASTA);
  for (let volta = 0; volta < 20; volta++) {
    const { data, error } = await loja.list(dono, { limit: 100 });
    if (error || !data?.length) return;
    const { error: falha } = await loja.remove(data.map((a) => `${dono}/${a.name}`));
    if (falha) return;
  }
}

// Usado em "Apagar todos os dados": apaga os comprovantes da pessoa logada (nuvem e aparelho)
export async function apagarTodosComprovantes() {
  const ids = lerLista().map((c) => c.id);
  try {
    await apagarArquivosDaConta();
  } catch {
    /* sem internet: a lista some e os arquivos ficam órfãos até a próxima limpeza */
  }
  await apagarCopias(ids);
  gravarLista([]);
}

// Ao sair: tira deste aparelho as cópias dos arquivos da pessoa
export async function limparComprovantesDoAparelho(dono) {
  try {
    const todos = (await naLoja('readonly', (loja) => loja.getAll())) || [];
    await apagarCopias(todos.filter((r) => r.dono === dono).map((r) => r.id));
  } catch {
    /* sem IndexedDB */
  }
}

// Comprovantes guardados só neste navegador (antes da nuvem): envia para a conta de quem acabou de entrar.
// donoAntigo: id da conta antiga deste navegador, ou 'principal' (antigo acesso de teste).
export async function levarComprovantesParaNuvem(donoAntigo) {
  let antigos = [];
  try {
    const todos = (await naLoja('readonly', (loja) => loja.getAll())) || [];
    antigos = todos.filter((r) => (r.dono || 'principal') === donoAntigo && r.blob);
  } catch {
    return;
  }
  const lista = lerLista();
  for (const r of antigos) {
    const { blob, dono, ...dados } = r;
    try {
      await enviarArquivo(dados.id, blob, dados.tipo);
      await guardarCopia({ ...dados, blob });
      if (!lista.some((c) => c.id === dados.id)) lista.unshift(dados);
    } catch {
      /* este fica para trás; os outros seguem */
    }
  }
  gravarLista(lista);
}

export function tamanhoLegivel(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB`;
}
