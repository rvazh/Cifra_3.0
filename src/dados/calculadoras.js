// ===== Calculadoras de custo: carro, moto, aluguel, comprar casa e pet =====
// Cada calculadora tem: campos (em grupos), um exemplo para abrir já com a conta pronta,
// onde guarda os números (chave, sobe para a nuvem) e a conta em si (calcular).
// A tela (pages/Calculadora.jsx) desenha qualquer uma delas do mesmo jeito.
//
// Referências dos valores sugeridos (out/2026, veja o README):
//  - Carro/moto: IPVA 2026 por estado, desvalorização média de 7% a 10% ao ano, regra 10/20/30% da renda
//  - Aluguel: renda de 3x o aluguel pedida pelas imobiliárias; moradia (aluguel + condomínio + IPTU) até 30%
//    da renda; seguro incêndio obrigatório (R$ 15 a R$ 50/mês); caução de até 3 aluguéis; seguro fiança de
//    1 a 2,5 aluguéis por ano
//  - Comprar casa: SBPE (Caixa) TR + 10,99% a 11,49% ao ano, prazo até 35 anos, parcela até 30% da renda,
//    financiamento de até 80% (SAC) ou 70% (Price)
//  - Pet: custo médio do cão de R$ 270 a R$ 600/mês conforme o porte; vacinas e vermífugos R$ 750 a
//    R$ 1.200/ano; banho R$ 80 a R$ 130; enxoval R$ 400 a R$ 800; reserva de 3 a 6 meses do custo
import { chave } from './armazenamento.js';
import { IPVA_POR_ESTADO, PERFIS_DE_RENDA, EXEMPLO as EXEMPLO_CARRO, calcularCarro } from './calculadoraCarro.js';

const n = (v) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : 0);
const pct = (v) => String(n(v)).replace('.', ',');
const ESTADOS = Object.keys(IPVA_POR_ESTADO)
  .sort()
  .map((uf) => ({ valor: uf, texto: uf }));

// ----- Guardar e ler os números de cada calculadora -----
export function carregarCalculadora(calc) {
  try {
    const salvo = JSON.parse(localStorage.getItem(chave(calc.chave)));
    if (salvo && typeof salvo === 'object') return { ...calc.exemplo, ...salvo };
  } catch {
    /* sem acesso ou valor estragado */
  }
  return { ...calc.exemplo };
}

export function salvarCalculadora(calc, dados) {
  try {
    localStorage.setItem(chave(calc.chave), JSON.stringify(dados));
  } catch {
    /* sem acesso ao armazenamento */
  }
}

// Resultado comum de carro e moto
function resultadoDeVeiculo(d, nomeDoVeiculo) {
  const c = calcularCarro(d);
  return {
    rotulo: nomeDoVeiculo === 'moto' ? 'Esta moto custa' : 'Este carro custa',
    mensal: c.total,
    porAno: c.porAno,
    porDia: c.porDia,
    destaque:
      c.total !== c.doBolso
        ? {
            texto: 'Sai do bolso todo mês',
            valor: c.doBolso,
            nota: `O resto é a desvalorização${d.contarRendimento ? ' e o rendimento perdido' : ''}: não sai da conta, mas você perde.`,
          }
        : null,
    minis: [
      { rotulo: 'Para rodar 1 km', valor: c.porKmRodar, nota: 'combustível, pneus e manutenção' },
      { rotulo: 'Custo total por km', valor: c.porKmTotal, nota: 'tudo ÷ km do mês' },
    ],
    renda: {
      titulo: `Renda mínima para ter ${nomeDoVeiculo === 'moto' ? 'esta moto' : 'este carro'}`,
      padrao: 'equilibrado',
      perfis: c.rendaMinima.map((p) => ({
        id: p.id,
        nome: p.nome,
        sub: `${Math.round(p.parte * 100)}% da renda`,
        renda: p.renda,
        dica: `Renda líquida (o que cai na conta) para ${nomeDoVeiculo === 'moto' ? 'a moto' : 'o carro'} ocupar até ${Math.round(
          p.parte * 100
        )}% dela. ${p.dica}`,
      })),
    },
    comparar: c.doBolso,
    veredito: true,
    itens: c.itens,
    unicos: [],
    legenda: [
      { tipo: 'rodar', texto: 'depende de quanto você roda' },
      { tipo: 'fixo', texto: 'fixo' },
      { tipo: 'escondido', texto: 'escondido' },
    ],
  };
}

