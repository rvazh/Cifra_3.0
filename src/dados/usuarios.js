// ===== Contas de clientes (cadastro e login por e-mail ou CPF) =====
// Por enquanto as contas ficam guardadas só neste navegador (localStorage).
// Quando a CIFRA tiver servidor (Supabase), o cadastro e a conferência da senha passam para lá.
//
// A senha NUNCA é guardada: guardamos só o resultado do PBKDF2 (um "hash lento"),
// com um sal aleatório diferente para cada pessoa.

import { usuarioAtualId } from './armazenamento.js';

const CHAVE = 'cifra:usuarios';
const ITERACOES = 150000; // quanto maior, mais difícil de adivinhar a senha por tentativa e erro
export const IDADE_MINIMA = 18;
export const SENHA_MINIMA = 8;

export const ESTADOS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA',
  'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

// ----- Leitura e gravação -----
function lerTodos() {
  try {
    const lista = JSON.parse(localStorage.getItem(CHAVE) || '[]');
    return Array.isArray(lista) ? lista : [];
  } catch {
    return [];
  }
}

function gravarTodos(lista) {
  localStorage.setItem(CHAVE, JSON.stringify(lista));
}

// ----- CPF -----
export const soNumeros = (texto) => String(texto || '').replace(/\D/g, '');

// 12345678909 -> 123.456.789-09 (vai formatando enquanto a pessoa digita)
export function mascaraCPF(texto) {
  const n = soNumeros(texto).slice(0, 11);
  return n
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2');
}

// Confere os dois dígitos verificadores do CPF
export function cpfValido(texto) {
  const n = soNumeros(texto);
  if (n.length !== 11 || /^(\d)\1{10}$/.test(n)) return false; // 111.111.111-11 etc. não valem
  const digito = (tamanho) => {
    let soma = 0;
    for (let i = 0; i < tamanho; i++) soma += Number(n[i]) * (tamanho + 1 - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return digito(9) === Number(n[9]) && digito(10) === Number(n[10]);
}

// 01001000 -> 01001-000
export function mascaraCEP(texto) {
  return soNumeros(texto).slice(0, 8).replace(/^(\d{5})(\d)/, '$1-$2');
}

export function emailValido(texto) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(texto).trim());
}

const limparEmail = (texto) => String(texto || '').trim().toLowerCase();

// ----- Senha -----
// Regras mostradas na tela de cadastro (cada uma vira um "check" verde quando cumprida)
export function regrasDaSenha(senha) {
  return [
    { texto: `Pelo menos ${SENHA_MINIMA} caracteres`, ok: senha.length >= SENHA_MINIMA },
    { texto: 'Uma letra', ok: /\p{L}/u.test(senha) },
    { texto: 'Um número', ok: /\d/.test(senha) },
  ];
}

const paraHex = (bytes) => Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, '0')).join('');
const deHex = (hex) => new Uint8Array(hex.match(/../g).map((h) => parseInt(h, 16)));

async function calcularHash(senha, salHex, iteracoes) {
  if (!window.crypto?.subtle) throw new Error('sem-crypto'); // só funciona em https ou localhost
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(senha), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: deHex(salHex), iterations: iteracoes }, base, 256);
  return paraHex(bits);
}

// Compara sem parar no primeiro caractere diferente (evita pistas pelo tempo de resposta)
function iguais(a, b) {
  if (a.length !== b.length) return false;
  let diferenca = 0;
  for (let i = 0; i < a.length; i++) diferenca |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diferenca === 0;
}

// ----- Procurar -----
export function emailJaUsado(email) {
  const e = limparEmail(email);
  return lerTodos().some((u) => u.email === e);
}

export function cpfJaUsado(cpf) {
  const n = soNumeros(cpf);
  return lerTodos().some((u) => u.cpf === n);
}

// Acha pela forma digitada: com "@" é e-mail; com 11 números é CPF
function acharPorIdentificador(identificador) {
  const texto = String(identificador || '').trim();
  if (texto.includes('@')) {
    const e = limparEmail(texto);
    return lerTodos().find((u) => u.email === e) || null;
  }
  const n = soNumeros(texto);
  if (n.length !== 11) return null;
  return lerTodos().find((u) => u.cpf === n) || null;
}

export function pareceEmailOuCPF(identificador) {
  const texto = String(identificador || '').trim();
  return texto.includes('@') || soNumeros(texto).length === 11;
}

// ----- Criar conta -----
// Devolve a pessoa criada (sem a senha). Lança erro com mensagem pronta para a tela.
export async function criarUsuario(dados) {
  const email = limparEmail(dados.email);
  const cpf = soNumeros(dados.cpf);
  if (emailJaUsado(email)) throw new Error('Já existe uma conta com este e-mail.');
  if (cpfJaUsado(cpf)) throw new Error('Já existe uma conta com este CPF.');

  const sal = paraHex(crypto.getRandomValues(new Uint8Array(16)));
  const hash = await calcularHash(dados.senha, sal, ITERACOES);
  const id = crypto.randomUUID ? crypto.randomUUID().replace(/-/g, '').slice(0, 16) : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

  const usuario = {
    id,
    nome: dados.nome.trim(),
    sobrenome: dados.sobrenome.trim(),
    email,
    cpf,
    idade: Number(dados.idade),
    endereco: {
      cep: soNumeros(dados.endereco.cep),
      rua: dados.endereco.rua.trim(),
      numero: dados.endereco.numero.trim(),
      complemento: dados.endereco.complemento.trim(),
      bairro: dados.endereco.bairro.trim(),
      cidade: dados.endereco.cidade.trim(),
      uf: dados.endereco.uf,
    },
    senha: { sal, hash, iteracoes: ITERACOES },
    aceitouTermosEm: new Date().toISOString(),
    criadoEm: new Date().toISOString(),
  };
  gravarTodos([...lerTodos(), usuario]);
  // Já deixa o nome e o e-mail prontos nas Configurações da pessoa
  try {
    localStorage.setItem(`cifra:u:${id}:usuario`, usuario.nome);
    localStorage.setItem(`cifra:u:${id}:preferencias`, JSON.stringify({ email }));
  } catch {
    /* sem acesso ao armazenamento */
  }
  return semSenha(usuario);
}

