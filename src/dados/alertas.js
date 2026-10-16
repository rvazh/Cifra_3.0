// ===== Alertas de vencimento =====
// Roda sozinho em segundo plano enquanto a CIFRA está aberta.
// Para cada conta a pagar, dispara 2 avisos: 3 dias antes e 1 dia antes do vencimento.
// Cada aviso só é disparado uma vez (fica anotado neste aparelho).
import { chave } from './armazenamento.js';

import { carregar, lancamentosDoMes, dataDeHoje, mudarMes, diasAte, dataCurta, mesFinanceiro } from './lancamentos.js';
import { carregarPreferencias, valoresEscondidos } from './preferencias.js';
import { resumoParaAvisar, anotarResumoAvisado, frasesDoResumo } from './resumo.js';
import { situacaoDosOrcamentos, porcentagemDeAviso } from './orcamentos.js';
import { carregarReceber, situacaoDaDivida } from './receber.js';
import { carregarPagar, situacaoDaDivida as situacaoDoPagar } from './pagar.js';

const CHAVE_DISPARADOS = () => chave('alertas');
export const ANTECEDENCIAS = [3, 1]; // dias antes do vencimento

function lerDisparados() {
  try {
    return JSON.parse(localStorage.getItem(CHAVE_DISPARADOS()) || '[]');
  } catch {
    return [];
  }
}

function anotarDisparado(chave) {
  const lista = [...lerDisparados(), chave].slice(-400); // guarda só os mais recentes
  try {
    localStorage.setItem(CHAVE_DISPARADOS(), JSON.stringify(lista));
  } catch {
    /* sem acesso ao armazenamento */
  }
}

// Quais avisos precisam sair agora
export function alertasParaDisparar(lista = carregar()) {
  const mes = dataDeHoje().slice(0, 7);
  const ja = new Set(lerDisparados());
  const alertas = [];

  [...lancamentosDoMes(lista, mes), ...lancamentosDoMes(lista, mudarMes(mes, 1))]
    .filter((l) => l.valor < 0 && !l.pago && !l.transferencia)
    .filter((l) => !l.exemplo && !String(l.origem || '').startsWith('exemplo')) // não avisa dos exemplos
    .forEach((l) => {
      const faltam = diasAte(l.data);
      if (faltam < 0) return; // já venceu: o aviso de atrasadas fica no Painel
      // Aviso de 1 dia (vale para "amanhã" e "hoje") ou de 3 dias (vale de 3 até 2 dias antes)
      const antecedencia = faltam <= 1 ? 1 : faltam <= 3 ? 3 : null;
      if (!antecedencia) return;
      const chave = `${l.origem || l.id}|${l.data}|${antecedencia}`;
      if (ja.has(chave)) return;
      alertas.push({ chave, lancamento: l, faltam });
    });

  return alertas;
}

function textoDoPrazo(faltam) {
  if (faltam === 0) return 'vence hoje';
  if (faltam === 1) return 'vence amanhã';
  return `vence em ${faltam} dias`;
}

export function textoDoAlerta({ lancamento: l, faltam }) {
  const valor = valoresEscondidos()
    ? ''
    : ` · ${Math.abs(l.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`;
  return {
    titulo: `${l.descricao} ${textoDoPrazo(faltam)}`,
    corpo: `Vencimento em ${dataCurta(l.data)}${valor} · ${l.conta}`,
  };
}

// Avisa o sistema de alertas que algo mudou (ex.: evento novo no calendário)
export function conferirAlertasAgora() {
  setTimeout(() => window.dispatchEvent(new Event('cifra:conferir-alertas')), 100);
}

// ----- Notificação do navegador -----
export function podeNotificar() {
  return typeof Notification !== 'undefined' && Notification.permission === 'granted';
}

// Pede permissão para mostrar notificações (o navegador só pergunta uma vez)
export function pedirPermissaoDeAviso() {
  try {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  } catch {
    /* navegador sem notificações */
  }
}

async function mostrarNotificacao(titulo, corpo, url = './#/painel/calendario') {
  const opcoes = { body: corpo, icon: './favicon.png', tag: titulo, data: { url } };
  // No celular (Android) a notificação precisa sair pelo service worker
  try {
    const registro = await navigator.serviceWorker?.getRegistration();
    if (registro) {
      await registro.showNotification(`CIFRA · ${titulo}`, opcoes);
      return true;
    }
  } catch {
    /* tenta o jeito simples abaixo */
  }
  try {
    new Notification(`CIFRA · ${titulo}`, opcoes); // eslint-disable-line no-new
    return true;
  } catch {
    return false;
  }
}

