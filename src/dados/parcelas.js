// ===== Parcelas de "A receber" e "A pagar" no Calendário e no Checklist =====
// Cada dívida (sua ou de alguém com você) com data de vencimento aparece mês a mês, parcela por parcela.
// Daqui dá para registrar o pagamento/recebimento da parcela e mudar o dia em que ela vence.
import { dataDeHoje } from './lancamentos.js';
import { carregarContas, ehCartao } from './contas.js';
import {
  carregarReceber,
  salvarReceber,
  situacaoDaDivida as situacaoReceber,
  registrarRecebimento,
  vencimentoDaParcela,
  valoresDasParcelas,
  somarMeses,
} from './receber.js';
import { carregarPagar, salvarPagar, situacaoDaDivida as situacaoPagar, registrarPagamento } from './pagar.js';

const centavos = (n) => Math.round(n * 100) / 100;

// A dívida aparece no Calendário/Checklist? (ligado por padrão; precisa ter data de vencimento)
export const vaiProCalendario = (d) => d.noCalendario !== false && Boolean(d.primeiroVencimento);

// Todas as parcelas de uma dívida, com o que falta de cada uma
function parcelasDe(d, tipo) {
  const s = tipo === 'receber' ? situacaoReceber(d) : situacaoPagar(d);
  const valores = valoresDasParcelas(d);
  let coberto = s.recebido; // quanto do valor original já foi pago (sem juros), da 1ª parcela em diante
  return valores.map((valor, i) => {
    const numero = i + 1;
    const pagoDela = Math.min(valor, Math.max(0, coberto));
    coberto -= valor;
    const falta = centavos(valor - pagoDela);
    const vence = vencimentoDaParcela(d, numero);
    const proxima = !s.quitada && s.proxima?.numero === numero;
    const estado = falta < 0.005 ? 'paga' : pagoDela > 0.004 ? 'parcial' : 'aberta';
    return {
      chave: `${tipo}-${d.id}-${numero}`,
      tipo,
      divida: d,
      numero,
      total: s.parcelas,
      vence,
      valor,
      falta,
      // Na próxima parcela atrasada, os juros acumulados entram junto
      aPagarAgora: proxima && s.jurosAbertos > 0 ? centavos(falta + s.jurosAbertos) : falta,
      juros: proxima ? s.jurosAbertos : 0,
      estado,
      proxima,
      atrasada: estado !== 'paga' && vence < dataDeHoje(),
      ajustada: Boolean(d.datasAjustadas?.[numero]),
    };
  });
}

function todasAsParcelas() {
  return [
    ...carregarReceber().filter(vaiProCalendario).flatMap((d) => parcelasDe(d, 'receber')),
    ...carregarPagar().filter(vaiProCalendario).flatMap((d) => parcelasDe(d, 'pagar')),
  ];
}

// Parcelas que vencem num mês ("2026-10")
export function parcelasDoMes(mes) {
  return todasAsParcelas()
    .filter((p) => p.vence.slice(0, 7) === mes)
    .sort((a, b) => a.vence.localeCompare(b.vence));
}

// Parcelas em aberto até "dias" à frente (as atrasadas também)
export function parcelasProximas(dias = 30, tipo = null) {
  const limite = dataDeHoje();
  const [a, m, d] = limite.split('-').map(Number);
  const ate = new Date(a, m - 1, d + dias).toISOString().slice(0, 10);
  return todasAsParcelas()
    .filter((p) => p.estado !== 'paga' && p.vence <= ate && (!tipo || p.tipo === tipo))
    .sort((x, y) => x.vence.localeCompare(y.vence));
}

// Conta sugerida para pagar/receber: a ligada à dívida, senão a primeira conta (cartão não entra)
export function contasParaParcela() {
  return carregarContas()
    .filter((c) => !ehCartao(c))
    .map((c) => c.nome);
}

export function contaSugerida(p, contas = contasParaParcela()) {
  const ligada = p.tipo === 'receber' ? p.divida.contaSaida : p.divida.contaEntrada;
  return ligada && contas.includes(ligada) ? ligada : contas[0] || '';
}

// Registra o pagamento (A pagar) ou o recebimento (A receber) de uma parcela
export function registrarParcela(p, { valor, conta, data = dataDeHoje() }) {
  if (p.tipo === 'receber') {
    const lista = carregarReceber();
    const d = lista.find((x) => x.id === p.divida.id);
    if (!d) return null;
    const nova = registrarRecebimento(d, { valor, data, conta });
    salvarReceber(lista.map((x) => (x.id === d.id ? nova : x)));
    return nova;
  }
  const lista = carregarPagar();
  const d = lista.find((x) => x.id === p.divida.id);
  if (!d) return null;
  const nova = registrarPagamento(d, { valor, data, conta });
  salvarPagar(lista.map((x) => (x.id === d.id ? nova : x)));
  return nova;
}

// Muda o dia de vencimento de UMA parcela (as outras continuam como estão)
export function mudarDataDaParcela(p, novaData) {
  const carregarLista = p.tipo === 'receber' ? carregarReceber : carregarPagar;
  const salvarLista = p.tipo === 'receber' ? salvarReceber : salvarPagar;
  salvarLista(
    carregarLista().map((d) => {
      if (d.id !== p.divida.id) return d;
      const datas = { ...(d.datasAjustadas || {}) };
      const padrao = somarMeses(d.primeiroVencimento, p.numero - 1);
      if (!novaData || novaData === padrao) delete datas[p.numero];
      else datas[p.numero] = novaData;
      return { ...d, datasAjustadas: datas };
    })
  );
}

// Para o resumo do Calendário: o que ainda falta entrar e sair no mês
export function totaisDasParcelas(mes) {
  const doMes = parcelasDoMes(mes).filter((p) => p.estado !== 'paga');
  const soma = (tipo) => centavos(doMes.filter((p) => p.tipo === tipo).reduce((t, p) => t + p.aPagarAgora, 0));
  return { aReceber: soma('receber'), aPagar: soma('pagar') };
}