const ESCONDIDOS_VEICULO = {
  titulo: 'Custos escondidos',
  texto: 'Não saem da conta todo mês, mas fazem parte do custo real.',
  campos: [
    { id: 'contarDepreciacao', tipo: 'liga', rotulo: 'Contar a desvalorização' },
    { id: 'depreciacao', rotulo: 'Perde por ano', sufixo: '% do valor', dica: 'Em geral entre 7% e 10% ao ano; novo perde mais no 1º ano.' },
    { id: 'contarRendimento', tipo: 'liga', rotulo: 'Contar o rendimento que o dinheiro teria' },
    { id: 'rendimento', rotulo: 'Se o dinheiro estivesse aplicado', sufixo: '% ao ano', dica: 'Se for financiado, use só a entrada.' },
  ],
};

// ===== Carro =====
export const CARRO = {
  id: 'carro',
  nome: 'Carro',
  emoji: '🚗',
  chave: 'calculadora-carro',
  exemplo: EXEMPLO_CARRO,
  grupos: [
    {
      titulo: 'O carro',
      campos: [
        { id: 'valorCarro', rotulo: 'Valor do carro', dinheiro: true, dica: 'Use o preço da tabela FIPE ou o valor que você vai pagar.' },
        {
          id: 'estado',
          tipo: 'opcoes',
          rotulo: 'Estado (para o IPVA)',
          opcoes: ESTADOS,
          aoEscolher: (uf) => ({ ipva: IPVA_POR_ESTADO[uf] }),
        },
        { id: 'ipva', rotulo: 'IPVA', sufixo: '% ao ano', dica: 'Alíquota de 2026 para carro a gasolina/flex. Elétricos e híbridos podem pagar menos.' },
      ],
    },
    {
      titulo: 'Uso no mês',
      campos: [
        { id: 'kmPorMes', rotulo: 'Quantos km roda por mês', sufixo: 'km', dica: 'Em média 1.000 km por mês.' },
        { id: 'consumo', rotulo: 'Consumo', sufixo: 'km/l', dica: 'Quantos km o carro faz com 1 litro (na cidade).' },
        { id: 'precoLitro', rotulo: 'Preço do litro', dinheiro: true, dica: 'Do posto onde você abastece.' },
        { id: 'outrosMes', rotulo: 'Estacionamento, pedágio e lavagem', dinheiro: true, sufixo: '/mês' },
      ],
    },
    {
      titulo: 'Contas do ano',
      campos: [
        { id: 'seguroAno', rotulo: 'Seguro', dinheiro: true, sufixo: '/ano', dica: 'Peça uma cotação: muda com a cidade, a idade e o modelo.' },
        { id: 'licenciamentoAno', rotulo: 'Licenciamento', dinheiro: true, sufixo: '/ano', dica: 'Taxa do Detran do seu estado.' },
        { id: 'manutencaoAno', rotulo: 'Revisões e manutenção', dinheiro: true, sufixo: '/ano', dica: 'Revisões, óleo, freios, bateria...' },
        { id: 'precoPneus', rotulo: 'Jogo de 4 pneus', dinheiro: true },
        { id: 'duracaoPneusKm', rotulo: 'Os pneus duram', sufixo: 'km', dica: 'Em geral entre 40.000 e 50.000 km.' },
      ],
    },
    {
      titulo: 'Financiamento',
      campos: [{ id: 'parcela', rotulo: 'Parcela por mês (se for financiado)', dinheiro: true, sufixo: '/mês', dica: 'Deixe vazio se o carro já é seu.' }],
    },
    ESCONDIDOS_VEICULO,
  ],
  calcular: (d) => resultadoDeVeiculo(d, 'carro'),
};

