// ===== Acesso (login) =====
// O login de verdade (e-mail e senha) é feito pelo Supabase: veja nuvem.js e usuarios.js.
// Aqui ficam só os atalhos usados pelas telas.
// (O antigo acesso de teste com usuário e senha fixos foi removido.)

import { temSessao } from './armazenamento.js';
import { sairDaConta } from './nuvem.js';

// Tem alguém logado neste aparelho?
export function estaLogado() {
  return temSessao();
}

// Sai da conta: envia o que falta para a nuvem, encerra o login e limpa os dados deste aparelho
export async function encerrarSessao() {
  await sairDaConta();
}

// Troca de tela recarregando a página (limpa o que ficou na memória da pessoa anterior)
export function irPara(rota) {
  window.location.hash = `#${rota}`;
  window.location.reload();
}
