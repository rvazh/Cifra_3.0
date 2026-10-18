// ===== Contas de clientes (cadastro, login, senha e exclusão) =====
// Tudo isto agora é feito pelo Supabase Auth:
//   - a senha é guardada pelo Supabase (com hash bcrypt) e nunca fica no site nem no navegador;
//   - nome, sobrenome, idade e endereço ficam na tabela "perfis", que só a própria pessoa lê.
// O CPF não é mais pedido (pela LGPD, só guardamos o que o app usa).

import {
  supabase,
  aposEntrar,
  enderecoDoSite,
  perfilGuardado,
  guardarPerfil,
  limparDesteAparelho,
  encerrarSincronia,
  faltaCodigoDoSegundoFator,
  temSegundoFatorAtivo,
} from './nuvem.js';
import { usuarioAtualId, apagarSessao } from './armazenamento.js';

export const IDADE_MINIMA = 18;
export const SENHA_MINIMA = 8;

export const ESTADOS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA',
  'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

// ----- Ajudantes dos formulários -----
export const soNumeros = (texto) => String(texto || '').replace(/\D/g, '');

// 01001000 -> 01001-000
export function mascaraCEP(texto) {
  return soNumeros(texto).slice(0, 8).replace(/^(\d{5})(\d)/, '$1-$2');
}

export function emailValido(texto) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(texto).trim());
}

const limparEmail = (texto) => String(texto || '').trim().toLowerCase();

// Regras mostradas na tela de cadastro (cada uma vira um "check" verde quando cumprida)
export function regrasDaSenha(senha) {
  return [
    { texto: `Pelo menos ${SENHA_MINIMA} caracteres`, ok: senha.length >= SENHA_MINIMA },
    { texto: 'Uma letra', ok: /\p{L}/u.test(senha) },
    { texto: 'Um número', ok: /\d/.test(senha) },
  ];
}

function limparEndereco(e = {}) {
  return {
    cep: soNumeros(e.cep),
    rua: String(e.rua || '').trim(),
    numero: String(e.numero || '').trim(),
    complemento: String(e.complemento || '').trim(),
    bairro: String(e.bairro || '').trim(),
    cidade: String(e.cidade || '').trim(),
    uf: e.uf || '',
  };
}

// ----- Mensagens de erro do Supabase em português -----
export function traduzirErro(erro) {
  const codigo = erro?.code || '';
  const texto = String(erro?.message || '').toLowerCase();
  if (erro?.name === 'AuthRetryableFetchError' || texto.includes('failed to fetch') || texto.includes('network')) {
    return 'Sem conexão com a internet. Confira e tente de novo.';
  }
  const mensagens = {
    user_already_exists: 'Já existe uma conta com este e-mail.',
    email_exists: 'Já existe uma conta com este e-mail.',
    weak_password: `Senha fraca. Use pelo menos ${SENHA_MINIMA} caracteres, com letras e números.`,
    same_password: 'A nova senha precisa ser diferente da atual.',
    email_address_invalid: 'Este e-mail não parece certo. Ex.: nome@email.com',
    over_email_send_rate_limit: 'Muitos e-mails enviados em pouco tempo. Espere alguns minutos e tente de novo.',
    over_request_rate_limit: 'Muitas tentativas seguidas. Espere alguns minutos e tente de novo.',
    signup_disabled: 'O cadastro de novas contas está fechado no momento.',
    email_not_confirmed: 'Falta confirmar o seu e-mail. Abra o link que enviamos para a sua caixa de entrada.',
    invalid_credentials: 'E-mail ou senha incorretos.',
    user_not_found: 'Conta não encontrada.',
    mfa_verification_failed: 'Código incorreto. Confira no app autenticador e tente de novo.',
    mfa_challenge_expired: 'O código expirou. Digite o código que aparece agora no app.',
    mfa_factor_not_found: 'A verificação em duas etapas não está ativa nesta conta.',
    mfa_verified_factor_exists: 'A verificação em duas etapas já está ativa.',
    insufficient_aal: 'Confirme o código da verificação em duas etapas para continuar.',
  };
  if (mensagens[codigo]) return mensagens[codigo];
  if (texto.includes('limite_relatos')) return 'Você já enviou 10 relatos nas últimas 24 horas. Tente de novo amanhã ou fale com o atendimento.';
  if (texto.includes('limite_dados')) return 'Sua conta chegou ao limite de espaço. Fale com o atendimento da CIFRA.';
  if (texto.includes('already registered')) return mensagens.user_already_exists;
  if (texto.includes('rate limit')) return mensagens.over_request_rate_limit;
  return 'Não foi possível concluir agora. Tente de novo em instantes.';
}