// ===== Moto =====
export const MOTO = {
  id: 'moto',
  nome: 'Moto',
  emoji: '🏍️',
  chave: 'calculadora-moto',
  exemplo: {
    valorCarro: 18000,
    ipva: 2,
    kmPorMes: 1000,
    consumo: 35,
    precoLitro: 6.3,
    seguroAno: 1200,
    licenciamentoAno: 160,
    manutencaoAno: 900,
    precoPneus: 600,
    duracaoPneusKm: 15000,
    parcela: 0,
    outrosMes: 50,
    equipamentosAno: 250,
    depreciacao: 10,
    contarDepreciacao: true,
    rendimento: 10,
    contarRendimento: false,
  },
  grupos: [
    {
      titulo: 'A moto',
      campos: [
        { id: 'valorCarro', rotulo: 'Valor da moto', dinheiro: true, dica: 'Use o preço da tabela FIPE ou o valor que você vai pagar.' },
        {
          id: 'ipva',
          rotulo: 'IPVA',
          sufixo: '% ao ano',
          dica: 'Em SP, moto paga 2% (e motos até 180 cc podem ser isentas em 2026). Confira a alíquota no site da Fazenda do seu estado.',
        },
      ],
    },
    {
      titulo: 'Uso no mês',
      campos: [
        { id: 'kmPorMes', rotulo: 'Quantos km roda por mês', sufixo: 'km' },
        { id: 'consumo', rotulo: 'Consumo', sufixo: 'km/l', dica: 'Motos de 150 cc fazem em torno de 35 a 40 km/l.' },
        { id: 'precoLitro', rotulo: 'Preço do litro', dinheiro: true },
        { id: 'outrosMes', rotulo: 'Estacionamento e lavagem', dinheiro: true, sufixo: '/mês' },
      ],
    },
    {
      titulo: 'Contas do ano',
      campos: [
        { id: 'seguroAno', rotulo: 'Seguro', dinheiro: true, sufixo: '/ano', dica: 'Moto tem seguro caro contra roubo: peça uma cotação.' },
        { id: 'licenciamentoAno', rotulo: 'Licenciamento', dinheiro: true, sufixo: '/ano' },
        { id: 'manutencaoAno', rotulo: 'Revisões e manutenção', dinheiro: true, sufixo: '/ano', dica: 'Óleo, filtros, relação, freios...' },
        { id: 'equipamentosAno', rotulo: 'Equipamentos', dinheiro: true, sufixo: '/ano', dica: 'Capacete, luvas, capa de chuva (dividido pelos anos de uso).' },
        { id: 'precoPneus', rotulo: 'Par de pneus', dinheiro: true },
        { id: 'duracaoPneusKm', rotulo: 'Os pneus duram', sufixo: 'km' },
      ],
    },
    {
      titulo: 'Financiamento',
      campos: [{ id: 'parcela', rotulo: 'Parcela por mês (se for financiada)', dinheiro: true, sufixo: '/mês' }],
    },
    ESCONDIDOS_VEICULO,
  ],
  calcular: (d) => resultadoDeVeiculo(d, 'moto'),
};

