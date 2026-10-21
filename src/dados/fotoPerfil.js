// ===== Foto de perfil =====
// A foto é reduzida para 256 x 256 (recorte quadrado no meio) e guardada na chave "foto-perfil",
// que sobe para a nuvem com os outros dados da pessoa.
// No cadastro a conta ainda não está aberta: a foto fica esperando neste aparelho e é colocada
// na conta no primeiro login com o mesmo e-mail.
import { chave } from './armazenamento.js';

const CHAVE = () => chave('foto-perfil');
const CHAVE_DO_CADASTRO = 'cifra-foto-cadastro';
const LADO = 256;

export function fotoDePerfil() {
  try {
    return localStorage.getItem(CHAVE()) || '';
  } catch {
    return '';
  }
}

export function salvarFotoDePerfil(dados) {
  try {
    localStorage.setItem(CHAVE(), dados);
    window.dispatchEvent(new CustomEvent('cifra:foto-perfil'));
    return true;
  } catch {
    return false;
  }
}

export function apagarFotoDePerfil() {
  try {
    localStorage.removeItem(CHAVE());
    window.dispatchEvent(new CustomEvent('cifra:foto-perfil'));
  } catch {
    /* sem acesso */
  }
}

// Arquivo escolhido -> imagem quadrada pequena (data URL JPEG)
export function prepararFoto(arquivo) {
  return new Promise((resolve, reject) => {
    if (!arquivo || !/^image\/(jpeg|png|webp|gif)$/.test(arquivo.type)) {
      reject(new Error('Escolha uma foto JPG, PNG ou WEBP.'));
      return;
    }
    if (arquivo.size > 15 * 1024 * 1024) {
      reject(new Error('A foto pode ter no máximo 15 MB.'));
      return;
    }
    const url = URL.createObjectURL(arquivo);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const lado = Math.min(img.width, img.height);
      const tela = document.createElement('canvas');
      tela.width = LADO;
      tela.height = LADO;
      tela.getContext('2d').drawImage(img, (img.width - lado) / 2, (img.height - lado) / 2, lado, lado, 0, 0, LADO, LADO);
      resolve(tela.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Não foi possível abrir essa imagem.'));
    };
    img.src = url;
  });
}

// ----- Foto escolhida no cadastro -----
export function guardarFotoDoCadastro(email, dados) {
  try {
    localStorage.setItem(CHAVE_DO_CADASTRO, JSON.stringify({ email: String(email).trim().toLowerCase(), dados }));
  } catch {
    /* sem espaço: a pessoa coloca a foto depois em Configurações */
  }
}

// Chamado ao entrar na conta (nuvem.js): se a foto do cadastro é deste e-mail, ela vai para a conta
export function aplicarFotoDoCadastro(email) {
  try {
    const pendente = JSON.parse(localStorage.getItem(CHAVE_DO_CADASTRO) || 'null');
    if (!pendente) return;
    if (pendente.email === String(email || '').trim().toLowerCase() && !fotoDePerfil()) salvarFotoDePerfil(pendente.dados);
    localStorage.removeItem(CHAVE_DO_CADASTRO);
  } catch {
    /* sem acesso */
  }
}