// Confere e dispara. "mostrarNaTela" é usado quando o navegador não deixa notificar.
export async function verificarAlertas(mostrarNaTela) {
  // Avisos de vencimento (podem ser desligados nas Configurações)
  const alertas = carregarPreferencias().avisarContas ? alertasParaDisparar() : [];
  // Anota antes de mostrar, para o mesmo aviso nunca sair duas vezes
  alertas.forEach((alerta) => anotarDisparado(alerta.chave));
  for (const alerta of alertas) {
    const { titulo, corpo } = textoDoAlerta(alerta);
    const foi = podeNotificar() && (await mostrarNotificacao(titulo, corpo));
    if (!foi && mostrarNaTela) mostrarNaTela({ id: alerta.chave, titulo, corpo });
  }
  await verificarResumo(mostrarNaTela);
  await verificarLembreteSemanal(mostrarNaTela);
  await verificarOrcamentos(mostrarNaTela);
  await verificarReceber(mostrarNaTela);
  await verificarPagar(mostrarNaTela);
}

// No dia em que o mês começa: avisa que o resumo do mês anterior está pronto para mandar no WhatsApp
export async function verificarResumo(mostrarNaTela) {
  const r = resumoParaAvisar();
  if (!r) return;
  anotarResumoAvisado(r.mes); // anota antes, para não avisar duas vezes
  const [primeira, segunda] = frasesDoResumo(r);
  const titulo = 'Seu resumo do mês está pronto';
  const corpo = valoresEscondidos() ? 'Abra os Relatórios para ver e enviar no WhatsApp.' : `${primeira} ${segunda || ''}`.trim();
  const foi = podeNotificar() && (await mostrarNotificacao(titulo, corpo, './#/painel/relatorios'));
  if (!foi && mostrarNaTela) mostrarNaTela({ id: `resumo-${r.mes}`, titulo, corpo, para: '/painel/relatorios', textoLink: 'Ver resumo e enviar' });
}