function semSenha(usuario) {
  const { senha, ...resto } = usuario;
  return resto;
}

// ----- Entrar -----
// Devolve a pessoa (sem a senha) se e-mail/CPF e senha conferem; senão null
export async function entrarComUsuario(identificador, senha) {
  const usuario = acharPorIdentificador(identificador);
  if (!usuario) {
    // Faz a mesma conta mesmo sem achar ninguém, para a resposta demorar igual
    await calcularHash(senha, '00'.repeat(16), ITERACOES);
    return null;
  }
  const { sal, hash, iteracoes } = usuario.senha;
  const calculado = await calcularHash(senha, sal, iteracoes);
  return iguais(calculado, hash) ? semSenha(usuario) : null;
}

// ----- Minha conta (tela de Configurações) -----
// A pessoa logada (sem a senha), ou null no acesso de teste
export function usuarioAtual() {
  const id = usuarioAtualId();
  if (!id) return null;
  const usuario = lerTodos().find((u) => u.id === id);
  return usuario ? semSenha(usuario) : null;
}

// Confere a senha de quem está logado (para trocar a senha ou excluir a conta)
async function senhaConfere(usuario, senha) {
  const { sal, hash, iteracoes } = usuario.senha;
  return iguais(await calcularHash(senha, sal, iteracoes), hash);
}

// Muda nome, sobrenome, e-mail e endereço. Lança erro com mensagem pronta para a tela.
export function atualizarUsuario(id, dados) {
  const todos = lerTodos();
  const atual = todos.find((u) => u.id === id);
  if (!atual) throw new Error('Conta não encontrada.');
  const email = limparEmail(dados.email);
  if (todos.some((u) => u.id !== id && u.email === email)) throw new Error('Já existe outra conta com este e-mail.');
  const novo = {
    ...atual,
    nome: dados.nome.trim(),
    sobrenome: dados.sobrenome.trim(),
    email,
    endereco: {
      cep: soNumeros(dados.endereco.cep),
      rua: dados.endereco.rua.trim(),
      numero: dados.endereco.numero.trim(),
      complemento: dados.endereco.complemento.trim(),
      bairro: dados.endereco.bairro.trim(),
      cidade: dados.endereco.cidade.trim(),
      uf: dados.endereco.uf,
    },
    atualizadoEm: new Date().toISOString(),
  };
  gravarTodos(todos.map((u) => (u.id === id ? novo : u)));
  return semSenha(novo);
}

// Troca a senha (precisa da senha atual). Devolve false se a senha atual estiver errada.
export async function trocarSenha(id, senhaAtual, novaSenha) {
  const todos = lerTodos();
  const usuario = todos.find((u) => u.id === id);
  if (!usuario || !(await senhaConfere(usuario, senhaAtual))) return false;
  const sal = paraHex(crypto.getRandomValues(new Uint8Array(16)));
  const hash = await calcularHash(novaSenha, sal, ITERACOES);
  gravarTodos(todos.map((u) => (u.id === id ? { ...u, senha: { sal, hash, iteracoes: ITERACOES } } : u)));
  return true;
}

// Exclui a conta e TODAS as informações dela neste navegador (precisa da senha).
// "antesDeApagar" roda depois de a senha conferir (a tela usa para apagar os comprovantes).
export async function excluirUsuario(id, senha, antesDeApagar) {
  const todos = lerTodos();
  const usuario = todos.find((u) => u.id === id);
  if (!usuario || !(await senhaConfere(usuario, senha))) return false;
  if (antesDeApagar) await antesDeApagar();
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(`cifra:u:${id}:`))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    /* sem acesso ao armazenamento */
  }
  gravarTodos(todos.filter((u) => u.id !== id));
  return true;
}

// ----- Endereço pelo CEP (ViaCEP, serviço gratuito) -----
// Devolve o endereço, { naoExiste: true } se o CEP não existe, ou null se não deu para consultar
export async function buscarCEP(cep) {
  const n = soNumeros(cep);
  if (n.length !== 8) return null;
  try {
    const resposta = await fetch(`https://viacep.com.br/ws/${n}/json/`);
    if (!resposta.ok) return null;
    const dados = await resposta.json();
    if (dados.erro) return { naoExiste: true };
    return { rua: dados.logradouro || '', bairro: dados.bairro || '', cidade: dados.localidade || '', uf: dados.uf || '' };
  } catch {
    return null; // sem internet ou serviço fora do ar: a pessoa preenche à mão
  }
}
