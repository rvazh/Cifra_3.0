// ===== Objetivos: dinheiro separado para um sonho ou uma meta =====
// Tudo fica salvo só neste aparelho (localStorage do navegador).
import { chave } from './armazenamento.js';
import { dataDeHoje, novoId, TRANSFERENCIA } from './lancamentos.js';

const CHAVE = () => chave('objetivos');

// Ícones que a pessoa pode escolher para cada objetivo
export const ICONES = ['✈️', '🛟', '💻', '🏠', '🚗', '🎓', '💍', '🎁', '📱', '🌱'];

export function carregarObjetivos() {
  try {
    const salvo = localStorage.getItem(CHAVE());
    if (salvo) return JSON.parse(salvo).filter((o) => !o.exemplo); // tira os exemplos de versões antigas
  } catch {
    /* sem acesso ao armazenamento */
  }
  return []; // usuário novo: nenhum objetivo ainda
}

export function salvarObjetivos(lista) {
  try {
    localStorage.setItem(CHAVE(), JSON.stringify(lista));
  } catch {
    /* sem acesso ao armazenamento: os dados ficam só até fechar a página */
  }
}

// Quantos meses faltam até o prazo ("2027-07"), contando o mês atual
export function mesesAte(prazo) {
  const [ano, mes] = dataDeHoje().slice(0, 7).split('-').map(Number);
  const [anoFim, mesFim] = prazo.split('-').map(Number);
  return (anoFim - ano) * 12 + (mesFim - mes) + 1;
}

// "2027-07" -> "jul/2027"
export function prazoCurto(prazo) {
  const [ano, mes] = prazo.split('-').map(Number);
  const nome = new Date(ano, mes - 1, 1).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
  return `${nome}/${ano}`;
}

// Situação do objetivo, em uma frase simples
export function situacaoDoObjetivo(o) {
  const falta = Math.max(o.meta - o.guardado, 0);
  const porcento = o.meta > 0 ? Math.min((o.guardado / o.meta) * 100, 100) : 0;
  if (falta === 0) return { porcento, falta, estado: 'alcancado' };
  if (!o.prazo) return { porcento, falta, estado: 'sem-prazo' };
  const meses = mesesAte(o.prazo);
  if (meses <= 0) return { porcento, falta, estado: 'atrasado' };
  return { porcento, falta, estado: 'andando', meses, porMes: falta / meses };
}

// ----- Objetivos ligados às contas -----
// Guardar num objetivo tira o dinheiro de uma conta; retirar devolve para a conta.
// Vira um lançamento do tipo transferência (não conta como gasto nem como ganho nos relatórios).
export function movimentoDoObjetivo({ objetivo, conta, valor, tipo }) {
  const guardando = tipo === 'guardar';
  return {
    id: novoId(),
    data: dataDeHoje(),
    descricao: guardando ? `Guardado em: ${objetivo.nome}` : `Retirado de: ${objetivo.nome}`,
    categoria: TRANSFERENCIA.nome,
    conta,
    valor: guardando ? -Math.abs(valor) : Math.abs(valor),
    pago: true,
    repete: false,
    observacao: '',
    transferencia: novoId(), // grupo só deste movimento
    objetivo: objetivo.id,
    objetivoNome: objetivo.nome,
  };
}

// Quando um movimento de objetivo é excluído em Lançamentos, o objetivo volta ao valor de antes
export function desfazerMovimentoDoObjetivo(item) {
  if (!item?.objetivo) return;
  const lista = carregarObjetivos();
  salvarObjetivos(
    lista.map((o) => (o.id === item.objetivo ? { ...o, guardado: Math.max(0, Math.round((o.guardado + item.valor) * 100) / 100) } : o))
  );
}
