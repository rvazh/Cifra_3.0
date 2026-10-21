// ===== Previsão dos próximos meses (Painel) =====
// Para cada mês à frente, soma o que já se sabe hoje:
//   ganhos  -> receitas lançadas para o futuro e as fixas que se repetem (salário...)
//   fixas   -> contas fixas que saem de conta corrente/carteira (aluguel, luz...)
//   cartao  -> faturas do cartão de crédito: compras parceladas e fixas no cartão, no mês em que a fatura VENCE
//   parcelas-> outros gastos já lançados para aquele mês (parcelados fora do cartão)
//              + parcelas das dívidas de "A pagar"
// Transferências (ex.: pagar a fatura) ficam de fora, para não contar o mesmo dinheiro duas vezes.
import { lancamentosDoMes, mesFinanceiro, mudarMes } from './lancamentos.js';
import { ehCartao, faturaDaCompra } from './contas.js';
import { parcelasAPagarAte } from './parcelas.js';

const centavos = (n) => Math.round(n * 100) / 100;
const ehFixa = (l) => Boolean(l.repete || l.previsto || l.origem);

export function previsaoDosMeses({ lista, contas, mesAtual, quantos = 6, inicio = 1, saldoInicial = 0 }) {
  const cartoes = Object.fromEntries(contas.filter(ehCartao).map((c) => [c.nome, c]));
  const meses = Array.from({ length: quantos }, (_, i) => mudarMes(mesAtual, i + 1));
  let saldo = saldoInicial;

  return meses.map((mes) => {
    const doMes = lancamentosDoMes(lista, mes, inicio).filter((l) => !l.transferencia);
    const foraDoCartao = doMes.filter((l) => !cartoes[l.conta]);

    const ganhos = foraDoCartao.filter((l) => l.valor > 0).reduce((s, l) => s + l.valor, 0);
    const fixas = foraDoCartao.filter((l) => l.valor < 0 && ehFixa(l)).reduce((s, l) => s - l.valor, 0);
    const lancadas = foraDoCartao.filter((l) => l.valor < 0 && !ehFixa(l)).reduce((s, l) => s - l.valor, 0);

    // Fatura do cartão que vence neste mês: compras dos 2 meses anteriores e deste (sem repetir)
    const vistos = new Set();
    let cartao = 0;
    [mudarMes(mes, -2), mudarMes(mes, -1), mes].forEach((m) => {
      lancamentosDoMes(lista, m, 1)
        .filter((l) => cartoes[l.conta] && !l.transferencia && !vistos.has(l.id))
        .forEach((l) => {
          vistos.add(l.id);
          const c = cartoes[l.conta];
          const fechamento = Number(c.fechamento) || 0;
          const vencimento = Number(c.vencimento) || 0;
          const mesDaFatura =
            fechamento && vencimento ? faturaDaCompra(l.data, fechamento, vencimento).chave : mesFinanceiro(l.data, inicio);
          if (mesDaFatura === mes) cartao -= l.valor; // compra soma, estorno desconta
        });
    });
    cartao = Math.max(cartao, 0);

    const dividas = parcelasAPagarAte(mes)
      .filter((p) => mesFinanceiro(p.vence, inicio) === mes)
      .reduce((s, p) => s + p.aPagarAgora, 0);

    const parcelas = lancadas + dividas;
    const gastos = fixas + cartao + parcelas;
    const sobra = ganhos - gastos;
    saldo += sobra;

    return {
      mes,
      ganhos: centavos(ganhos),
      fixas: centavos(fixas),
      cartao: centavos(cartao),
      parcelas: centavos(parcelas),
      gastos: centavos(gastos),
      sobra: centavos(sobra),
      saldo: centavos(saldo),
    };
  });
}