// ===== Aluguel =====
export const ALUGUEL = {
  id: 'aluguel',
  nome: 'Aluguel',
  emoji: '🔑',
  chave: 'calculadora-aluguel',
  exemplo: {
    aluguel: 1800,
    condominio: 450,
    iptuMes: 80,
    seguroIncendioMes: 25,
    contasMes: 400,
    garantia: 'caucao',
    mesesCaucao: 3,
    seguroFiancaAlugueis: 1.5,
    mudanca: 1500,
    reajuste: 4.5,
  },
  grupos: [
    {
      titulo: 'Todo mês',
      campos: [
        { id: 'aluguel', rotulo: 'Aluguel', dinheiro: true, sufixo: '/mês' },
        { id: 'condominio', rotulo: 'Condomínio', dinheiro: true, sufixo: '/mês', dica: 'Deixe vazio se for casa sem condomínio.' },
        { id: 'iptuMes', rotulo: 'IPTU', dinheiro: true, sufixo: '/mês', dica: 'Normalmente dividido em parcelas e pago pelo inquilino.' },
        { id: 'seguroIncendioMes', rotulo: 'Seguro incêndio', dinheiro: true, sufixo: '/mês', dica: 'Obrigatório. Em geral entre R$ 15 e R$ 50 por mês.' },
        { id: 'contasMes', rotulo: 'Luz, água, gás e internet', dinheiro: true, sufixo: '/mês' },
      ],
    },
    {
      titulo: 'Garantia do contrato',
      campos: [
        {
          id: 'garantia',
          tipo: 'opcoes',
          rotulo: 'Tipo de garantia',
          opcoes: [
            { valor: 'caucao', texto: 'Caução (depósito)' },
            { valor: 'seguro', texto: 'Seguro fiança' },
            { valor: 'fiador', texto: 'Fiador' },
          ],
        },
        { id: 'mesesCaucao', rotulo: 'Caução de', sufixo: 'aluguéis', dica: 'A lei permite até 3 aluguéis. O dinheiro volta no fim do contrato.' },
        { id: 'seguroFiancaAlugueis', rotulo: 'Seguro fiança por ano', sufixo: 'aluguéis', dica: 'Costuma custar de 1 a 2,5 aluguéis por ano.' },
      ],
    },
    {
      titulo: 'Para entrar e para o futuro',
      campos: [
        { id: 'mudanca', rotulo: 'Mudança e pequenos reparos', dinheiro: true, dica: 'Frete, pintura, cortinas...' },
        { id: 'reajuste', rotulo: 'Reajuste por ano', sufixo: '%', dica: 'Pelo índice do contrato (IPCA ou IGP-M).' },
      ],
    },
  ],
  calcular: (d) => {
    const aluguel = n(d.aluguel);
    const moradia = aluguel + n(d.condominio) + n(d.iptuMes);
    const seguroFianca = d.garantia === 'seguro' ? (aluguel * n(d.seguroFiancaAlugueis)) / 12 : 0;
    const itens = [
      { id: 'aluguel', nome: 'Aluguel', valor: aluguel, tipo: 'fixo' },
      { id: 'condominio', nome: 'Condomínio', valor: n(d.condominio), tipo: 'fixo' },
      { id: 'iptu', nome: 'IPTU', valor: n(d.iptuMes), tipo: 'fixo' },
      { id: 'contas', nome: 'Luz, água, gás e internet', valor: n(d.contasMes), tipo: 'rodar' },
      { id: 'seguroIncendio', nome: 'Seguro incêndio', valor: n(d.seguroIncendioMes), tipo: 'fixo' },
      { id: 'seguroFianca', nome: 'Seguro fiança', valor: seguroFianca, tipo: 'fixo', dica: `${pct(d.seguroFiancaAlugueis)} aluguel(éis) por ano ÷ 12` },
    ]
      .filter((i) => i.valor > 0)
      .sort((a, b) => b.valor - a.valor);
    const mensal = itens.reduce((s, i) => s + i.valor, 0);
    const caucao = d.garantia === 'caucao' ? aluguel * n(d.mesesCaucao) : 0;
    const unicos = [
      { nome: 'Caução (volta no fim do contrato)', valor: caucao },
      { nome: 'Mudança e pequenos reparos', valor: n(d.mudanca) },
    ].filter((u) => u.valor > 0);
    return {
      rotulo: 'Morar de aluguel custa',
      mensal,
      porAno: mensal * 12,
      porDia: mensal / 30,
      destaque: { texto: 'Só a moradia (aluguel + condomínio + IPTU)', valor: moradia, nota: 'É o que as imobiliárias olham na análise.' },
      minis: [
        { rotulo: 'Para entrar', valor: unicos.reduce((s, u) => s + u.valor, 0), nota: caucao ? 'caução + mudança' : 'mudança' },
        { rotulo: 'Aluguel daqui a 1 ano', valor: aluguel * (1 + n(d.reajuste) / 100), nota: `com reajuste de ${pct(d.reajuste)}%` },
      ],
      renda: {
        titulo: 'Renda para alugar este imóvel',
        padrao: 'recomendada',
        perfis: [
          {
            id: 'imobiliaria',
            nome: 'Imobiliária',
            sub: '3x o aluguel',
            renda: aluguel * 3,
            dica: 'Renda bruta que a maioria das imobiliárias pede: pelo menos 3 vezes o valor do aluguel.',
          },
          {
            id: 'recomendada',
            nome: 'Recomendada',
            sub: 'moradia até 30%',
            renda: moradia / 0.3,
            dica: 'Para o aluguel, o condomínio e o IPTU ocuparem até 30% da renda. É mais realista que a regra das 3 vezes.',
          },
        ],
      },
      comparar: mensal,
      itens,
      unicos,
      legenda: [
        { tipo: 'fixo', texto: 'fixo' },
        { tipo: 'rodar', texto: 'depende do seu consumo' },
      ],
    };
  },
};