// ----- Criar conta -----
// Devolve { precisaConfirmar: true } quando o Supabase pede para confirmar o e-mail antes de entrar.
export async function criarUsuario(dados) {
  const email = limparEmail(dados.email);
  const { data, error } = await supabase.auth.signUp({
    email,
    password: dados.senha,
    options: {
      emailRedirectTo: enderecoDoSite(),
      // Vão para a tabela "perfis" (um gatilho no banco copia na hora em que a conta nasce)
      data: {
        nome: dados.nome.trim(),
        sobrenome: dados.sobrenome.trim(),
        idade: Number(dados.idade),
        endereco: limparEndereco(dados.endereco),
        aceitou_termos_em: new Date().toISOString(),
      },
    },
  });
  if (error) throw new Error(traduzirErro(error));
  // Com a confirmação de e-mail ligada, um e-mail já cadastrado volta "sem identidades"
  if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    throw new Error('Já existe uma conta com este e-mail.');
  }
  if (!data.session) return { precisaConfirmar: true, email };
  await aposEntrar(data.session.user);
  return { precisaConfirmar: false, email };
}

export async function reenviarConfirmacao(email) {
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: limparEmail(email),
    options: { emailRedirectTo: enderecoDoSite() },
  });
  if (error) throw new Error(traduzirErro(error));
}

// ----- Entrar -----
// Devolve a pessoa se e-mail e senha conferem; null se estiverem errados.
// Lança erro (com mensagem pronta) quando falta confirmar o e-mail ou não há internet.
export async function entrarComUsuario(email, senha) {
  const { data, error } = await supabase.auth.signInWithPassword({ email: limparEmail(email), password: senha });
  if (error) {
    if (error.code === 'invalid_credentials' || /invalid login/i.test(error.message || '')) return null;
    const falha = new Error(traduzirErro(error));
    falha.codigo = error.code;
    throw falha;
  }
  // Conta com verificação em duas etapas: ainda falta o código do app autenticador
  if (await faltaCodigoDoSegundoFator()) return { ...data.user, precisaCodigo: true };
  await aposEntrar(data.user);
  return data.user;
}

// ----- Verificação em duas etapas (código de 6 números de um app autenticador) -----
async function fatorAtivo() {
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) throw new Error(traduzirErro(error));
  return data?.totp?.find((f) => f.status === 'verified') || null;
}

// Confere o código e "sobe" a sessão para o nível com 2FA (aal2)
async function verificarCodigo(codigo) {
  const fator = await fatorAtivo();
  if (!fator) throw new Error('A verificação em duas etapas não está ativa nesta conta.');
  const limpo = String(codigo || '').replace(/\D/g, '');
  if (limpo.length !== 6) throw new Error('O código tem 6 números.');
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: fator.id, code: limpo });
  if (error) throw new Error(traduzirErro(error));
}

// Segundo passo do login
export async function confirmarCodigoDoLogin(codigo) {
  await verificarCodigo(codigo);
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) throw new Error('Não foi possível entrar agora. Tente de novo.');
  await aposEntrar(data.user);
  return data.user;
}

// Desistiu no meio (entrou com a senha, mas não digitou o código)
export async function cancelarLoginComCodigo() {
  try {
    await supabase.auth.signOut({ scope: 'local' });
  } catch {
    /* sem internet */
  }
}

// Usado na tela "Criar senha nova" (link do e-mail) por quem tem 2FA
export { faltaCodigoDoSegundoFator, verificarCodigo as confirmarCodigo };

export async function temSessaoAberta() {
  const { data } = await supabase.auth.getSession();
  return Boolean(data?.session);
}

// Configurações: começar a ativar. Devolve o endereço para o QR code e a chave para digitar à mão.
export async function iniciarSegundoFator() {
  // Tentativas anteriores que não foram confirmadas atrapalham: tira antes
  const { data: lista } = await supabase.auth.mfa.listFactors();
  for (const f of (lista?.all || []).filter((x) => x.status !== 'verified')) {
    await supabase.auth.mfa.unenroll({ factorId: f.id });
  }
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'CIFRA', issuer: 'CIFRA' });
  if (error) throw new Error(traduzirErro(error));
  return { fatorId: data.id, uri: data.totp.uri, chave: data.totp.secret };
}

// Configurações: confirmar com o primeiro código (a partir daqui o 2FA vale)
export async function confirmarSegundoFator(fatorId, codigo) {
  const limpo = String(codigo || '').replace(/\D/g, '');
  if (limpo.length !== 6) throw new Error('O código tem 6 números.');
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: fatorId, code: limpo });
  if (error) throw new Error(traduzirErro(error));
  atualizarMarcaDoSegundoFator(true);
}

// Configurações: desligar (pede um código atual, para ninguém desligar só com o celular desbloqueado)
export async function desligarSegundoFator(codigo) {
  await verificarCodigo(codigo);
  const fator = await fatorAtivo();
  const { error } = await supabase.auth.mfa.unenroll({ factorId: fator.id });
  if (error) throw new Error(traduzirErro(error));
  atualizarMarcaDoSegundoFator(false);
}