// ----- Lembrete semanal: atualizar os valores importando o extrato -----
// Sai na segunda-feira. Se a CIFRA só for aberta mais tarde na semana, sai nessa primeira abertura.
// (Sem servidor, o aviso só aparece com a CIFRA aberta no navegador.)
function segundaDaSemana(data = new Date()) {
  const d = new Date(data.getFullYear(), data.getMonth(), data.getDate());
  const voltar = (d.getDay() + 6) % 7; // segunda = 0, domingo = 6
  d.setDate(d.getDate() - voltar);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export async function verificarLembreteSemanal(mostrarNaTela) {
  if (!carregarPreferencias().lembreteSemanal) return;
  const marca = `semanal|${segundaDaSemana()}`;
  if (lerDisparados().includes(marca)) return;
  anotarDisparado(marca); // anota antes, para sair só uma vez por semana
  const titulo = 'Hora de atualizar a CIFRA';
  const corpo = 'Baixe o extrato do banco (OFX ou CSV) e importe em Contas para deixar os valores em dia.';
  const foi = podeNotificar() && (await mostrarNotificacao(titulo, corpo, './#/painel/contas'));
  if (!foi && mostrarNaTela) mostrarNaTela({ id: marca, titulo, corpo, para: '/painel/contas', textoLink: 'Importar extrato' });
}

// ----- Orçamento por categoria -----
// Avisa uma vez por mês e por categoria ao chegar na % escolhida e de novo ao passar do limite.
export async function verificarOrcamentos(mostrarNaTela) {
  const situacoes = situacaoDosOrcamentos();
  if (!situacoes.length) return;
  const mes = mesFinanceiro(dataDeHoje());
  const aviso = porcentagemDeAviso();
  const reais = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  for (const s of situacoes) {
    if (s.estado === 'ok') continue;
    const nivel = s.estado === 'estourou' ? 100 : aviso;
    const marca = `orc|${mes}|${s.nome}|${nivel}`;
    if (lerDisparados().includes(marca)) continue; // lê de novo: pode ter saído agora em outra conferência
    anotarDisparado(marca);
    const titulo = s.estado === 'estourou' ? `${s.nome}: orçamento estourado` : `${s.nome}: ${Math.floor(s.parte)}% do orçamento`;
    const corpo = valoresEscondidos()
      ? 'Abra o painel para ver o orçamento do mês.'
      : s.estado === 'estourou'
        ? `Você já gastou ${reais(s.gasto)} de ${reais(s.limite)} neste mês (${reais(-s.falta)} acima).`
        : `Você já gastou ${reais(s.gasto)} de ${reais(s.limite)}. Restam ${reais(s.falta)} para o mês.`;
    const foi = podeNotificar() && (await mostrarNotificacao(titulo, corpo, './#/painel'));
    if (!foi && mostrarNaTela) mostrarNaTela({ id: marca, titulo, corpo, para: '/painel', textoLink: 'Ver orçamento do mês' });
  }
}

// ----- A receber: parcela que alguém te deve vence hoje (ou já venceu) -----
// Um aviso por parcela. Usa a mesma chave de "Avisar contas a vencer" das Configurações.
export async function verificarReceber(mostrarNaTela) {
  if (!carregarPreferencias().avisarContas) return;
  const reais = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  for (const d of carregarReceber()) {
    const s = situacaoDaDivida(d);
    const p = s.proxima;
    if (!p?.vence || p.dias > 0) continue;
    const marca = `rcb|${d.id}|${p.numero}|${p.vence}`;
    if (lerDisparados().includes(marca)) continue;
    anotarDisparado(marca);
    const parcela = s.parcelas > 1 ? `a parcela ${p.numero}/${s.parcelas}` : 'o pagamento';
    const titulo = p.dias === 0 ? `${d.pessoa}: ${parcela} vence hoje` : `${d.pessoa} está com ${parcela} atrasada`;
    const corpo = valoresEscondidos() ? 'Abra "A receber" para ver.' : `${reais(p.valor)} a receber${d.motivo ? ` · ${d.motivo}` : ''}. Faltam ${reais(s.falta)} no total.`;
    const foi = podeNotificar() && (await mostrarNotificacao(titulo, corpo, './#/painel/receber'));
    if (!foi && mostrarNaTela) mostrarNaTela({ id: marca, titulo, corpo, para: '/painel/receber', textoLink: 'Ver a receber' });
  }
}

// ----- A pagar: parcela das suas dívidas vencendo -----
// Avisa com a antecedência escolhida em "Aviso no painel com" (padrão 3 dias), no dia e se atrasar. Um aviso de cada.
export async function verificarPagar(mostrarNaTela) {
  const preferencias = carregarPreferencias();
  if (!preferencias.avisarContas) return;
  const antes = preferencias.diasDeAviso || 3;
  const reais = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  for (const d of carregarPagar()) {
    const s = situacaoDoPagar(d);
    const p = s.proxima;
    if (!p?.vence || p.dias > antes) continue;
    const fase = p.dias < 0 ? 'atrasada' : p.dias === 0 ? 'hoje' : 'antes';
    const marca = `pgr|${d.id}|${p.numero}|${p.vence}|${fase}`;
    if (lerDisparados().includes(marca)) continue;
    anotarDisparado(marca);
    const parcela = s.parcelas > 1 ? `Parcela ${p.numero}/${s.parcelas}` : 'Pagamento';
    const titulo =
      fase === 'atrasada' ? `${parcela} para ${d.pessoa} está atrasada` : fase === 'hoje' ? `${parcela} para ${d.pessoa} vence hoje` : `${parcela} para ${d.pessoa} vence em ${p.dias} ${p.dias === 1 ? 'dia' : 'dias'}`;
    const valor = p.atrasada && s.jurosAbertos > 0 ? p.comJuros : p.valor;
    const corpo = valoresEscondidos() ? 'Abra "A pagar" para ver.' : `${reais(valor)}${p.atrasada && s.jurosAbertos > 0 ? ' já com juros' : ''}${d.motivo ? ` · ${d.motivo}` : ''}.`;
    const foi = podeNotificar() && (await mostrarNotificacao(titulo, corpo, './#/painel/pagar'));
    if (!foi && mostrarNaTela) mostrarNaTela({ id: marca, titulo, corpo, para: '/painel/pagar', textoLink: 'Ver a pagar' });
  }
}