// ===== Comprar casa (financiamento) =====
export const CASA = {
  id: 'casa',
  nome: 'Comprar casa',
  emoji: '🏠',
  chave: 'calculadora-casa',
  exemplo: {
    valorImovel: 400000,
    entrada: 80000,
    juros: 11.49,
    prazoAnos: 30,
    sistema: 'sac',
    segurosMes: 120,
    itbi: 3,
    cartorio: 1.5,
    iptuAno: 1200,
    condominio: 400,
    manutencao: 1,
  },
  grupos: [
    {
      titulo: 'O imóvel',
      campos: [
        { id: 'valorImovel', rotulo: 'Valor do imóvel', dinheiro: true },
        { id: 'entrada', rotulo: 'Entrada', dinheiro: true, dica: 'A Caixa costuma financiar até 80% no SAC e 70% no Price.' },
      ],
    },
    {
      titulo: 'Financiamento',
      campos: [
        { id: 'juros', rotulo: 'Juros', sufixo: '% ao ano', dica: 'Caixa (SBPE) em 2026: em torno de TR + 10,99% a 11,49% ao ano.' },
        { id: 'prazoAnos', rotulo: 'Prazo', sufixo: 'anos', dica: 'Até 35 anos na maioria das linhas.' },
        {
          id: 'sistema',
          tipo: 'opcoes',
          rotulo: 'Tabela',
          opcoes: [
            { valor: 'sac', texto: 'SAC (parcela diminui)' },
            { valor: 'price', texto: 'Price (parcela fixa)' },
          ],
        },
        { id: 'segurosMes', rotulo: 'Seguros obrigatórios (MIP e DFI)', dinheiro: true, sufixo: '/mês', dica: 'Vêm junto da parcela; peça o valor na simulação do banco.' },
      ],
    },
    {
      titulo: 'Custos da compra',
      campos: [
        { id: 'itbi', rotulo: 'ITBI', sufixo: '% do valor', dica: 'Imposto da prefeitura na compra: em geral de 2% a 3%.' },
        { id: 'cartorio', rotulo: 'Escritura e registro', sufixo: '% do valor', dica: 'Cartório: costuma ficar em torno de 1% a 2%.' },
      ],
    },
    {
      titulo: 'Depois de comprar',
      campos: [
        { id: 'iptuAno', rotulo: 'IPTU', dinheiro: true, sufixo: '/ano' },
        { id: 'condominio', rotulo: 'Condomínio', dinheiro: true, sufixo: '/mês' },
        { id: 'manutencao', rotulo: 'Manutenção', sufixo: '% do valor por ano', dica: 'Reserva para consertos e reformas: cerca de 1% ao ano.' },
      ],
    },
  ],
  calcular: (d) => {
    const valor = n(d.valorImovel);
    const financiado = Math.max(valor - n(d.entrada), 0);
    const meses = Math.round(n(d.prazoAnos) * 12);
    const i = n(d.juros) ? (1 + n(d.juros) / 100) ** (1 / 12) - 1 : 0; // juros ao mês equivalentes
    let primeira = 0;
    let ultima = 0;
    let totalJuros = 0;
    let jurosPrimeiro = 0;
    if (financiado && meses) {
      if (d.sistema === 'price' && i) {
        primeira = (financiado * i) / (1 - (1 + i) ** -meses);
        ultima = primeira;
        totalJuros = primeira * meses - financiado;
      } else {
        const amortizacao = financiado / meses;
        primeira = amortizacao + financiado * i;
        ultima = amortizacao + amortizacao * i;
        totalJuros = i * (financiado * meses - (amortizacao * meses * (meses - 1)) / 2);
      }
      jurosPrimeiro = financiado * i;
    }
    const seguros = n(d.segurosMes);
    const itens = [
      { id: 'juros', nome: 'Juros (1º mês)', valor: jurosPrimeiro, tipo: 'escondido', dica: 'Parte da parcela que não abate a dívida' },
      { id: 'amortizacao', nome: 'Amortização (1º mês)', valor: Math.max(primeira - jurosPrimeiro, 0), tipo: 'fixo', dica: 'Parte da parcela que vira patrimônio' },
      { id: 'seguros', nome: 'Seguros MIP e DFI', valor: seguros, tipo: 'fixo' },
      { id: 'condominio', nome: 'Condomínio', valor: n(d.condominio), tipo: 'fixo' },
      { id: 'iptu', nome: 'IPTU', valor: n(d.iptuAno) / 12, tipo: 'fixo', dica: 'Valor do ano ÷ 12' },
      { id: 'manutencao', nome: 'Manutenção', valor: (valor * n(d.manutencao)) / 100 / 12, tipo: 'rodar', dica: `${pct(d.manutencao)}% do valor por ano ÷ 12` },
    ]
      .filter((x) => x.valor > 0)
      .sort((a, b) => b.valor - a.valor);
    const mensal = itens.reduce((s, x) => s + x.valor, 0);
    const unicos = [
      { nome: 'Entrada', valor: n(d.entrada) },
      { nome: `ITBI (${pct(d.itbi)}%)`, valor: (valor * n(d.itbi)) / 100 },
      { nome: `Escritura e registro (${pct(d.cartorio)}%)`, valor: (valor * n(d.cartorio)) / 100 },
    ].filter((u) => u.valor > 0);
    const parcelaDoBanco = primeira + seguros;
    const parteFinanciada = valor ? financiado / valor : 0;
    return {
      rotulo: 'No 1º mês, a casa custa',
      mensal,
      porAno: mensal * 12,
      porDia: mensal / 30,
      destaque: {
        texto: d.sistema === 'price' ? 'Parcela do banco (fixa)' : 'Parcela do banco no 1º mês',
        valor: parcelaDoBanco,
        nota:
          parteFinanciada > (d.sistema === 'price' ? 0.7 : 0.8)
            ? `Atenção: você está financiando ${Math.round(parteFinanciada * 100)}% do imóvel; a Caixa costuma ir até ${
                d.sistema === 'price' ? '70%' : '80%'
              }.`
            : `Financiando ${financiado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} em ${meses} meses. A TR não entra na conta.`,
      },
      minis: [
        { rotulo: d.sistema === 'price' ? 'Parcela (todas)' : 'Última parcela', valor: ultima + seguros, nota: d.sistema === 'price' ? 'mais seguros' : 'com seguros, no fim do prazo' },
        { rotulo: 'Juros no total', valor: totalJuros, nota: `em ${n(d.prazoAnos)} anos` },
      ],
      renda: {
        titulo: 'Renda mínima para o banco aprovar',
        padrao: 'banco',
        perfis: [
          {
            id: 'banco',
            nome: 'Regra do banco',
            sub: 'parcela até 30%',
            renda: parcelaDoBanco / 0.3,
            dica: 'Os bancos costumam aceitar que a parcela (com seguros) use até 30% da renda bruta da família.',
          },
          {
            id: 'folga',
            nome: 'Com folga',
            sub: 'casa toda até 30%',
            renda: mensal / 0.3,
            dica: 'Para a parcela, o condomínio, o IPTU e a manutenção caberem juntos em 30% da renda.',
          },
        ],
      },
      comparar: mensal,
      itens,
      unicos,
      legenda: [
        { tipo: 'fixo', texto: 'fixo' },
        { tipo: 'escondido', texto: 'juros' },
        { tipo: 'rodar', texto: 'reserva' },
      ],
    };
  },
};