function atualizarMarcaDoSegundoFator(ativo) {
  const atual = usuarioAtual();
  if (!atual) return;
  const { id, ...resto } = atual;
  guardarPerfil({ ...resto, doisFatores: ativo }, id);
}

export async function segundoFatorAtivo() {
  const ativo = await temSegundoFatorAtivo();
  atualizarMarcaDoSegundoFator(ativo);
  return ativo;
}

// ----- Esqueci minha senha -----
export async function pedirNovaSenha(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(limparEmail(email), { redirectTo: enderecoDoSite() });
  if (error) throw new Error(traduzirErro(error));
}

// Depois de abrir o link do e-mail (a pessoa já está logada pelo link)
export async function definirNovaSenha(novaSenha) {
  const { error } = await supabase.auth.updateUser({ password: novaSenha });
  if (error) throw new Error(traduzirErro(error));
}

// ----- Minha conta (tela de Configurações) -----
// A pessoa logada, lida da cópia guardada neste aparelho (atualizada a cada vez que o site abre)
export function usuarioAtual() {
  const id = usuarioAtualId();
  if (!id) return null;
  const perfil = perfilGuardado(id);
  if (perfil) return perfil;
  let nome = '';
  try {
    nome = localStorage.getItem(`cifra:u:${id}:usuario`) || '';
  } catch {
    nome = '';
  }
  return { id, nome, sobrenome: '', email: '', endereco: {} };
}

// Muda nome, sobrenome e endereço (tabela "perfis") e, se mudou, o e-mail (precisa confirmar pelo link).
// Devolve { usuario, emailPendente }.
export async function atualizarUsuario(dados) {
  const atual = usuarioAtual();
  const id = usuarioAtualId();
  if (!atual || !id) throw new Error('Conta não encontrada.');
  const mudancas = {
    nome: dados.nome.trim(),
    sobrenome: dados.sobrenome.trim(),
    endereco: limparEndereco(dados.endereco),
    atualizado_em: new Date().toISOString(),
  };
  const { error } = await supabase.from('perfis').update(mudancas).eq('id', id);
  if (error) throw new Error(traduzirErro(error));

  const email = limparEmail(dados.email);
  let emailPendente = false;
  if (email && email !== atual.email) {
    const resposta = await supabase.auth.updateUser({ email }, { emailRedirectTo: enderecoDoSite() });
    if (resposta.error) throw new Error(traduzirErro(resposta.error));
    emailPendente = true;
  }
  const { atualizado_em: _, ...semData } = mudancas;
  const novo = { ...atual, ...semData, emailNovo: emailPendente ? email : atual.emailNovo || '' };
  delete novo.id;
  guardarPerfil(novo, id);
  return { usuario: { ...novo, id }, emailPendente };
}

// Confere a senha de quem está logado (para trocar a senha ou excluir a conta).
// Entrar de novo com a senha "desce" a sessão para o nível sem 2FA; por isso, quem tem 2FA
// também digita o código, que sobe a sessão de volta.
async function senhaConfere(senha, codigo) {
  const atual = usuarioAtual();
  if (!atual?.email) return false;
  const { error } = await supabase.auth.signInWithPassword({ email: atual.email, password: senha });
  if (!error) {
    if (await faltaCodigoDoSegundoFator()) await verificarCodigo(codigo);
    return true;
  }
  if (error.code === 'invalid_credentials' || /invalid login/i.test(error.message || '')) return false;
  throw new Error(traduzirErro(error));
}

// Troca a senha (precisa da senha atual). Devolve false se a senha atual estiver errada.
export async function trocarSenha(senhaAtual, novaSenha, codigo) {
  if (!(await senhaConfere(senhaAtual, codigo))) return false;
  const { error } = await supabase.auth.updateUser({ password: novaSenha });
  if (error) throw new Error(traduzirErro(error));
  return true;
}

// Exclui a conta e TODAS as informações dela (precisa da senha). LGPD: direito de apagar tudo.
// Devolve false se a senha estiver errada.
export async function excluirUsuario(senha, codigo) {
  if (!(await senhaConfere(senha, codigo))) return false;
  const id = usuarioAtualId();
  // 1) Arquivos dos comprovantes (o banco não apaga arquivos sozinho)
  const { apagarArquivosDaConta } = await import('./comprovantes.js');
  await apagarArquivosDaConta(id);
  // 2) A conta: perfil e dados saem junto (função excluir_minha_conta no banco)
  const { error } = await supabase.rpc('excluir_minha_conta');
  if (error) throw new Error(traduzirErro(error));
  // 3) Este aparelho
  encerrarSincronia();
  try {
    await supabase.auth.signOut({ scope: 'local' });
  } catch {
    /* a conta já não existe */
  }
  apagarSessao();
  await limparDesteAparelho(id);
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
