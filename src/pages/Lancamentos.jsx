import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import MenuLateral from '../components/MenuLateral.jsx';
import { IconeSeta, IconeBusca, IconeClipe } from '../components/Icones.jsx';
import { TIPOS_ACEITOS, guardarComprovante, pegarComprovante, vincularComprovante } from '../dados/comprovantes.js';
import { reais } from '../components/Graficos.jsx';
import { nomesDasContas, garantirConta, mesmoNome, carregarContas, ehCartao } from '../dados/contas.js';
import ReajustarFixa from '../components/ReajustarFixa.jsx';
import { conferirAlertasAgora } from '../dados/alertas.js';
import { EncerrarFixa } from '../components/ContasFixas.jsx';
import { desfazerMovimentoDoObjetivo } from '../dados/objetivos.js';
import { lancamentoDeReceberExcluido } from '../dados/receber.js';
import { lancamentoDePagarExcluido } from '../dados/pagar.js';
import {
  carregarCategorias,
  salvarCategorias,
  categoria,
  carregar,
  salvar,
  novoId,
  dataCurta,
  dataPorExtenso,
  dataDeHoje,
  nomeDoMes,
  mudarMes,
  mesFinanceiro,
  periodoDoMes,
  diasNoMes,
  criarTransferencia,
  modeloDaFixa,
  historicoDaFixa,
  versaoAtualDaFixa,
  reativarFixa,
} from '../dados/lancamentos.js';
import './Painel.css';
import './Lancamentos.css';
import { mascaraValor, valorParaCampo } from '../dados/dinheiro.js';

// Opções para criar uma categoria nova
const EMOJIS = ['🐶', '🎓', '👕', '💡', '📱', '🎁', '✈️', '💪', '🧾', '💼', '🏦', '🍔'];
const CORES_CATEGORIA = ['#A8D5A2', '#9EC5E8', '#F5C08F', '#E7AFC3', '#D9CCF0', '#F3DE8A', '#CDEBD6', '#EEE6D8'];


