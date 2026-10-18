// ===== Relatar problema / dar sugestão =====
// O relato vai para a tabela "relatos" do Supabase. Quem está logado só consegue ENVIAR
// (não lê o de ninguém). O dono da CIFRA lê pelo painel do Supabase: Table Editor → relatos.

import { supabase } from './nuvem.js';
import { traduzirErro } from './usuarios.js';

export const VERSAO_DO_APP = '1.1';

export const TIPOS_DE_RELATO = [
  { id: 'problema', texto: 'Algo deu errado' },
  { id: 'sugestao', texto: 'Tenho uma sugestão' },
  { id: 'outro', texto: 'Outro assunto' },
];

// Navegador, sistema e tamanho da tela: ajuda a repetir o problema (não identifica a pessoa)
export function infoDoAparelho() {
  const app = window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone ? 'app instalado' : 'navegador';
  return `${navigator.userAgent} · tela ${window.innerWidth}x${window.innerHeight} · ${app}`.slice(0, 500);
}

export async function enviarRelato({ tipo, mensagem, tela, incluirAparelho = true, contato = '' }) {
  const texto = String(mensagem || '').trim();
  if (texto.length < 5) throw new Error('Conte um pouco mais (pelo menos 5 letras).');
  const { error } = await supabase.from('relatos').insert({
    tipo,
    mensagem: texto.slice(0, 4000),
    tela: String(tela || '').slice(0, 200),
    aparelho: incluirAparelho ? infoDoAparelho() : null,
    versao: VERSAO_DO_APP,
    contato: String(contato || '').trim().slice(0, 200) || null,
  });
  if (error) throw new Error(traduzirErro(error));
}