// ===== Pet =====
// Valores de exemplo por espécie e porte (médias de 2026; troque pelos do seu bichinho)
export const PRESETS_PET = {
  'cao-pequeno': { racaoMes: 110, petiscosMes: 30, antipulgasMes: 50, banhoMes: 70, vacinasAno: 750, consultasAno: 360, castracao: 900, expectativaAnos: 14 },
  'cao-medio': { racaoMes: 150, petiscosMes: 40, antipulgasMes: 70, banhoMes: 80, vacinasAno: 900, consultasAno: 400, castracao: 1100, expectativaAnos: 13 },
  'cao-grande': { racaoMes: 230, petiscosMes: 50, antipulgasMes: 90, banhoMes: 100, vacinasAno: 1100, consultasAno: 450, castracao: 1400, expectativaAnos: 11 },
  gato: { racaoMes: 100, petiscosMes: 60, antipulgasMes: 40, banhoMes: 0, vacinasAno: 600, consultasAno: 300, castracao: 600, expectativaAnos: 15 },
};

function presetDoPet(especie, porte) {
  return PRESETS_PET[especie === 'gato' ? 'gato' : `cao-${porte || 'medio'}`];
}

export const PET = {
  id: 'pet',
  nome: 'Pet',
  emoji: '🐶',
  chave: 'calculadora-pet',
  exemplo: {
    especie: 'cao',
    porte: 'medio',
    ...PRESETS_PET['cao-medio'],
    planoSaudeMes: 0,
    outrosMes: 0,
    enxoval: 600,
    aquisicao: 0,
  },
  grupos: [
    {
      titulo: 'O bichinho',
      campos: [
        {
          id: 'especie',
          tipo: 'opcoes',
          rotulo: 'Espécie',
          opcoes: [
            { valor: 'cao', texto: 'Cachorro' },
            { valor: 'gato', texto: 'Gato' },
          ],
          aoEscolher: (especie, d) => presetDoPet(especie, d.porte),
        },
        {
          id: 'porte',
          tipo: 'opcoes',
          rotulo: 'Porte',
          opcoes: [
            { valor: 'pequeno', texto: 'Pequeno (até 10 kg)' },
            { valor: 'medio', texto: 'Médio (11 a 25 kg)' },
            { valor: 'grande', texto: 'Grande (26 a 45 kg)' },
          ],
          aoEscolher: (porte, d) => presetDoPet(d.especie, porte),
          dica: 'Escolher a espécie ou o porte coloca valores médios; depois ajuste para o seu caso.',
        },
        { id: 'expectativaAnos', rotulo: 'Vive em média', sufixo: 'anos' },
      ],
    },
    {
      titulo: 'Todo mês',
      campos: [
        { id: 'racaoMes', rotulo: 'Ração', dinheiro: true, sufixo: '/mês' },
        { id: 'petiscosMes', rotulo: 'Petiscos, brinquedos e areia', dinheiro: true, sufixo: '/mês' },
        { id: 'antipulgasMes', rotulo: 'Antipulgas e vermífugo', dinheiro: true, sufixo: '/mês' },
        { id: 'banhoMes', rotulo: 'Banho e tosa', dinheiro: true, sufixo: '/mês', dica: 'Cada banho sai por volta de R$ 80 a R$ 130.' },
        { id: 'planoSaudeMes', rotulo: 'Plano de saúde pet', dinheiro: true, sufixo: '/mês', dica: 'Opcional: de R$ 70 a R$ 250 por mês.' },
        { id: 'outrosMes', rotulo: 'Creche, passeador ou hotel', dinheiro: true, sufixo: '/mês' },
      ],
    },
    {
      titulo: 'Todo ano',
      campos: [
        { id: 'vacinasAno', rotulo: 'Vacinas', dinheiro: true, sufixo: '/ano', dica: 'Vacinas e vermífugos: de R$ 750 a R$ 1.200 por ano.' },
        { id: 'consultasAno', rotulo: 'Consultas e check-ups', dinheiro: true, sufixo: '/ano', dica: 'O ideal é um check-up a cada 6 meses.' },
      ],
    },
    {
      titulo: 'Para começar',
      campos: [
        { id: 'aquisicao', rotulo: 'Compra (ou taxa de adoção)', dinheiro: true },
        { id: 'enxoval', rotulo: 'Enxoval', dinheiro: true, dica: 'Cama, coleira, comedouros: de R$ 400 a R$ 800.' },
        { id: 'castracao', rotulo: 'Castração', dinheiro: true, dica: 'Valor de exemplo: varia muito por cidade e clínica.' },
      ],
    },
  ],
  calcular: (d) => {
    const itens = [
      { id: 'racao', nome: 'Ração', valor: n(d.racaoMes), tipo: 'fixo' },
      { id: 'petiscos', nome: 'Petiscos, brinquedos e areia', valor: n(d.petiscosMes), tipo: 'fixo' },
      { id: 'antipulgas', nome: 'Antipulgas e vermífugo', valor: n(d.antipulgasMes), tipo: 'fixo' },
      { id: 'banho', nome: 'Banho e tosa', valor: n(d.banhoMes), tipo: 'fixo' },
      { id: 'vacinas', nome: 'Vacinas', valor: n(d.vacinasAno) / 12, tipo: 'rodar', dica: 'Valor do ano ÷ 12' },
      { id: 'consultas', nome: 'Consultas e check-ups', valor: n(d.consultasAno) / 12, tipo: 'rodar', dica: 'Valor do ano ÷ 12' },
      { id: 'plano', nome: 'Plano de saúde pet', valor: n(d.planoSaudeMes), tipo: 'fixo' },
      { id: 'outros', nome: 'Creche, passeador ou hotel', valor: n(d.outrosMes), tipo: 'fixo' },
    ]
      .filter((x) => x.valor > 0)
      .sort((a, b) => b.valor - a.valor);
    const mensal = itens.reduce((s, x) => s + x.valor, 0);
    const unicos = [
      { nome: 'Compra ou adoção', valor: n(d.aquisicao) },
      { nome: 'Enxoval', valor: n(d.enxoval) },
      { nome: 'Castração', valor: n(d.castracao) },
    ].filter((u) => u.valor > 0);
    const inicial = unicos.reduce((s, u) => s + u.valor, 0);
    const anos = n(d.expectativaAnos);
    return {
      rotulo: d.especie === 'gato' ? 'Ter este gato custa' : 'Ter este cachorro custa',
      mensal,
      porAno: mensal * 12,
      porDia: mensal / 30,
      destaque: {
        texto: 'Reserva para emergências',
        valor: mensal * 3,
        nota: `De 3 a 6 meses do custo (${(mensal * 3).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} a ${(mensal * 6).toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        })}). Uma emergência no veterinário pode passar de R$ 5.000.`,
      },
      minis: [
        { rotulo: 'Para começar', valor: inicial, nota: 'compra, enxoval e castração' },
        { rotulo: `Em ${anos || 0} anos`, valor: mensal * 12 * anos + inicial, nota: 'a vida toda do pet' },
      ],
      renda: null,
      comparar: mensal,
      itens,
      unicos,
      legenda: [
        { tipo: 'fixo', texto: 'todo mês' },
        { tipo: 'rodar', texto: 'todo ano (÷ 12)' },
      ],
    };
  },
};

export const CALCULADORAS = [CARRO, MOTO, ALUGUEL, CASA, PET];
export { PERFIS_DE_RENDA };
