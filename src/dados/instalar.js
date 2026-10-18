// ===== Instalar a CIFRA como app (PWA) =====
// No Android e no computador (Chrome, Edge, Samsung Internet), o navegador avisa que o site pode ser
// instalado com o evento "beforeinstallprompt". Guardamos esse aviso para o botão "Instalar" usar depois.
// No iPhone não existe esse evento: a pessoa instala pelo Safari (Compartilhar → Adicionar à Tela de Início).

let convite = null; // o aviso guardado do navegador
let instalado = false;

const avisar = () => window.dispatchEvent(new CustomEvent('cifra:instalacao'));

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (evento) => {
    evento.preventDefault(); // não mostra a faixa automática; o convite fica para o nosso botão
    convite = evento;
    avisar();
  });
  window.addEventListener('appinstalled', () => {
    instalado = true;
    convite = null;
    avisar();
  });
}

// Está abrindo como app instalado (sem a barra do navegador)?
export function abertoComoApp() {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator.standalone === true // Safari do iPhone
  );
}

// A pessoa acabou de instalar (nesta visita)?
export const acabouDeInstalar = () => instalado;

// Dá para mostrar o botão "Instalar" (o navegador ofereceu)?
export const podeInstalar = () => Boolean(convite);

// Abre a janela de instalação do navegador. Devolve 'aceitou', 'recusou' ou 'indisponivel'.
export async function instalarApp() {
  if (!convite) return 'indisponivel';
  const atual = convite;
  convite = null;
  await atual.prompt();
  const { outcome } = await atual.userChoice;
  if (outcome === 'accepted') instalado = true;
  avisar();
  return outcome === 'accepted' ? 'aceitou' : 'recusou';
}

// Qual passo a passo mostrar primeiro: 'iphone' | 'android' | 'computador'
export function aparelhoAtual() {
  const ua = navigator.userAgent || '';
  const ipad = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1; // iPad novo se apresenta como Mac
  if (/iPhone|iPad|iPod/.test(ua) || ipad) return 'iphone';
  if (/Android/.test(ua)) return 'android';
  return 'computador';
}
