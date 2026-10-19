// ===== Valores em reais nos campos de digitação =====
// Enquanto a pessoa digita, o valor ganha os pontos de milhar e a vírgula dos centavos:
//   "1250"   -> "1.250"
//   "1250,5" -> "1.250,5"
//   "1250."  -> "1.250,"   (quem digita ponto para os centavos)
// Os campos continuam lendo o número do mesmo jeito (tiram os pontos e trocam a vírgula por ponto).

export function mascaraValor(texto) {
  let t = String(texto ?? '');
  if (!t.trim()) return '';
  const negativo = t.trim().startsWith('-');
  // Ponto digitado agora no fim (sem vírgula ainda) = vírgula dos centavos
  if (!t.includes(',') && t.endsWith('.')) t = `${t.slice(0, -1)},`;
  const virgula = t.indexOf(',');
  const antes = virgula >= 0 ? t.slice(0, virgula) : t;
  const depois = virgula >= 0 ? t.slice(virgula + 1) : '';
  let inteiro = antes.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
  const centavos = depois.replace(/\D/g, '').slice(0, 2);
  if (!inteiro && virgula >= 0) inteiro = '0';
  if (!inteiro && !centavos) return negativo ? '-' : '';
  const comPontos = inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${negativo ? '-' : ''}${comPontos}${virgula >= 0 ? `,${centavos}` : ''}`;
}

// Número -> texto do campo: 1234.5 -> "1.234,50" (0 ou vazio -> "")
export function valorParaCampo(numero, { vazioSeZero = true } = {}) {
  const n = Number(numero);
  if (!Number.isFinite(n) || (vazioSeZero && n === 0)) return vazioSeZero ? '' : '0,00';
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
