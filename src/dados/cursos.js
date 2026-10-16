// ===== Cursos =====
// O progresso (aulas concluídas) fica salvo só neste aparelho.
import { chave } from './armazenamento.js';

const CHAVE = () => chave('cursos');

// Curso que já está disponível: um guia rápido para começar a usar a CIFRA
export const PRIMEIROS_PASSOS = {
  id: 'primeiros-passos',
  titulo: 'Primeiros passos na CIFRA',
  descricao: 'Cinco aulas curtas para deixar a sua vida financeira organizada aqui dentro.',
  plano: 'Gratuito',
  aulas: [
    {
      titulo: 'Cadastre as suas contas',
      texto:
        'Comece pelas contas onde o seu dinheiro fica: banco, carteira, poupança. Em cada uma, coloque o saldo de hoje como "saldo inicial". A partir daí, a CIFRA calcula o saldo sozinha a cada lançamento.',
      link: { para: '/painel/contas', texto: 'Ir para Contas' },
    },
    {
      titulo: 'Registre o que entra e o que sai',
      texto:
        'Em Lançamentos, preencha o título, o valor, se é despesa ou ganho, a data e a conta. Comprou parcelado? Marque "Parcelado" e diga em quantas vezes: a CIFRA cria uma parcela em cada mês. Quanto mais você registra, mais certos ficam os números.',
      link: { para: '/painel/lancamentos', texto: 'Ir para Lançamentos' },
    },
    {
      titulo: 'Marque as contas que vão vencer',
      texto:
        'Aluguel, internet, fatura do cartão: lance com a data do vencimento. O que tem data futura fica como "a pagar" no Calendário. Para contas fixas, abra o lançamento, toque em Editar e marque "Repete todo mês": elas aparecem sozinhas nos próximos meses.',
      link: { para: '/painel/calendario', texto: 'Ir para o Calendário' },
    },
    {
      titulo: 'Crie um objetivo',
      texto:
        'Uma reserva de emergência é um ótimo primeiro objetivo. Diga quanto quer juntar e até quando: a CIFRA mostra quanto guardar por mês para chegar lá.',
      link: { para: '/painel/objetivos', texto: 'Ir para Objetivos' },
    },
    {
      titulo: 'Veja para onde foi o dinheiro',
      texto:
        'No fim do mês, abra os Relatórios. Eles mostram as categorias em que você mais gastou e comparam com o mês anterior. É ali que aparecem os pequenos ajustes que fazem diferença.',
      link: { para: '/painel/relatorios', texto: 'Ir para Relatórios' },
    },
  ],
};

// Cursos que ainda estão sendo preparados
export const EM_BREVE = [
  {
    id: 'orcamento',
    emoji: '🧾',
    titulo: 'Orçamento do mês sem sofrimento',
    descricao: 'Como dividir o que entra entre contas, metas e lazer, sem planilha complicada.',
    plano: 'Plano Base',
  },
  {
    id: 'reserva',
    emoji: '🛟',
    titulo: 'Montando a reserva de emergência',
    descricao: 'Quanto guardar, onde deixar o dinheiro e como não mexer nele.',
    plano: 'Plano Base',
  },
  {
    id: 'dividas',
    emoji: '🧭',
    titulo: 'Saindo das dívidas',
    descricao: 'Um passo a passo para organizar o que você deve e decidir o que pagar primeiro.',
    plano: 'Plano Essencial',
  },
  {
    id: 'investimentos',
    emoji: '🌱',
    titulo: 'Primeiros investimentos',
    descricao: 'Os conceitos básicos para dar o primeiro passo com segurança.',
    plano: 'Plano Essencial',
  },
];

export function carregarProgresso() {
  try {
    return JSON.parse(localStorage.getItem(CHAVE()) || '{}');
  } catch {
    return {};
  }
}

export function salvarProgresso(progresso) {
  try {
    localStorage.setItem(CHAVE(), JSON.stringify(progresso));
  } catch {
    /* sem acesso ao armazenamento */
  }
}