// Tira acentos e deixa minúsculo, para a busca achar "farmacia" em "Farmácia"
function simplificar(texto) {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

// Lê "1.234,56" -> 1234.56 (vazio = null)
function lerValorFiltro(texto) {
  if (!String(texto).trim()) return null;
  const n = parseFloat(String(texto).replace(/\s|R\$/gi, '').replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? Math.abs(n) : null;
}

// "2026-10-12" -> "12/10/26" (quando a lista mostra mais de um mês)
function dataComAno(data) {
  return `${data.slice(8)}/${data.slice(5, 7)}/${data.slice(2, 4)}`;
}

// "2026-10" -> "out/2026"
function mesCurto(mes) {
  const nome = new Date(Number(mes.slice(0, 4)), Number(mes.slice(5, 7)) - 1, 1)
    .toLocaleDateString('pt-BR', { month: 'short' })
    .replace('.', '');
  return `${nome}/${mes.slice(0, 4)}`;
}

const PERIODOS = [
  ['mes', 'Mês escolhido'],
  ['3m', 'Últimos 3 meses'],
  ['12m', 'Últimos 12 meses'],
  ['ano', 'Este ano'],
  ['tudo', 'Tudo'],
  ['entre', 'Escolher datas'],
];

const FILTROS_VAZIOS = { periodo: 'mes', de: '', ate: '', conta: '', tipo: '', situacao: '', minimo: '', maximo: '' };

function valorComSinal(valor) {
  return `${valor >= 0 ? '+ ' : '− '}${reais(Math.abs(valor))}`;
}

// Mostra as duas pontas de uma transferência
function DetalheTransferencia({ item, lista }) {
  // Dívida sua: dinheiro do empréstimo entrando ou parcela saindo para quem você deve
  if (item.pagar) {
    const conta = <span><small>{item.valor > 0 ? 'Entrou em' : 'Saiu de'}</small><b>{item.conta}</b></span>;
    const credor = <span><small>{item.valor > 0 ? 'Emprestado por' : 'Pago a'}</small><b>🧾 {item.pessoa || 'Credor'}</b></span>;
    return (
      <div className="detalhe__transf">
        {item.valor > 0 ? credor : conta}
        <span aria-hidden="true">→</span>
        {item.valor > 0 ? conta : credor}
      </div>
    );
  }
  // Empréstimo para alguém (saiu da conta) ou dinheiro que a pessoa devolveu (entrou na conta)
  if (item.receber) {
    const conta = <span><small>{item.valor < 0 ? 'Saiu de' : 'Entrou em'}</small><b>{item.conta}</b></span>;
    const pessoa = <span><small>{item.valor < 0 ? 'Emprestado para' : 'Pago por'}</small><b>🤝 {item.pessoa || 'Pessoa'}</b></span>;
    return (
      <div className="detalhe__transf">
        {item.valor < 0 ? conta : pessoa}
        <span aria-hidden="true">→</span>
        {item.valor < 0 ? pessoa : conta}
      </div>
    );
  }
  // Dinheiro guardado num objetivo (ou retirado dele)
  if (item.objetivo) {
    const conta = <span><small>{item.valor < 0 ? 'Saiu de' : 'Entrou em'}</small><b>{item.conta}</b></span>;
    const objetivo = <span><small>Objetivo</small><b>🎯 {item.objetivoNome || 'Objetivo'}</b></span>;
    return (
      <div className="detalhe__transf">
        {item.valor < 0 ? conta : objetivo}
        <span aria-hidden="true">→</span>
        {item.valor < 0 ? objetivo : conta}
      </div>
    );
  }
  if (item.ajuste) {
    return (
      <div className="detalhe__transf">
        <span>
          <small>Ajuste de saldo da conta</small>
          <b>{item.conta}</b>
        </span>
      </div>
    );
  }
  const par = lista.filter((l) => l.transferencia === item.transferencia);
  const saida = par.find((l) => l.valor < 0) || item;
  const entrada = par.find((l) => l.valor > 0) || item;
  return (
    <div className="detalhe__transf">
      <span>
        <small>Saiu de</small>
        <b>{saida.conta}</b>
      </span>
      <span aria-hidden="true">→</span>
      <span>
        <small>Entrou em</small>
        <b>{entrada.conta}</b>
      </span>
    </div>
  );
}

export default function Lancamentos() {
  const local = useLocation();
  const [lista, setLista] = useState(carregar);
  const [mes, setMes] = useState(() => mesFinanceiro(dataDeHoje()));
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState(''); // "Lançado!" depois de salvar
  const [arquivo, setArquivo] = useState(null); // comprovante escolhido no formulário
  const [salvando, setSalvando] = useState(false);
  const campoComprovante = useRef(null);
  const campoAnexo = useRef(null);
  const [anexo, setAnexo] = useState(null); // { id, url, nome, tipo } do lançamento aberto
  const [filtro, setFiltro] = useState(null); // categoria escolhida nos atalhos
  const [selecionadoId, setSelecionadoId] = useState(null);
  const [editando, setEditando] = useState(null); // cópia do lançamento sendo editado
  const [categorias, setCategorias] = useState(carregarCategorias);
  const [busca, setBusca] = useState('');
  // Vindo dos cartões "Receitas do mês" / "Despesas do mês" do Painel: já abre filtrado por Ganhos ou Despesas
  const [filtros, setFiltros] = useState(() =>
    ['receita', 'despesa'].includes(local.state?.tipo) ? { ...FILTROS_VAZIOS, tipo: local.state.tipo } : FILTROS_VAZIOS
  );
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [reajustando, setReajustando] = useState(null); // modelo da conta fixa sendo reajustada
  const [encerrando, setEncerrando] = useState(null); // conta fixa sendo encerrada
  const campoBusca = useRef(null);

  // Vindo da lupa do Painel: já coloca o cursor na busca
  useEffect(() => {
    if (local.state?.buscar) campoBusca.current?.focus();
  }, [local.state]);
  const [removendo, setRemovendo] = useState(false); // modo "Remover categoria"
  const [novaCategoria, setNovaCategoria] = useState(null); // formulário "Adicionar categoria"
  const [erroCategoria, setErroCategoria] = useState('');

  // Sempre que a lista mudar, salva no aparelho
  // Salva e confere os avisos (ex.: orçamento da categoria chegando no limite)
  const primeiraVez = useRef(true);
  useEffect(() => {
    salvar(lista);
    if (primeiraVez.current) primeiraVez.current = false;
    else conferirAlertasAgora();
  }, [lista]);

  // Nomes das contas cadastradas na tela de Contas.
  // A pessoa pode digitar uma conta nova: ela é criada na hora de lançar.
  const [contas, setContas] = useState(nomesDasContas);
  const contaPadrao = contas[0] || '';

  // Formulário de novo lançamento (manual)
  const formularioVazio = (tipo = 'despesa', conta = contaPadrao) => ({
    titulo: '',
    valorTexto: '',
    tipo,
    data: dataDeHoje(),
    conta,
    para: '', // conta de destino (só na transferência)
    categoria: 'Outros',
    frequencia: 'unica', // 'unica' | 'fixo' (todo mês) | 'parcelado'
    parcelas: 2,
    valorDe: 'total', // parcelado: o valor digitado é o 'total' da compra ou o de 'parcela'
    jaPagas: 0, // parcelado: quantas parcelas já foram pagas antes (não entram nas contas)
  });
  const [novo, setNovo] = useState(() => formularioVazio(local.state?.tipo === 'receita' ? 'receita' : 'despesa'));
  const valorDoNovo = Math.abs(parseFloat(String(novo.valorTexto).replace(/\./g, '').replace(',', '.'))) || 0;
  const transferindo = novo.tipo === 'transferencia';
  const parcelado = !transferindo && novo.frequencia === 'parcelado';
  const qtdParcelas = Math.min(Math.max(parseInt(novo.parcelas, 10) || 0, 0), 48);
  const jaPagas = parcelado ? Math.min(Math.max(parseInt(novo.jaPagas, 10) || 0, 0), Math.max(qtdParcelas - 1, 0)) : 0;
  const valorDaParcela = parcelado && qtdParcelas ? (novo.valorDe === 'parcela' ? valorDoNovo : valorDoNovo / qtdParcelas) : 0;
  const cartoes = carregarContas().filter(ehCartao).map((c) => c.nome); // para escolher o cartão da compra parcelada
  const noCartao = cartoes.some((c) => mesmoNome(c, novo.conta));

  function mudarNovo(campo, valor) {
    setNovo((atual) => ({ ...atual, [campo]: valor }));
    setErro('');
    setAviso('');
  }

  const doMes = useMemo(
    () =>
      lista
        .filter((l) => mesFinanceiro(l.data) === mes)
        .sort((a, b) => b.data.localeCompare(a.data)),
    [lista, mes]
  );
  // Saldo do mês: transferência entre contas não é gasto nem ganho
  const saldoDoMes = doMes.filter((l) => !l.transferencia).reduce((soma, l) => soma + l.valor, 0);

  // ----- Busca com filtros -----
  const mesDeHoje = mesFinanceiro(dataDeHoje());
  function noPeriodo(l) {
    const m = mesFinanceiro(l.data);
    switch (filtros.periodo) {
      case '3m':
        return m >= mudarMes(mesDeHoje, -2) && m <= mesDeHoje;
      case '12m':
        return m >= mudarMes(mesDeHoje, -11) && m <= mesDeHoje;
      case 'ano':
        return l.data.slice(0, 4) === dataDeHoje().slice(0, 4);
      case 'tudo':
        return true;
      case 'entre':
        return (!filtros.de || l.data >= filtros.de) && (!filtros.ate || l.data <= filtros.ate);
      default:
        return m === mes;
    }
  }
  const termo = simplificar(busca.trim());
  const minimo = lerValorFiltro(filtros.minimo);
  const maximo = lerValorFiltro(filtros.maximo);
  const visiveis = lista
    .filter(noPeriodo)
    .filter((l) => !filtro || l.categoria === filtro)
    .filter((l) => !filtros.conta || l.conta === filtros.conta)
    .filter((l) => {
      if (filtros.tipo === 'despesa') return l.valor < 0 && !l.transferencia;
      if (filtros.tipo === 'receita') return l.valor > 0 && !l.transferencia;
      if (filtros.tipo === 'transferencia') return Boolean(l.transferencia);
      return true;
    })
    .filter((l) => !filtros.situacao || (filtros.situacao === 'pago' ? l.pago : !l.pago))
    .filter((l) => (minimo === null || Math.abs(l.valor) >= minimo) && (maximo === null || Math.abs(l.valor) <= maximo))
    .filter((l) => !termo || simplificar(`${l.descricao} ${l.categoria} ${l.conta} ${l.observacao || ''}`).includes(termo))
    .sort((a, b) => b.data.localeCompare(a.data));
  const filtrosAtivos =
    Object.entries(filtros).filter(([k, v]) => v !== FILTROS_VAZIOS[k]).length + (filtro ? 1 : 0) + (termo ? 1 : 0);
  const variosMeses = filtros.periodo !== 'mes';
  const resultado = {
    entradas: visiveis.filter((l) => l.valor > 0 && !l.transferencia).reduce((s, l) => s + l.valor, 0),
    saidas: visiveis.filter((l) => l.valor < 0 && !l.transferencia).reduce((s, l) => s - l.valor, 0),
  };
  function mudarFiltro(campo, valor) {
    setFiltros((atual) => ({ ...atual, [campo]: valor }));
  }
  function limparFiltros() {
    setFiltros(FILTROS_VAZIOS);
    setFiltro(null);
    setBusca('');
  }
  const selecionado = lista.find((l) => l.id === selecionadoId) || null;

  async function lancar(evento) {
    evento.preventDefault();
    if (salvando) return undefined;
    if (transferindo) return transferir();
    const titulo = novo.titulo.trim();
    if (!titulo) return setErro('Dê um título para o lançamento, por exemplo "Mercado".');
    if (!valorDoNovo) return setErro('Coloque o valor, por exemplo 45,90.');
    if (!novo.data) return setErro('Escolha a data.');
    if (parcelado && (qtdParcelas < 2 || qtdParcelas > 48)) return setErro('O número de parcelas vai de 2 a 48.');
    if (parcelado && (parseInt(novo.jaPagas, 10) || 0) >= qtdParcelas)
      return setErro('As parcelas já pagas precisam ser menos que o total de parcelas.');
    if (!novo.conta.trim()) return setErro('Diga em qual conta foi, por exemplo "Nubank" ou "Carteira".');

    // Se a conta ainda não existe, ela é criada na tela de Contas
    const { nome: nomeDaConta, criada: contaCriada } = garantirConta(novo.conta);
    if (contaCriada) setContas(nomesDasContas());

    const hoje = dataDeHoje();
    const sinal = novo.tipo === 'receita' ? 1 : -1;
    const vezes = parcelado ? qtdParcelas : 1;
    const grupo = vezes > 1 ? novoId() : null;

    // Divide o valor em centavos; a diferença dos centavos fica na 1ª parcela.
    // Se a pessoa digitou o valor de cada parcela, todas ficam com esse valor.
    const porParcela = parcelado && novo.valorDe === 'parcela';
    const totalCentavos = porParcela ? Math.round(valorDoNovo * 100) * vezes : Math.round(valorDoNovo * 100);
    const parcelaCentavos = Math.floor(totalCentavos / vezes);
    const sobra = totalCentavos - parcelaCentavos * vezes;
    const diaOriginal = Number(novo.data.slice(8));

    // Parcelas já pagas antes não são lançadas: a data do formulário é a da próxima parcela a pagar
    const novos = Array.from({ length: vezes - jaPagas }, (_, k) => {
      const i = k + jaPagas; // número da parcela (0 = 1ª)
      const mesDaParcela = mudarMes(novo.data.slice(0, 7), k);
      const dia = Math.min(diaOriginal, diasNoMes(mesDaParcela));
      const data = `${mesDaParcela}-${String(dia).padStart(2, '0')}`;
      const centavos = parcelaCentavos + (i === 0 ? sobra : 0);
      return {
        id: novoId(),
        data,
        descricao: vezes > 1 ? `${titulo} (${i + 1}/${vezes})` : titulo,
        categoria: novo.categoria,
        conta: nomeDaConta,
        valor: (sinal * centavos) / 100,
        pago: data <= hoje, // datas futuras ficam "a pagar"
        repete: novo.frequencia === 'fixo', // fixo: aparece todo mês (e no Checklist)
        observacao: '',
        ...(grupo ? { grupo, parcela: { numero: i + 1, total: vezes } } : {}),
      };
    });

    // Comprovante (opcional): guarda o arquivo e liga ao lançamento (a todas as parcelas)
    if (arquivo) {
      setSalvando(true);
      try {
        const registro = await guardarComprovante(arquivo, novos[0].id);
        novos.forEach((l) => {
          l.comprovanteId = registro.id;
        });
      } catch (e) {
        setSalvando(false);
        return setErro(e.message || 'Não foi possível guardar o comprovante.');
      }
      setSalvando(false);
    }

    setLista((atual) => [...novos, ...atual]);
    setMes(mesFinanceiro(novos[0].data));
    setSelecionadoId(novos[0].id);
    setEditando(null);
    setNovo(formularioVazio(novo.tipo, nomeDaConta));
    setArquivo(null);
    setErro('');
    const textoComprovante = arquivo ? ' Comprovante guardado.' : '';
    const textoBase =
      vezes > 1
        ? jaPagas
          ? `${vezes - jaPagas} parcelas lançadas (da ${jaPagas + 1}ª à ${vezes}ª), uma em cada mês. As ${jaPagas} já pagas ficaram de fora.`
          : `${vezes} parcelas lançadas, uma em cada mês.`
        : novo.frequencia === 'fixo'
          ? 'Conta fixa salva: ela aparece todo mês.'
          : 'Lançamento salvo.';
    const textoChecklist = novos[0].valor < 0 && (vezes > 1 || novo.frequencia === 'fixo') ? ' Já está no Checklist.' : '';
    const textoCartao = vezes > 1 && cartoes.some((c) => mesmoNome(c, nomeDaConta)) ? ' Cada parcela entra na fatura do cartão do seu mês.' : '';
    const textoConta = contaCriada ? ` Conta "${nomeDaConta}" criada.` : '';
    setAviso(textoBase + textoCartao + textoChecklist + textoConta + textoComprovante);
    return undefined;
  }

  // Transferência entre contas: sai de uma, entra na outra (não conta como gasto nem ganho)
  function transferir() {
    if (!valorDoNovo) return setErro('Coloque o valor, por exemplo 200,00.');
    if (!novo.data) return setErro('Escolha a data.');
    if (!novo.conta.trim()) return setErro('Diga de qual conta o dinheiro sai.');
    if (!novo.para.trim()) return setErro('Diga para qual conta o dinheiro vai.');
    if (mesmoNome(novo.conta, novo.para)) return setErro('Escolha duas contas diferentes.');
    const de = garantirConta(novo.conta);
    const para = garantirConta(novo.para);
    if (de.criada || para.criada) setContas(nomesDasContas());
    const par = criarTransferencia({ de: de.nome, para: para.nome, valor: valorDoNovo, data: novo.data, descricao: novo.titulo.trim() });
    setLista((atual) => [...par, ...atual]);
    setMes(mesFinanceiro(novo.data));
    setSelecionadoId(par[0].id);
    setEditando(null);
    setNovo({ ...formularioVazio('transferencia', de.nome), para: para.nome });
    setErro('');
    const criadas = [de, para].filter((c) => c.criada).map((c) => `"${c.nome}"`);
    setAviso(
      `Transferência salva: ${reais(valorDoNovo)} de ${de.nome} para ${para.nome}. Não conta como gasto nem ganho.` +
        (criadas.length ? ` Conta ${criadas.join(' e ')} criada.` : '')
    );
    return undefined;
  }

  // Mostra o comprovante do lançamento aberto
  const idDoAnexo = selecionado?.comprovanteId || null;
  useEffect(() => {
    let url = null;
    let ativo = true;
    if (!idDoAnexo) {
      setAnexo(null);
      return undefined;
    }
    pegarComprovante(idDoAnexo)
      .then((c) => {
        if (!ativo) return;
        if (!c) return setAnexo(null);
        url = URL.createObjectURL(c.blob);
        return setAnexo({ id: c.id, url, nome: c.nome, tipo: c.tipo });
      })
      .catch(() => setAnexo(null));
    return () => {
      ativo = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [idDoAnexo]);

  async function anexarComprovante(evento) {
    const escolhido = evento.target.files[0];
    evento.target.value = '';
    if (!escolhido || !selecionado) return;
    try {
      const registro = await guardarComprovante(escolhido, selecionado.id);
      const ids = selecionado.grupo ? lista.filter((l) => l.grupo === selecionado.grupo).map((l) => l.id) : [selecionado.id];
      setLista((atual) => atual.map((l) => (ids.includes(l.id) ? { ...l, comprovanteId: registro.id } : l)));
    } catch (e) {
      window.alert(e.message || 'Não foi possível guardar o comprovante.');
    }
  }

  async function desligarComprovante() {
    if (!selecionado?.comprovanteId) return;
    await vincularComprovante(selecionado.comprovanteId, null).catch(() => {});
    const id = selecionado.comprovanteId;
    setLista((atual) => atual.map((l) => (l.comprovanteId === id ? { ...l, comprovanteId: undefined } : l)));
  }

  function excluirParcelas(grupo) {
    const quantas = lista.filter((l) => l.grupo === grupo).length;
    if (!window.confirm(`Excluir as ${quantas} parcelas deste lançamento?`)) return;
    setLista((atual) => atual.filter((l) => l.grupo !== grupo));
    setSelecionadoId(null);
    setEditando(null);
  }

  // ----- Categorias: adicionar e remover -----
  function abrirNovaCategoria() {
    setRemovendo(false);
    setErroCategoria('');
    setNovaCategoria({ nome: '', emoji: EMOJIS[0], cor: CORES_CATEGORIA[0], tipo: 'despesa' });
  }

  function criarCategoria(evento) {
    evento.preventDefault();
    const nome = novaCategoria.nome.trim();
    if (!nome) return setErroCategoria('Dê um nome para a categoria.');
    if (categorias.some((c) => c.nome.toLowerCase() === nome.toLowerCase())) {
      return setErroCategoria('Já existe uma categoria com esse nome.');
    }
    const nova = { ...novaCategoria, nome };
    const atualizadas = [...categorias.filter((c) => c.nome !== 'Outros'), nova];
    salvarCategorias(atualizadas);
    setCategorias(carregarCategorias());
    setNovaCategoria(null);
    return undefined;
  }

  function removerCategoria(c) {
    const quantos = lista.filter((l) => l.categoria === c.nome).length;
    const aviso =
      quantos > 0
        ? `Remover a categoria "${c.nome}"? Os ${quantos} lançamentos dela passam para "Outros".`
        : `Remover a categoria "${c.nome}"?`;
    if (!window.confirm(aviso)) return;
    salvarCategorias(categorias.filter((item) => item.nome !== c.nome));
    setCategorias(carregarCategorias());
    if (quantos > 0) setLista((atual) => atual.map((l) => (l.categoria === c.nome ? { ...l, categoria: 'Outros' } : l)));
    if (filtro === c.nome) setFiltro(null);
  }

  // Fecha a janela de nova categoria com Esc
  useEffect(() => {
    if (!novaCategoria) return undefined;
    const aoTeclar = (e) => e.key === 'Escape' && setNovaCategoria(null);
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, [novaCategoria]);

  function excluir(id) {
    const item = lista.find((l) => l.id === id);
    if (item?.pagar) {
      const texto = item.valor > 0
        ? 'Excluir a entrada do empréstimo? A dívida continua em "A pagar", só sem esta entrada.'
        : item.jurosDePagar
          ? 'Excluir este lançamento de juros? O pagamento continua na tela "A pagar".'
          : 'Excluir este pagamento? Ele (e os juros pagos junto) também sai da tela "A pagar".';
      if (!window.confirm(texto)) return;
      const extras = lancamentoDePagarExcluido(item);
      setLista((atual) => atual.filter((l) => l.id !== item.id && !extras.includes(l.id)));
      setSelecionadoId(null);
      setEditando(null);
      return;
    }
    if (item?.receber) {
      const texto = item.valor < 0
        ? 'Excluir a saída do empréstimo? A conta a receber continua, só sem esta saída.'
        : item.jurosDeReceber
          ? 'Excluir este lançamento de juros? O recebimento continua na tela "A receber".'
          : 'Excluir este recebimento? Ele (e os juros pagos junto) também sai da tela "A receber".';
      if (!window.confirm(texto)) return;
      const extras = lancamentoDeReceberExcluido(item); // ex.: os juros do mesmo recebimento
      setLista((atual) => atual.filter((l) => l.id !== item.id && !extras.includes(l.id)));
      setSelecionadoId(null);
      setEditando(null);
      return;
    }
    if (item?.objetivo) {
      if (!window.confirm(`Excluir este movimento do objetivo "${item.objetivoNome || ''}"? O valor volta para ${item.valor < 0 ? 'a conta' : 'o objetivo'}.`)) return;
      desfazerMovimentoDoObjetivo(item);
      setLista((atual) => atual.filter((l) => l.id !== item.id));
      setSelecionadoId(null);
      setEditando(null);
      return;
    }
    if (item?.transferencia) {
      if (!window.confirm('Excluir esta transferência? Sai das duas contas.')) return;
      setLista((atual) => atual.filter((l) => l.transferencia !== item.transferencia));
      setSelecionadoId(null);
      setEditando(null);
      return;
    }
    if (!window.confirm('Excluir este lançamento?')) return;
    setLista((atual) => atual.filter((l) => l.id !== id));
    setSelecionadoId(null);
    setEditando(null);
  }

  function salvarEdicao(evento) {
    evento.preventDefault();
    const valor = Math.abs(parseFloat(String(editando.valorTexto).replace(/\./g, '').replace(',', '.')));
    if (!Number.isFinite(valor) || valor === 0) return;
    if (!editando.conta.trim()) return;
    const { nome: nomeDaConta, criada } = garantirConta(editando.conta);
    if (criada) setContas(nomesDasContas());
    const atualizado = {
      ...editando,
      conta: nomeDaConta,
      valor: editando.tipo === 'receita' ? valor : -valor,
    };
    delete atualizado.valorTexto;
    delete atualizado.tipo;
    setLista((atual) => atual.map((l) => (l.id === atualizado.id ? atualizado : l)));
    setEditando(null);
  }

  function comecarEdicao(l) {
    setEditando({
      ...l,
      tipo: l.valor >= 0 ? 'receita' : 'despesa',
      valorTexto: valorParaCampo(Math.abs(l.valor)),
    });
  }


  return (
    <div className="pp-app">
      <MenuLateral />

      <main className="pp lanc">
        <div className="pp__topo">
          <div>
            <h1 className="pp__titulo">Lançamentos</h1>
            <p className="pp__subtitulo">
              {nomeDoMes(mes)}
              {periodoDoMes(mes) && ` (${periodoDoMes(mes)})`} · saldo do mês{' '}
              <b className={saldoDoMes >= 0 ? 'valor--entrada' : 'valor--saida'}>{valorComSinal(saldoDoMes)}</b>
            </p>
          </div>
          <div className="lanc__mes">
            <button type="button" className="lanc__mes-botao" onClick={() => setMes(mudarMes(mes, -1))} aria-label="Mês anterior">
              ‹
            </button>
            <b>{nomeDoMes(mes)}</b>
            <button type="button" className="lanc__mes-botao" onClick={() => setMes(mudarMes(mes, 1))} aria-label="Próximo mês">
              ›
            </button>
          </div>
        </div>


        {/* ===== Novo lançamento (manual) ===== */}
        <form className="novo" onSubmit={lancar} noValidate>
          <div className="novo__topo">
            <h2 className="novo__titulo">Novo lançamento</h2>
            <div className="novo__tipo" role="group" aria-label="Despesa, ganho ou transferência">
              {[
                ['despesa', 'Despesa'],
                ['receita', 'Ganho'],
                ['transferencia', 'Transferência'],
              ].map(([valor, texto]) => (
                <button
                  key={valor}
                  type="button"
                  aria-pressed={novo.tipo === valor}
                  className={novo.tipo === valor ? `novo__tipo-botao novo__tipo-botao--${valor}` : 'novo__tipo-botao'}
                  onClick={() => mudarNovo('tipo', valor)}
                >
                  {texto}
                </button>
              ))}
            </div>
          </div>

          <div className="novo__grade">
            <label className="novo__campo novo__campo--titulo">
              {transferindo ? 'Descrição (opcional)' : 'Título'}
              <input
                autoComplete="off"
                placeholder={
                  transferindo ? 'Ex.: Guardar na poupança' : novo.tipo === 'receita' ? 'Ex.: Salário, Freela' : 'Ex.: Mercado, Aluguel'
                }
                value={novo.titulo}
                onChange={(e) => mudarNovo('titulo', e.target.value)}
              />
            </label>
            <label className="novo__campo">
              {parcelado ? (novo.valorDe === 'parcela' ? 'Valor de cada parcela (R$)' : 'Valor total (R$)') : 'Valor (R$)'}
              <input
                inputMode="decimal"
                autoComplete="off"
                placeholder="0,00"
                value={novo.valorTexto}
                onChange={(e) => mudarNovo('valorTexto', mascaraValor(e.target.value))}
              />
            </label>
            <label className="novo__campo">
              {parcelado ? (jaPagas ? `Data da ${jaPagas + 1}ª parcela` : 'Data da 1ª parcela') : 'Data'}
              <input type="date" value={novo.data} onChange={(e) => mudarNovo('data', e.target.value)} />
            </label>
            <label className="novo__campo">
              {transferindo ? 'De (conta)' : 'Conta'}
              <input
                list="lista-de-contas"
                autoComplete="off"
                placeholder="Ex.: Nubank"
                value={novo.conta}
                onChange={(e) => mudarNovo('conta', e.target.value)}
              />
            </label>
            {transferindo ? (
              <label className="novo__campo">
                Para (conta)
                <input
                  list="lista-de-contas"
                  autoComplete="off"
                  placeholder="Ex.: Poupança"
                  value={novo.para}
                  onChange={(e) => mudarNovo('para', e.target.value)}
                />
              </label>
            ) : (
              <label className="novo__campo">
                Categoria
                <select value={novo.categoria} onChange={(e) => mudarNovo('categoria', e.target.value)}>
                  {categorias.map((c) => (
                    <option key={c.nome} value={c.nome}>
                      {c.emoji} {c.nome}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>

          <div className="novo__rodape">
            {transferindo ? (
              <span className="novo__resumo novo__resumo--transf">
                🔁 Muda o dinheiro de conta. Não entra como gasto nem como ganho nos relatórios.
              </span>
            ) : (
            <>
            <div className="novo__frequencia" role="group" aria-label="Repetição">
              {[
                ['unica', 'Uma vez'],
                ['fixo', 'Fixo (todo mês)'],
                ['parcelado', 'Parcelado'],
              ].map(([valor, texto]) => (
                <button
                  key={valor}
                  type="button"
                  aria-pressed={novo.frequencia === valor}
                  className={novo.frequencia === valor ? 'novo__frequencia-botao novo__frequencia-botao--ativo' : 'novo__frequencia-botao'}
                  onClick={() => mudarNovo('frequencia', valor)}
                >
                  {texto}
                </button>
              ))}
            </div>
            {parcelado && (
              <label className="novo__parcelas">
                em
                <input
                  type="number"
                  min={2}
                  max={48}
                  value={novo.parcelas}
                  onChange={(e) => mudarNovo('parcelas', e.target.value)}
                  aria-label="Número de parcelas"
                />
                vezes
              </label>
            )}
            {novo.frequencia === 'fixo' && <span className="novo__resumo">Aparece todo mês e no Checklist</span>}
            {parcelado && (
              <div className="novo__parcelado">
                <div className="novo__valor-de" role="group" aria-label="O valor digitado é">
                  <span>O valor é</span>
                  {[
                    ['total', 'da compra toda'],
                    ['parcela', 'de cada parcela'],
                  ].map(([v, t]) => (
                    <button
                      key={v}
                      type="button"
                      aria-pressed={novo.valorDe === v}
                      className={novo.valorDe === v ? 'novo__mini novo__mini--ativo' : 'novo__mini'}
                      onClick={() => mudarNovo('valorDe', v)}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <label className="novo__parcelas">
                  já paguei
                  <input
                    id="novo-ja-pagas"
                    type="number"
                    min={0}
                    max={Math.max(qtdParcelas - 1, 0)}
                    value={novo.jaPagas}
                    onChange={(e) => mudarNovo('jaPagas', e.target.value)}
                    aria-label="Parcelas já pagas"
                  />
                  parcelas
                </label>
                {cartoes.length > 0 && (
                  <label className="novo__parcelas">
                    no cartão
                    <select
                      id="novo-cartao"
                      value={noCartao ? cartoes.find((c) => mesmoNome(c, novo.conta)) : ''}
                      onChange={(e) => mudarNovo('conta', e.target.value || contaPadrao)}
                      aria-label="Cartão de crédito da compra"
                    >
                      <option value="">Não é no cartão</option>
                      {cartoes.map((c) => (
                        <option key={c} value={c}>
                          💳 {c}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
            )}
            {parcelado && valorDoNovo > 0 && qtdParcelas >= 2 && (
              <span className="novo__resumo">
                {qtdParcelas}x de {reais(valorDaParcela)}
                {jaPagas ? ` · ${jaPagas} já pagas, faltam ${qtdParcelas - jaPagas}` : ', uma por mês'}
                {noCartao ? ' · na fatura do cartão' : ''}
              </span>
            )}
            <button type="button" className={arquivo ? 'novo__anexo novo__anexo--ok' : 'novo__anexo'} onClick={() => campoComprovante.current?.click()}>
              <IconeClipe tamanho={16} espessura={2.2} />
              {arquivo ? arquivo.name : 'Anexar comprovante'}
            </button>
            {arquivo && (
              <button type="button" className="novo__anexo-tirar" onClick={() => setArquivo(null)} aria-label="Tirar comprovante">
                ×
              </button>
            )}
            </>
            )}
            <input
              ref={campoComprovante}
              type="file"
              accept={TIPOS_ACEITOS}
              hidden
              onChange={(e) => {
                setArquivo(e.target.files[0] || null);
                e.target.value = '';
                setErro('');
                setAviso('');
              }}
            />
            <button type="submit" className="novo__botao" disabled={salvando}>
              Lançar
              <IconeSeta tamanho={18} espessura={2.4} />
            </button>
          </div>
          {erro && <p className="novo__erro">{erro}</p>}
          {aviso && (
            <p className="novo__ok" role="status">
              {aviso}
            </p>
          )}
        </form>

        {/* ===== Atalhos de categoria (filtram a lista) + adicionar/remover ===== */}
        <div className="atalhos" role="group" aria-label={removendo ? 'Remover categoria' : 'Filtrar por categoria'}>
          {categorias
            .filter((c) => c.nome !== 'Outros')
            // Com o filtro de Ganhos ou Despesas, só aparecem as categorias daquele tipo
            .filter((c) => !['receita', 'despesa'].includes(filtros.tipo) || !c.tipo || c.tipo === filtros.tipo)
            .map((c) => (
              <button
                key={c.nome}
                type="button"
                className={[
                  'atalho',
                  filtro === c.nome && !removendo ? 'atalho--ativo' : '',
                  removendo ? 'atalho--removendo' : '',
                ].join(' ')}
                aria-pressed={removendo ? undefined : filtro === c.nome}
                aria-label={removendo ? `Remover ${c.nome}` : undefined}
                onClick={() => (removendo ? removerCategoria(c) : setFiltro(filtro === c.nome ? null : c.nome))}
              >
                <span className="atalho__icone" style={{ background: c.cor }}>
                  {c.emoji}
                  {removendo && <span className="atalho__x" aria-hidden="true">×</span>}
                </span>
                {c.nome}
              </button>
            ))}
          <button type="button" className="atalho atalho--acao" onClick={abrirNovaCategoria}>
            <span className="atalho__icone atalho__icone--acao" aria-hidden="true">
              +
            </span>
            Adicionar
          </button>
          <button
            type="button"
            className={removendo ? 'atalho atalho--acao atalho--ativo' : 'atalho atalho--acao'}
            aria-pressed={removendo}
            onClick={() => setRemovendo(!removendo)}
          >
            <span className="atalho__icone atalho__icone--acao" aria-hidden="true">
              {removendo ? '✓' : '−'}
            </span>
            {removendo ? 'Pronto' : 'Remover'}
          </button>
        </div>
        {removendo && <p className="atalhos__dica">Toque na categoria que quer remover. Os lançamentos dela vão para “Outros”.</p>}

        <div className="lanc__colunas">
          {/* ===== Lista ===== */}
          <section className="cartao lanc__lista">
            <div className="cartao__titulo-linha">
              <h2 className="cartao__titulo">
                {filtrosAtivos === 1 && !filtro && filtros.tipo === 'despesa'
                  ? 'Despesas do mês'
                  : filtrosAtivos === 1 && !filtro && filtros.tipo === 'receita'
                    ? 'Ganhos do mês'
                    : filtrosAtivos
                      ? 'Resultado da busca'
                      : 'Lançamentos do mês'}
                {filtro ? ` · ${filtro}` : ''}
              </h2>
              <div className="lanc__ferramentas">
                <button
                  type="button"
                  className={mostrarFiltros || filtrosAtivos ? 'lanc__filtros-botao lanc__filtros-botao--ativo' : 'lanc__filtros-botao'}
                  aria-expanded={mostrarFiltros}
                  onClick={() => setMostrarFiltros(!mostrarFiltros)}
                >
                  Filtros{filtrosAtivos ? ` (${filtrosAtivos})` : ''}
                </button>
                <label className="lanc__busca">
                  <IconeBusca tamanho={16} espessura={2.2} />
                  <input
                    ref={campoBusca}
                    type="search"
                    placeholder="Buscar"
                    aria-label="Buscar lançamento"
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                  />
                </label>
              </div>
            </div>

            {mostrarFiltros && (
              <div className="lanc-filtros">
                <label className="lanc-filtros__campo">
                  Período
                  <select value={filtros.periodo} onChange={(e) => mudarFiltro('periodo', e.target.value)}>
                    {PERIODOS.map(([id, texto]) => (
                      <option key={id} value={id}>
                        {id === 'mes' ? `${texto} (${nomeDoMes(mes)})` : texto}
                      </option>
                    ))}
                  </select>
                </label>
                {filtros.periodo === 'entre' && (
                  <>
                    <label className="lanc-filtros__campo">
                      De
                      <input type="date" value={filtros.de} onChange={(e) => mudarFiltro('de', e.target.value)} />
                    </label>
                    <label className="lanc-filtros__campo">
                      Até
                      <input type="date" value={filtros.ate} onChange={(e) => mudarFiltro('ate', e.target.value)} />
                    </label>
                  </>
                )}
                <label className="lanc-filtros__campo">
                  Conta
                  <select value={filtros.conta} onChange={(e) => mudarFiltro('conta', e.target.value)}>
                    <option value="">Todas</option>
                    {[...new Set([...contas, ...lista.map((l) => l.conta)])].map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="lanc-filtros__campo">
                  Tipo
                  <select value={filtros.tipo} onChange={(e) => mudarFiltro('tipo', e.target.value)}>
                    <option value="">Todos</option>
                    <option value="despesa">Despesas</option>
                    <option value="receita">Ganhos</option>
                    <option value="transferencia">Transferências</option>
                  </select>
                </label>
                <label className="lanc-filtros__campo">
                  Situação
                  <select value={filtros.situacao} onChange={(e) => mudarFiltro('situacao', e.target.value)}>
                    <option value="">Todas</option>
                    <option value="pago">Pagos / recebidos</option>
                    <option value="pendente">Pendentes</option>
                  </select>
                </label>
                <label className="lanc-filtros__campo">
                  Valor de (R$)
                  <input inputMode="decimal" placeholder="0,00" value={filtros.minimo} onChange={(e) => mudarFiltro('minimo', mascaraValor(e.target.value))} />
                </label>
                <label className="lanc-filtros__campo">
                  até (R$)
                  <input inputMode="decimal" placeholder="sem limite" value={filtros.maximo} onChange={(e) => mudarFiltro('maximo', mascaraValor(e.target.value))} />
                </label>
                <p className="lanc-filtros__dica">A categoria é escolhida nos atalhos acima da lista.</p>
              </div>
            )}

            {filtrosAtivos > 0 && (
              <div className="lanc-resultado" role="status">
                <span>
                  <b>{visiveis.length}</b> {visiveis.length === 1 ? 'lançamento' : 'lançamentos'}
                </span>
                <span className="valor--entrada">
                  Entradas <b>{reais(resultado.entradas)}</b>
                </span>
                <span className="valor--saida">
                  Saídas <b>{reais(resultado.saidas)}</b>
                </span>
                <span>
                  Saldo <b>{valorComSinal(resultado.entradas - resultado.saidas)}</b>
                </span>
                <button type="button" className="lanc-resultado__limpar" onClick={limparFiltros}>
                  Limpar filtros
                </button>
              </div>
            )}

            {visiveis.length === 0 ? (
              <p className="lanc__vazio">
                {filtrosAtivos ? 'Nada encontrado com esses filtros.' : 'Nenhum lançamento neste mês ainda. Use o “Novo lançamento” acima.'}
              </p>
            ) : (
              <ul className="movs">
                {visiveis.map((l) => (
                  <li key={l.id}>
                    <button
                      type="button"
                      className={l.id === selecionadoId ? 'mov mov--ativa' : 'mov'}
                      onClick={() => {
                        setSelecionadoId(l.id);
                        setEditando(null);
                        // Em telas pequenas os detalhes ficam embaixo da lista: rola até eles
                        if (window.innerWidth <= 1100) {
                          setTimeout(() => document.querySelector('.detalhe')?.scrollIntoView({ behavior: 'smooth' }), 50);
                        }
                      }}
                    >
                      <span className="mov__cor" style={{ background: categoria(l.categoria).cor }} />
                      <span className="mov__data">{variosMeses ? dataComAno(l.data) : dataCurta(l.data)}</span>
                      <b className="mov__nome">{l.descricao}</b>
                      <span className="mov__categoria">{l.transferencia ? `${l.categoria} · ${l.conta}` : l.categoria}</span>
                      <b className={l.transferencia ? 'mov__valor valor--transf' : l.valor >= 0 ? 'mov__valor valor--entrada' : 'mov__valor valor--saida'}>
                        {valorComSinal(l.valor)}
                      </b>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* ===== Detalhes / edição ===== */}
          <aside className={selecionado ? 'cartao detalhe' : 'cartao detalhe detalhe--sem-selecao'} aria-live="polite">
            {!selecionado && (
              <div className="detalhe__vazio">
                <span className="detalhe__vazio-icone">👆</span>
                Clique em um lançamento para ver os detalhes.
              </div>
            )}

            {selecionado && !editando && (
              <>
                <div className="detalhe__topo">
                  <span className="detalhe__rotulo">Detalhes</span>
                  <button type="button" className="detalhe__fechar" onClick={() => setSelecionadoId(null)} aria-label="Fechar detalhes">
                    ×
                  </button>
                </div>
                <div className="detalhe__cabecalho">
                  <span className="detalhe__icone" style={{ background: categoria(selecionado.categoria).cor }}>
                    {categoria(selecionado.categoria).emoji}
                  </span>
                  <div>
                    <b className="detalhe__nome">{selecionado.descricao}</b>
                    <div className="detalhe__cat">{selecionado.categoria}</div>
                  </div>
                </div>
                <div
                  className={
                    selecionado.transferencia
                      ? 'detalhe__valor valor--transf'
                      : selecionado.valor >= 0
                        ? 'detalhe__valor valor--entrada'
                        : 'detalhe__valor valor--saida'
                  }
                >
                  {selecionado.transferencia ? reais(Math.abs(selecionado.valor)) : valorComSinal(selecionado.valor)}
                </div>
                {selecionado.transferencia && <DetalheTransferencia item={selecionado} lista={lista} />}
                <dl className="detalhe__dados">
                  <div>
                    <dt>Data</dt>
                    <dd>{dataPorExtenso(selecionado.data)}</dd>
                  </div>
                  <div>
                    <dt>Conta</dt>
                    <dd>{selecionado.conta}</dd>
                  </div>
                  <div>
                    <dt>Situação</dt>
                    <dd>
                      <span className="detalhe__status">
                        {selecionado.pago ? (selecionado.valor >= 0 ? 'Recebido' : 'Pago') : 'Pendente'}
                      </span>
                    </dd>
                  </div>
                  {selecionado.parcela && (
                    <div>
                      <dt>Parcela</dt>
                      <dd>
                        {selecionado.parcela.numero} de {selecionado.parcela.total}
                      </dd>
                    </div>
                  )}
                  {!selecionado.transferencia && (
                    <div>
                      <dt>Repete</dt>
                      <dd>
                        {selecionado.repete
                          ? selecionado.ate
                            ? `Todo mês, até ${mesCurto(selecionado.ate)}`
                            : 'Todo mês'
                          : selecionado.origem
                            ? 'Conta fixa (mês confirmado)'
                            : 'Não'}
                      </dd>
                    </div>
                  )}
                  <div>
                    <dt>Observação</dt>
                    <dd>{selecionado.observacao || '—'}</dd>
                  </div>
                </dl>
                {versaoAtualDaFixa(selecionado, lista) && (
                  <div className="detalhe__fixa">
                    {versaoAtualDaFixa(selecionado, lista).encerradaEm ? (
                      <>
                        <span>
                          <b>Conta fixa encerrada</b>
                          Parou a partir de {nomeDoMes(versaoAtualDaFixa(selecionado, lista).encerradaEm).toLowerCase()}.
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setLista(reativarFixa(lista, versaoAtualDaFixa(selecionado, lista)));
                            setAviso('A conta fixa voltou a repetir todo mês.');
                          }}
                        >
                          Reativar
                        </button>
                      </>
                    ) : (
                      <>
                        <span>
                          <b>Conta fixa</b>
                          {historicoDaFixa(modeloDaFixa(selecionado, lista), lista).length > 1
                            ? `${historicoDaFixa(modeloDaFixa(selecionado, lista), lista).length} valores no histórico`
                            : 'O valor mudou? Reajuste sem perder o histórico.'}
                        </span>
                        <span className="detalhe__fixa-botoes">
                          <button type="button" onClick={() => setReajustando(modeloDaFixa(selecionado, lista))}>
                            Reajustar valor
                          </button>
                          <button type="button" className="detalhe__fixa-encerrar" onClick={() => setEncerrando(versaoAtualDaFixa(selecionado, lista))}>
                            Encerrar
                          </button>
                        </span>
                      </>
                    )}
                  </div>
                )}
                {!selecionado.transferencia && (
                <div className="detalhe__comprovante">
                  {anexo ? (
                    <>
                      <a href={anexo.url} target="_blank" rel="noopener noreferrer" className="detalhe__comprovante-ver">
                        {anexo.tipo.startsWith('image/') ? <img src={anexo.url} alt="" /> : <span className="detalhe__pdf">PDF</span>}
                        <span>
                          <b>Comprovante</b>
                          <small>{anexo.nome}</small>
                        </span>
                      </a>
                      <button type="button" className="detalhe__comprovante-tirar" onClick={desligarComprovante}>
                        Desligar
                      </button>
                    </>
                  ) : (
                    <button type="button" className="detalhe__comprovante-anexar" onClick={() => campoAnexo.current?.click()}>
                      <IconeClipe tamanho={16} espessura={2.2} />
                      Anexar comprovante
                    </button>
                  )}
                  <input ref={campoAnexo} type="file" accept={TIPOS_ACEITOS} hidden onChange={anexarComprovante} />
                </div>
                )}
                <div className="detalhe__acoes">
                  {!selecionado.transferencia && (
                    <button type="button" className="detalhe__editar" onClick={() => comecarEdicao(selecionado)}>
                      Editar
                    </button>
                  )}
                  <button type="button" className="detalhe__excluir" onClick={() => excluir(selecionado.id)}>
                    {selecionado.objetivo || ((selecionado.receber || selecionado.pagar) && selecionado.transferencia) ? 'Excluir movimento' : selecionado.transferencia ? 'Excluir transferência' : selecionado.grupo ? 'Excluir esta' : 'Excluir'}
                  </button>
                </div>
                {selecionado.grupo && (
                  <button type="button" className="detalhe__excluir-todas" onClick={() => excluirParcelas(selecionado.grupo)}>
                    Excluir todas as parcelas
                  </button>
                )}
              </>
            )}

            {editando && (
              <form className="edicao" onSubmit={salvarEdicao}>
                <div className="detalhe__topo">
                  <span className="detalhe__rotulo">Editar lançamento</span>
                  <button type="button" className="detalhe__fechar" onClick={() => setEditando(null)} aria-label="Cancelar edição">
                    ×
                  </button>
                </div>

                <div className="edicao__tipo" role="group" aria-label="Tipo">
                  {['receita', 'despesa'].map((t) => (
                    <button
                      key={t}
                      type="button"
                      aria-pressed={editando.tipo === t}
                      className={editando.tipo === t ? `edicao__tipo-botao edicao__tipo-botao--${t}` : 'edicao__tipo-botao'}
                      onClick={() => setEditando({ ...editando, tipo: t })}
                    >
                      {t === 'receita' ? 'Receita' : 'Despesa'}
                    </button>
                  ))}
                </div>

                <label className="edicao__campo">
                  Descrição
                  <input value={editando.descricao} onChange={(e) => setEditando({ ...editando, descricao: e.target.value })} required />
                </label>
                <div className="edicao__dupla">
                  <label className="edicao__campo">
                    Valor (R$)
                    <input inputMode="decimal" value={editando.valorTexto} onChange={(e) => setEditando({ ...editando, valorTexto: mascaraValor(e.target.value) })} required />
                  </label>
                  <label className="edicao__campo">
                    Data
                    <input type="date" value={editando.data} onChange={(e) => setEditando({ ...editando, data: e.target.value })} required />
                  </label>
                </div>
                <div className="edicao__dupla">
                  <label className="edicao__campo">
                    Categoria
                    <select value={editando.categoria} onChange={(e) => setEditando({ ...editando, categoria: e.target.value })}>
                      {categorias.map((c) => (
                        <option key={c.nome}>{c.nome}</option>
                      ))}
                    </select>
                  </label>
                  <label className="edicao__campo">
                    Conta
                    <input
                      list="lista-de-contas"
                      autoComplete="off"
                      value={editando.conta}
                      onChange={(e) => setEditando({ ...editando, conta: e.target.value })}
                      required
                    />
                  </label>
                </div>
                <label className="edicao__campo">
                  Observação
                  <input value={editando.observacao} onChange={(e) => setEditando({ ...editando, observacao: e.target.value })} />
                </label>
                <label className="edicao__check">
                  <input type="checkbox" checked={editando.pago} onChange={(e) => setEditando({ ...editando, pago: e.target.checked })} />
                  Já foi pago / recebido
                </label>
                <label className="edicao__check">
                  <input type="checkbox" checked={editando.repete} onChange={(e) => setEditando({ ...editando, repete: e.target.checked })} />
                  Repete todo mês
                </label>

                <div className="detalhe__acoes">
                  <button type="submit" className="detalhe__editar">
                    Salvar
                  </button>
                  <button type="button" className="detalhe__cancelar" onClick={() => setEditando(null)}>
                    Cancelar
                  </button>
                </div>
              </form>
            )}
          </aside>
        </div>

        {/* ===== Janela: reajustar conta fixa ===== */}
        {reajustando && (
          <ReajustarFixa
            modelo={reajustando}
            lista={lista}
            aoFechar={() => setReajustando(null)}
            aoSalvar={(novaLista, { novoValor, aPartirDe }) => {
              setLista(novaLista);
              setReajustando(null);
              setAviso(`Conta fixa reajustada para ${reais(novoValor)} a partir de ${nomeDoMes(aPartirDe).toLowerCase()}.`);
            }}
          />
        )}

        {/* ===== Janela: encerrar conta fixa ===== */}
        {encerrando && (
          <EncerrarFixa
            modelo={encerrando}
            lista={lista}
            aoFechar={() => setEncerrando(null)}
            aoSalvar={(novaLista, { aPartirDe }) => {
              setLista(novaLista);
              setEncerrando(null);
              setSelecionadoId(null);
              setAviso(`Conta fixa encerrada a partir de ${nomeDoMes(aPartirDe).toLowerCase()}.`);
            }}
          />
        )}

        {/* Sugestões de conta (as que já existem) para os campos "Conta" */}
        <datalist id="lista-de-contas">
          {contas.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>

        {/* ===== Janela: nova categoria ===== */}
        {novaCategoria && (
          <div className="cat-fundo" onClick={() => setNovaCategoria(null)}>
            <form
              className="cat-janela"
              role="dialog"
              aria-modal="true"
              aria-labelledby="cat-titulo"
              onSubmit={criarCategoria}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="cat-janela__topo">
                <h2 id="cat-titulo">Nova categoria</h2>
                <button type="button" className="cat-janela__fechar" onClick={() => setNovaCategoria(null)} aria-label="Fechar">
                  ×
                </button>
              </div>

              <div className="cat-previa">
                <span className="atalho__icone" style={{ background: novaCategoria.cor }}>
                  {novaCategoria.emoji}
                </span>
                <b>{novaCategoria.nome.trim() || 'Nome da categoria'}</b>
              </div>

              <label className="cat-campo">
                Nome
                <input
                  autoFocus
                  placeholder="Ex.: Pet, Educação, Roupas"
                  maxLength={20}
                  value={novaCategoria.nome}
                  onChange={(e) => {
                    setNovaCategoria({ ...novaCategoria, nome: e.target.value });
                    setErroCategoria('');
                  }}
                />
              </label>

              <div className="edicao__tipo" role="group" aria-label="Tipo">
                {['despesa', 'receita'].map((t) => (
                  <button
                    key={t}
                    type="button"
                    aria-pressed={novaCategoria.tipo === t}
                    className={novaCategoria.tipo === t ? `edicao__tipo-botao edicao__tipo-botao--${t}` : 'edicao__tipo-botao'}
                    onClick={() => setNovaCategoria({ ...novaCategoria, tipo: t })}
                  >
                    {t === 'receita' ? 'Receita' : 'Despesa'}
                  </button>
                ))}
              </div>

              <fieldset className="cat-opcoes">
                <legend>Ícone</legend>
                {EMOJIS.map((emoji) => (
                  <label key={emoji} className="cat-opcao">
                    <input
                      type="radio"
                      name="emoji"
                      checked={novaCategoria.emoji === emoji}
                      onChange={() => setNovaCategoria({ ...novaCategoria, emoji })}
                    />
                    <span aria-hidden="true">{emoji}</span>
                  </label>
                ))}
              </fieldset>

              <fieldset className="cat-opcoes">
                <legend>Cor</legend>
                {CORES_CATEGORIA.map((cor) => (
                  <label key={cor} className="cat-opcao cat-opcao--cor" style={{ background: cor }}>
                    <input
                      type="radio"
                      name="cor"
                      checked={novaCategoria.cor === cor}
                      onChange={() => setNovaCategoria({ ...novaCategoria, cor })}
                      aria-label={`Cor ${cor}`}
                    />
                  </label>
                ))}
              </fieldset>

              {erroCategoria && <p className="cat-erro">{erroCategoria}</p>}

              <div className="detalhe__acoes">
                <button type="submit" className="detalhe__editar">
                  Criar categoria
                </button>
                <button type="button" className="detalhe__cancelar" onClick={() => setNovaCategoria(null)}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
