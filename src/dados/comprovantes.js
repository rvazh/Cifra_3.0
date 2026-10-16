// ===== Comprovantes =====
// Arquivos (fotos e PDFs) ficam guardados no IndexedDB do navegador, neste aparelho.
// O IndexedDB aguenta arquivos bem maiores que o localStorage.

import { donoAtual } from './armazenamento.js';

const BANCO = 'cifra';
const LOJA = 'comprovantes';
const LIMITE = 10 * 1024 * 1024; // 10 MB por arquivo
const LADO_MAXIMO = 1800; // fotos maiores são reduzidas para ocupar menos espaço

export const TIPOS_ACEITOS = 'image/jpeg,image/png,image/webp,image/heic,application/pdf';

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

// Fotos grandes viram JPEG menor; PDFs e fotos pequenas ficam como estão
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

// Confere o arquivo e guarda. Devolve o registro salvo (sem precisar ler de novo).
export async function guardarComprovante(arquivo, lancamentoId = null) {
  const tipoOk = arquivo.type.startsWith('image/') || arquivo.type === 'application/pdf';
  if (!tipoOk) throw new Error('Envie uma foto (JPG, PNG) ou um PDF.');
  const pronto = await reduzirFoto(arquivo);
  if (pronto.size > LIMITE) throw new Error('O arquivo passa de 10 MB. Tente uma foto menor ou um PDF mais leve.');

  const registro = {
    id: `comp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    nome: pronto.name || 'comprovante',
    tipo: pronto.type,
    tamanho: pronto.size,
    criadoEm: new Date().toISOString(),
    lancamentoId,
    dono: donoAtual(), // cada pessoa vê só os seus comprovantes
    blob: pronto,
  };
  await naLoja('readwrite', (loja) => loja.put(registro));
  return registro;
}

export async function listarComprovantes() {
  const todos = (await naLoja('readonly', (loja) => loja.getAll())) || [];
  return todos.filter(ehDaPessoa).sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
}

// Comprovantes antigos (sem dono) são do acesso de teste
function ehDaPessoa(registro) {
  return (registro?.dono || 'principal') === donoAtual();
}

export async function pegarComprovante(id) {
  const registro = await naLoja('readonly', (loja) => loja.get(id));
  return ehDaPessoa(registro) ? registro : undefined;
}

export async function apagarComprovante(id) {
  if (!(await pegarComprovante(id))) return undefined; // não apaga comprovante de outra pessoa
  return naLoja('readwrite', (loja) => loja.delete(id));
}

export async function vincularComprovante(id, lancamentoId) {
  const registro = await pegarComprovante(id);
  if (!registro) return;
  await naLoja('readwrite', (loja) => loja.put({ ...registro, lancamentoId }));
}

// Usado em "Apagar todos os dados": apaga só os comprovantes da pessoa logada
export async function apagarTodosComprovantes() {
  try {
    const meus = await listarComprovantes();
    await naLoja('readwrite', (loja) => {
      meus.forEach((c) => loja.delete(c.id));
      return null;
    });
  } catch {
    /* sem IndexedDB: não há o que apagar */
  }
}

export function tamanhoLegivel(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB`;
}
