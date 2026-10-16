// ===== Orçamento por categoria =====
// A pessoa define um limite por mês para cada categoria de gasto (ex.: Alimentação R$ 800).
// Quando o gasto do mês chega na porcentagem escolhida nas Configurações (padrão 80%), a CIFRA avisa;
// ao passar de 100%, avisa de novo.
import { chave } from './armazenamento.js';
import { carregar, dataDeHoje, lancamentosDoMes, mesFinanceiro, categoria } from './lancamentos.js';
import { carregarPreferencias, inicioDoMes } from './preferencias.js';

const CHAVE = () => chave('orcamentos');
export const AVISOS_POSSIVEIS = [50, 60, 70, 75, 80, 85, 90, 95];

// { "Alimentação": 800, "Lazer": 300 }
export function carregarOrcamentos() {
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE()) || '{}');
    return salvo && typeof salvo === 'object' ? salvo : {};
  } catch {
    return {};
  }
}

export function salvarOrcamentos(orcamentos) {
  const limpo = Object.fromEntries(Object.entries(orcamentos).filter(([, v]) => Number(v) > 0).map(([k, v]) => [k, Math.round(Number(v) * 100) / 100]));
  try {
    localStorage.setItem(CHAVE(), JSON.stringify(limpo));
  } catch {
    /* sem acesso ao armazenamento */
  }
  return limpo;
}

export function porcentagemDeAviso() {
  const p = Number(carregarPreferencias().avisoOrcamento);
  return p > 0 && p < 100 ? p : 80;
}

// Situação de cada categoria com limite no mês financeiro: gasto, quanto falta, % usado
// Conta tudo o que é gasto da categoria no mês (pago ou ainda a pagar, inclusive contas fixas previstas).
export function situacaoDosOrcamentos(lista = carregar(), mes = mesFinanceiro(dataDeHoje())) {
  const orcamentos = carregarOrcamentos();
  const aviso = porcentagemDeAviso();
  const gastos = {};
  lancamentosDoMes(lista, mes, inicioDoMes())
    .filter((l) => l.valor < 0 && !l.transferencia)
    .forEach((l) => {
      gastos[l.categoria] = (gastos[l.categoria] || 0) - l.valor;
    });
  return Object.entries(orcamentos)
    .map(([nome, limite]) => {
      const gasto = Math.round((gastos[nome] || 0) * 100) / 100;
      const parte = limite > 0 ? (gasto / limite) * 100 : 0;
      return {
        nome,
        cat: categoria(nome),
        limite,
        gasto,
        falta: limite - gasto,
        parte,
        estado: gasto > limite + 0.004 ? 'estourou' : parte >= aviso ? 'atencao' : 'ok', // no limite exato ainda não estourou
      };
    })
    .sort((a, b) => b.parte - a.parte);
}
