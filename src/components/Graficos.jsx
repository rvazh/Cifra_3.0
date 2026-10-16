// Gráficos simples feitos só com SVG (sem biblioteca)

import { valoresEscondidos } from '../dados/preferencias.js';

// Formata número como dinheiro: 1234.5 -> "R$ 1.234,50"
// Se a pessoa escondeu os valores (botão do olho), mostra "R$ ••••"
export function reais(valor) {
  if (valoresEscondidos()) return 'R$ ••••';
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Valor redondo e curto, para o meio dos gráficos: "R$ 6.235"
export function reaisRedondo(valor) {
  if (valoresEscondidos()) return 'R$ ••••';
  return `R$ ${Math.round(valor).toLocaleString('pt-BR')}`;
}

// ===== Gráfico de colunas: receitas (verde) x despesas (vermelho) =====
// "largura" e "altura" mudam a proporção do desenho (ele sempre ocupa a largura do cartão)
export function GraficoColunas({ dados, corReceita = '#2E9D5B', corDespesa = '#D9544A', largura = 560, altura = 200 }) {
  const base = altura - 24; // espaço embaixo para o nome do mês
  const maior = Math.max(1, ...dados.flatMap((d) => [d.receitas, d.despesas])) * 1.1;
  const grupo = largura / dados.length;
  const coluna = Math.min(largura / 35, grupo / 4);
  const alturaDe = (valor) => ((base - 10) * valor) / maior;

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${largura} ${altura}`}
      role="img"
      aria-label="Receitas e despesas por mês"
    >
      {[0, 1, 2, 3].map((k) => {
        const y = base - ((base - 10) * k) / 3;
        return <line key={k} x1="0" x2={largura} y1={y} y2={y} stroke="#EEE6D8" />;
      })}
      {dados.map((d, i) => {
        const centro = grupo * i + grupo / 2;
        return (
          <g key={d.mes}>
            <rect
              x={centro - coluna - 2}
              y={base - alturaDe(d.receitas)}
              width={coluna}
              height={alturaDe(d.receitas)}
              rx="4"
              fill={corReceita}
            >
              <title>{`${d.mes}: receitas ${reais(d.receitas)}`}</title>
            </rect>
            <rect
              x={centro + 2}
              y={base - alturaDe(d.despesas)}
              width={coluna}
              height={alturaDe(d.despesas)}
              rx="4"
              fill={corDespesa}
            >
              <title>{`${d.mes}: despesas ${reais(d.despesas)}`}</title>
            </rect>
            <text x={centro} y={altura - 6} textAnchor="middle" fontSize="12" fill="#6B6355">
              {d.mes}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ===== Gráfico de rosca: gastos por categoria =====
export function GraficoRosca({ categorias, tamanho = 150, espessura = 22, textoCentro, legendaCentro }) {
  const raio = (tamanho - espessura) / 2;
  const volta = 2 * Math.PI * raio;
  const total = categorias.reduce((soma, c) => soma + c.valor, 0);
  const meio = tamanho / 2;
  let inicio = 0;

  return (
    <svg width={tamanho} height={tamanho} viewBox={`0 0 ${tamanho} ${tamanho}`} role="img" aria-label="Gastos por categoria">
      <circle cx={meio} cy={meio} r={raio} fill="none" stroke="#EEE6D8" strokeWidth={espessura} />
      {categorias.map((c) => {
        const pedaco = (volta * c.valor) / total;
        const traco = Math.max(pedaco - 2, 0); // pequeno espaço entre as fatias
        const deslocamento = -inicio;
        inicio += pedaco;
        return (
          <circle
            key={c.nome}
            cx={meio}
            cy={meio}
            r={raio}
            fill="none"
            stroke={c.cor}
            strokeWidth={espessura}
            strokeDasharray={`${traco} ${volta - traco}`}
            strokeDashoffset={deslocamento}
            transform={`rotate(-90 ${meio} ${meio})`}
          >
            <title>{`${c.nome}: ${reais(c.valor)}`}</title>
          </circle>
        );
      })}
      <text x={meio} y={meio + 2} textAnchor="middle" fontSize="18" fontWeight="800" fill="#141414">
        {textoCentro}
      </text>
      <text x={meio} y={meio + 20} textAnchor="middle" fontSize="11" fill="#6B6355">
        {legendaCentro}
      </text>
    </svg>
  );
}
