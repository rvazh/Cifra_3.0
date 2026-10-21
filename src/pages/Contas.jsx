import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import MenuLateral from '../components/MenuLateral.jsx';
import { IconeMais, IconeCima, IconeBaixo, IconeEnviar } from '../components/Icones.jsx';
import ImportarOFX from '../components/ImportarOFX.jsx';
import Transferir from '../components/Transferir.jsx';
import { reais } from '../components/Graficos.jsx';
import { carregar, salvar, novoId, dataCurta, nomeDoMes, dataDeHoje, TRANSFERENCIA } from '../dados/lancamentos.js';
import { TIPOS, CORES, carregarContas, salvarContas, resumoDaConta, mesmoNome, ehCartao, resumoDoCartao } from '../dados/contas.js';
import { lerArquivoOFX } from '../dados/ofx.js';
import { lerArquivoCSV } from '../dados/csv.js';
import './Painel.css';
import './Contas.css';
import { mascaraValor, valorParaCampo } from '../dados/dinheiro.js';
import { carregarReceber, salvarReceber, registrarRecebimento } from '../dados/receber.js';
import { carregarPagar, salvarPagar, registrarPagamento } from '../dados/pagar.js';

function valorComSinal(valor) {
  return `${valor >= 0 ? '+ ' : '− '}${reais(Math.abs(valor))}`;
}

// Saldo pode ser negativo (cheque especial): mostra o sinal de menos
function saldoTexto(valor) {
  return valor < 0 ? `− ${reais(Math.abs(valor))}` : reais(valor);
}

// "1.234,56" -> 1234.56 (aceita sinal de menos)
function lerNumero(texto) {
  const limpo = String(texto).replace(/\s|R\$/gi, '').replace(/\./g, '').replace(',', '.');
  const numero = parseFloat(limpo);
  return Number.isFinite(numero) ? numero : null;
}

const CONTA_VAZIA = {
  nome: '',
  tipo: 'Conta corrente',
  saldoTexto: '',
  cor: CORES[0],
  noTotal: true,
  limiteTexto: '',
  fechamento: '',
  vencimento: '',
};

// Dias 1 a 31 para fechamento e vencimento do cartão
const DIAS = Array.from({ length: 31 }, (_, i) => i + 1);

const SITUACAO_FATURA = {
  paga: { texto: 'Paga', classe: 'paga' },
  'a-pagar': { texto: 'A pagar', classe: 'apagar' },
  vencida: { texto: 'Vencida', classe: 'vencida' },
  'sem-fatura': { texto: 'Sem compras', classe: 'vazia' },
};

export default function Contas() {
  const [contas, setContas] = useState(carregarContas);
  const [lancamentos, setLancamentos] = useState(carregar);
  const [formulario, setFormulario] = useState(null); // conta sendo criada ou editada
  const [erro, setErro] = useState('');
  const [extrato, setExtrato] = useState(null); // OFX lido, esperando a conferência
  const [avisoImportacao, setAvisoImportacao] = useState(null); // { tipo: 'ok' | 'erro', texto }
  const campoOFX = useRef(null);
  const [modoImportacao, setModoImportacao] = useState('conta'); // 'conta' (extrato) ou 'cartao' (fatura)
  const [transferencia, setTransferencia] = useState(null); // janela de transferência aberta (com valores iniciais)

  // Sempre que algo mudar, salva no aparelho
  useEffect(() => salvarContas(contas), [contas]);
  useEffect(() => salvar(lancamentos), [lancamentos]);

  // Fecha o formulário com a tecla Esc
  useEffect(() => {
    if (!formulario) return undefined;
    const aoTeclar = (e) => e.key === 'Escape' && setFormulario(null);
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, [formulario]);

  const comResumo = contas.map((c) => ({ ...c, ...resumoDaConta(c, lancamentos) }));
  const contasComuns = comResumo.filter((c) => !ehCartao(c));
  const cartoes = comResumo.filter((c) => ehCartao(c)).map((c) => ({ ...c, cartao: resumoDoCartao(c, lancamentos) }));
  const noTotal = comResumo.filter((c) => c.noTotal);
  const saldoTotal = noTotal.reduce((s, c) => s + c.saldo, 0);
  const previstoTotal = noTotal.reduce((s, c) => s + c.previsto, 0);
  const entradasMes = noTotal.reduce((s, c) => s + c.entradas, 0);
  const saidasMes = noTotal.reduce((s, c) => s + c.saidas, 0);
  const positivos = noTotal.filter((c) => c.saldo > 0);
  const somaPositivos = positivos.reduce((s, c) => s + c.saldo, 0);

  function abrirNova(tipo = 'Conta corrente') {
    setErro('');
    const cartao = tipo === 'Cartão de crédito';
    setFormulario({ ...CONTA_VAZIA, tipo, noTotal: !cartao, cor: CORES[contas.length % CORES.length] });
  }

  function abrirEdicao(conta) {
    setErro('');
    const cartao = ehCartao(conta);
    // Conta comum: o campo mostra o saldo de HOJE. Se a pessoa mudar, a diferença vira um lançamento datado de hoje
    // (assim os meses passados dos gráficos não mudam).
    const saldoHoje = Math.round(resumoDaConta(conta, lancamentos).saldo * 100) / 100;
    setFormulario({
      ...conta,
      saldoAntes: saldoHoje,
      // No cartão, o "saldo inicial" é o que já se devia (fica negativo); no formulário aparece positivo
      saldoTexto: cartao ? valorParaCampo(-conta.saldoInicial) : valorParaCampo(saldoHoje, { vazioSeZero: false }),
      limiteTexto: conta.limite ? valorParaCampo(conta.limite) : '',
      fechamento: conta.fechamento || '',
      vencimento: conta.vencimento || '',
    });
  }

  function mudarTipo(tipo) {
    const cartao = tipo === 'Cartão de crédito';
    setFormulario({
      ...formulario,
      tipo,
      // Cartão novo começa fora do saldo total (o dinheiro sai da conta quando a fatura é paga)
      noTotal: formulario.id ? formulario.noTotal : !cartao,
    });
  }

  function salvarFormulario(evento) {
    evento.preventDefault();
    const nome = formulario.nome.trim();
    const cartao = formulario.tipo === 'Cartão de crédito';
    const numero = lerNumero(formulario.saldoTexto || '0');
    if (!nome) return setErro('Dê um nome para a conta.');
    if (numero === null) return setErro('O valor precisa ser um número, por exemplo 1.250,00.');
    const saldoInicial = cartao ? -Math.abs(numero) : numero;
    const limite = cartao ? lerNumero(formulario.limiteTexto || '0') : null;
    if (cartao && (limite === null || limite < 0)) return setErro('O limite precisa ser um número, por exemplo 3.000,00.');
    if (cartao && (!formulario.fechamento || !formulario.vencimento)) {
      return setErro('Escolha o dia em que a fatura fecha e o dia em que ela vence.');
    }
    const repetida = contas.some((c) => c.nome.toLowerCase() === nome.toLowerCase() && c.id !== formulario.id);
    if (repetida) return setErro('Já existe uma conta com esse nome.');

    const antiga = formulario.id ? contas.find((c) => c.id === formulario.id) : null;
    const hoje = dataDeHoje();
    // Conta comum: o valor digitado não muda o passado. Vira lançamento de hoje:
    //  - primeiro valor da conta (conta nova, ou conta ainda sem nenhum lançamento) = receita do mês;
    //  - mudança depois disso = "Ajuste de saldo" (não conta como receita nem despesa).
    let movimento = null;
    if (!cartao) {
      const antes = antiga ? formulario.saldoAntes || 0 : 0;
      const diferenca = Math.round((numero - antes) * 100) / 100;
      const semHistorico = !antiga || (!lancamentos.some((l) => l.conta === antiga.nome) && !antiga.saldoInicial);
      if (Math.abs(diferenca) >= 0.01) {
        movimento = semHistorico
          ? {
              id: novoId(),
              data: hoje,
              descricao: `Saldo inicial · ${nome}`,
              categoria: diferenca > 0 ? 'Extra' : 'Outros',
              conta: nome,
              valor: diferenca,
              pago: true,
              repete: false,
              observacao: 'Primeiro valor da conta',
              saldoInicialDaConta: true,
            }
          : {
              id: novoId(),
              data: hoje,
              descricao: `Ajuste de saldo · ${nome}`,
              categoria: TRANSFERENCIA.nome,
              conta: nome,
              valor: diferenca,
              pago: true,
              repete: false,
              observacao: 'Saldo corrigido em Contas',
              transferencia: novoId(), // ajuste não é ganho nem gasto
              ajuste: true,
            };
      }
    }

    const conta = {
      id: formulario.id || novoId(),
      nome,
      tipo: formulario.tipo,
      // Conta comum guarda o saldo inicial antigo (contas de antes desta mudança); o resto vai por lançamentos
      saldoInicial: cartao ? saldoInicial : antiga ? antiga.saldoInicial || 0 : 0,
      criadaEm: antiga?.criadaEm || (antiga ? undefined : hoje),
      cor: formulario.cor,
      noTotal: formulario.noTotal,
      ...(cartao
        ? { limite, fechamento: Number(formulario.fechamento), vencimento: Number(formulario.vencimento) }
        : {}),
    };

    if (!conta.criadaEm) delete conta.criadaEm;
    if (movimento) setLancamentos((atual) => [movimento, ...atual]);
    if (formulario.id) {
      setContas((atual) => atual.map((c) => (c.id === conta.id ? conta : c)));
      // Se o nome mudou, os lançamentos dessa conta passam a usar o nome novo
      if (antiga && antiga.nome !== nome) {
        setLancamentos((atual) => atual.map((l) => (l.conta === antiga.nome ? { ...l, conta: nome } : l)));
      }
    } else {
      setContas((atual) => [...atual, conta]);
    }
    setFormulario(null);
    return undefined;
  }

  // ----- Importar extrato (OFX) -----
  async function escolherOFX(evento) {
    const arquivo = evento.target.files[0];
    evento.target.value = '';
    if (!arquivo) return;
    setAvisoImportacao(null);
    try {
      const csv = /\.(csv|txt)$/i.test(arquivo.name) || arquivo.type === 'text/csv';
      setExtrato(csv ? await lerArquivoCSV(arquivo) : await lerArquivoOFX(arquivo));
    } catch (e) {
      setAvisoImportacao({ tipo: 'erro', texto: e.message || 'Não foi possível ler este arquivo.' });
    }
  }

  function confirmarImportacao({ conta: nomeDigitado, cartao, itens, saldo, saldoData }) {
    // Usa a conta existente (sem ligar para maiúsculas/acentos) ou cria uma nova
    const existente = contas.find((c) => mesmoNome(c.nome, nomeDigitado));
    const nome = existente ? existente.nome : nomeDigitado;

    // Movimentações ligadas a uma dívida viram recebimento/pagamento de parcela (o lançamento é criado por lá)
    const ligadas = itens.filter((t) => t.divida);
    const novos = itens.filter((t) => !t.divida).map((t) => ({
      id: novoId(),
      data: t.data,
      descricao: t.descricao,
      categoria: t.categoria,
      conta: nome,
      valor: t.valor,
      pago: true, // movimentação do extrato já aconteceu
      repete: false,
      observacao: 'Importado do extrato (OFX)',
      ofx: t.chave, // evita importar a mesma movimentação duas vezes
    }));
    let todos = [...novos, ...lancamentos];
    let quitadas = 0;
    if (ligadas.length) {
      salvar(todos); // as funções de A receber/A pagar leem e gravam a lista guardada
      let receber = carregarReceber();
      let pagar = carregarPagar();
      ligadas.forEach((t) => {
        const [tipo, id] = t.divida.split(':');
        const lista = tipo === 'receber' ? receber : pagar;
        const d = lista.find((x) => x.id === id);
        if (!d) return;
        const registrar = tipo === 'receber' ? registrarRecebimento : registrarPagamento;
        const nova = registrar(d, { valor: Math.abs(t.valor), data: t.data, conta: nome });
        const ultimo = (tipo === 'receber' ? nova.recebimentos : nova.pagamentos).at(-1);
        // Marca o lançamento criado com o código do extrato (para não importar de novo)
        if (ultimo?.lancamentoId) {
          salvar(carregar().map((l) => (l.id === ultimo.lancamentoId ? { ...l, ofx: t.chave, observacao: l.observacao || 'Importado do extrato' } : l)));
        }
        if (tipo === 'receber') receber = receber.map((x) => (x.id === id ? nova : x));
        else pagar = pagar.map((x) => (x.id === id ? nova : x));
        quitadas += 1;
      });
      salvarReceber(receber);
      salvarPagar(pagar);
      todos = carregar();
    }

    // Saldo igual ao do banco: calcula o saldo inicial que faz a conta bater com o extrato naquela data
    let saldoInicial = existente ? existente.saldoInicial : 0;
    if (saldo !== null) {
      const movimentado = todos
        .filter((l) => l.conta === nome && l.pago && l.data <= saldoData)
        .reduce((s, l) => s + l.valor, 0);
      saldoInicial = Math.round((saldo - movimentado) * 100) / 100;
    }

    if (existente) {
      setContas((atual) => atual.map((c) => (c.id === existente.id ? { ...c, saldoInicial } : c)));
    } else {
      setContas((atual) => [
        ...atual,
        {
          id: novoId(),
          nome,
          tipo: cartao ? 'Cartão de crédito' : 'Conta corrente',
          saldoInicial,
          criadaEm: dataDeHoje(),
          cor: CORES[atual.length % CORES.length],
          noTotal: !cartao,
        },
      ]);
    }
    setLancamentos(todos);
    setExtrato(null);
    setAvisoImportacao({
      tipo: 'ok',
      texto: `${novos.length} ${novos.length === 1 ? 'lançamento importado' : 'lançamentos importados'} para ${nome}${
        existente ? '' : ' (conta criada)'
      }.${quitadas ? ` ${quitadas} ${quitadas === 1 ? 'parcela registrada' : 'parcelas registradas'} em A receber/A pagar.` : ''}${
        saldo !== null ? ' Saldo igual ao do banco.' : ''
      } Já aparecem em Lançamentos, Painel e Relatórios.`,
    });
  }

  // ----- Transferência / pagar fatura -----
  function confirmarTransferencia(par, { de, para, valor }) {
    setLancamentos((atual) => [...par, ...atual]);
    setTransferencia(null);
    setAvisoImportacao({
      tipo: 'ok',
      texto: `Transferência de ${reais(valor)} feita: ${de} → ${para}. Não entra como gasto nem ganho.`,
    });
  }

  function pagarFatura(c) {
    const origem = contasComuns[0]?.nome;
    setTransferencia({
      titulo: `Pagar fatura · ${c.nome}`,
      de: origem,
      para: c.nome,
      valor: c.cartao.fechada?.faltaPagar || c.cartao.devido,
      descricao: `Pagamento da fatura ${c.nome}`,
      botao: 'Pagar fatura',
    });
  }

  function excluir(conta) {
    const quantos = conta.quantidade;
    const aviso =
      quantos > 0
        ? `Excluir a conta "${conta.nome}"? Os ${quantos} lançamentos dela continuam salvos na tela de Lançamentos.`
        : `Excluir a conta "${conta.nome}"?`;
    if (!window.confirm(aviso)) return;
    setContas((atual) => atual.filter((c) => c.id !== conta.id));
  }

  return (
    <div className="pp-app">
      <MenuLateral />

      <main className="pp ct">
        <div className="pp__topo">
          <div>
            <h1 className="pp__titulo">Contas</h1>
            <p className="pp__subtitulo">Seus bancos, carteira e investimentos em um só lugar</p>
          </div>
          <div className="pp__acoes">
            <button type="button" className="ct__importar" onClick={() => setTransferencia({})}>
              <span aria-hidden="true">⇄</span>
              Transferir
            </button>
            <button
              type="button"
              className="ct__importar"
              title="Extrato da conta em OFX ou CSV"
              onClick={() => {
                setModoImportacao('conta');
                campoOFX.current?.click();
              }}
            >
              <IconeEnviar tamanho={18} espessura={2.4} />
              Importar extrato
            </button>
            <input ref={campoOFX} type="file" accept=".ofx,.qfx,.csv,.txt,text/csv,application/x-ofx" hidden onChange={escolherOFX} />
            <button type="button" className="pp__novo ct__novo" onClick={() => abrirNova()}>
              <IconeMais tamanho={18} espessura={2.6} />
              Nova conta
            </button>
          </div>
        </div>

        {avisoImportacao && (
          <p className={`ct__aviso ct__aviso--${avisoImportacao.tipo}`} role={avisoImportacao.tipo === 'erro' ? 'alert' : 'status'}>
            {avisoImportacao.texto}
            <button type="button" onClick={() => setAvisoImportacao(null)} aria-label="Fechar aviso">
              ×
            </button>
          </p>
        )}

        {/* ===== Saldo total ===== */}
        <div className="ct__resumo">
          <section className="ct-total">
            <span className="ct-total__rotulo">Saldo total</span>
            <b className="ct-total__valor">{saldoTexto(saldoTotal)}</b>
            <span className="ct-total__previsto">
              Previsto para o fim do mês: <b>{saldoTexto(previstoTotal)}</b>
            </span>

            {/* Barra mostrando quanto do dinheiro está em cada conta */}
            {somaPositivos > 0 && (
              <>
                <div className="ct-total__barra" aria-hidden="true">
                  {positivos.map((c) => (
                    <span key={c.id} style={{ width: `${(c.saldo / somaPositivos) * 100}%`, background: c.cor }} />
                  ))}
                </div>
                <ul className="ct-total__legenda">
                  {positivos.map((c) => (
                    <li key={c.id}>
                      <span className="ct-total__cor" style={{ background: c.cor }} />
                      {c.nome} <b>{Math.round((c.saldo / somaPositivos) * 100)}%</b>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>

          <div className="ct__mini">
            <div className="ct-mini">
              <span className="ct-mini__icone ct-mini__icone--entrada">
                <IconeCima tamanho={18} espessura={2.2} />
              </span>
              <div>
                <span className="ct-mini__rotulo">Entrou este mês</span>
                <b className="ct-mini__valor valor--entrada">{reais(entradasMes)}</b>
              </div>
            </div>
            <div className="ct-mini">
              <span className="ct-mini__icone ct-mini__icone--saida">
                <IconeBaixo tamanho={18} espessura={2.2} />
              </span>
              <div>
                <span className="ct-mini__rotulo">Saiu este mês</span>
                <b className="ct-mini__valor valor--saida">{reais(saidasMes)}</b>
              </div>
            </div>
            <div className="ct-mini">
              <span className="ct-mini__icone ct-mini__icone--contas">{contas.length}</span>
              <div>
                <span className="ct-mini__rotulo">Contas cadastradas</span>
                <b className="ct-mini__valor">{noTotal.length} somam no total</b>
              </div>
            </div>
          </div>
        </div>

        {/* ===== Cartões das contas ===== */}
        <div className="ct__grade">
          {contasComuns.map((c) => (
            <article key={c.id} className="ct-conta" style={{ '--cor': c.cor }}>
              <div className="ct-conta__topo">
                <span className="ct-conta__avatar" aria-hidden="true">
                  {c.nome.charAt(0).toUpperCase()}
                </span>
                <div className="ct-conta__titulos">
                  <h2 className="ct-conta__nome">{c.nome}</h2>
                  <span className="ct-conta__tipo">{c.tipo}</span>
                </div>
                {!c.noTotal && <span className="ct-conta__fora">Fora do total</span>}
              </div>

              <div className="ct-conta__saldo">
                <span>Saldo atual</span>
                <b className={c.saldo < 0 ? 'valor--saida' : ''}>{saldoTexto(c.saldo)}</b>
              </div>

              <div className="ct-conta__linha">
                <span>Previsto no fim do mês</span>
                <b>{saldoTexto(c.previsto)}</b>
              </div>

              <div className="ct-conta__mes">
                <span className="ct-conta__chip ct-conta__chip--entrada">
                  <IconeCima tamanho={14} espessura={2.4} /> {reais(c.entradas)}
                </span>
                <span className="ct-conta__chip ct-conta__chip--saida">
                  <IconeBaixo tamanho={14} espessura={2.4} /> {reais(c.saidas)}
                </span>
                <span className="ct-conta__chip-legenda">neste mês</span>
              </div>

              <div className="ct-conta__ultimos">
                <span className="ct-conta__subtitulo">Últimas movimentações</span>
                {c.ultimos.length === 0 ? (
                  <p className="ct-conta__vazio">Nenhum lançamento nesta conta ainda.</p>
                ) : (
                  <ul>
                    {c.ultimos.map((l) => (
                      <li key={l.id}>
                        <span className="ct-conta__data">{dataCurta(l.data)}</span>
                        <span className="ct-conta__desc">{l.descricao}</span>
                        <b className={l.valor >= 0 ? 'valor--entrada' : 'valor--saida'}>{valorComSinal(l.valor)}</b>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="ct-conta__acoes">
                <button type="button" className="ct-conta__botao" onClick={() => abrirEdicao(c)}>
                  Editar
                </button>
                <Link to="/painel/lancamentos" className="ct-conta__botao">
                  Lançamentos
                </Link>
                <button type="button" className="ct-conta__botao ct-conta__botao--excluir" onClick={() => excluir(c)}>
                  Excluir
                </button>
              </div>
            </article>
          ))}

          <button type="button" className="ct-adicionar" onClick={() => abrirNova()}>
            <span className="ct-adicionar__mais">
              <IconeMais tamanho={22} espessura={2.4} />
            </span>
            Adicionar conta
            <small>Banco, carteira, poupança ou investimento</small>
          </button>
        </div>

        {/* ===== Cartões de crédito ===== */}
        <section className="ct-cartoes">
          <div className="ct-cartoes__topo">
            <div>
              <h2 className="ct-cartoes__titulo">Cartões de crédito</h2>
              <p className="ct-cartoes__sub">
                Compras entram como gasto na data da compra. Pagar a fatura é uma transferência da sua conta para o cartão.
              </p>
            </div>
            <div className="ct-cartoes__botoes">
              <button
                type="button"
                className="ct__importar"
                title="Fatura do cartão em OFX ou CSV"
                onClick={() => {
                  setModoImportacao('cartao');
                  campoOFX.current?.click();
                }}
              >
                <IconeEnviar tamanho={16} espessura={2.4} />
                Importar fatura
              </button>
              <button type="button" className="ct__importar" onClick={() => abrirNova('Cartão de crédito')}>
                <IconeMais tamanho={16} espessura={2.6} />
                Novo cartão
              </button>
            </div>
          </div>

          {cartoes.length === 0 ? (
            <p className="ct-cartoes__vazio">
              Nenhum cartão ainda. Cadastre com o limite, o dia em que a fatura fecha e o dia em que vence, e a CIFRA monta as
              faturas sozinha.
            </p>
          ) : (
            <div className="ct-cartoes__grade">
              {cartoes.map((c) => {
                const r = c.cartao;
                const usoPorcento = r.limite > 0 ? Math.min((r.usado / r.limite) * 100, 100) : 0;
                const situacao = r.configurado ? SITUACAO_FATURA[r.fechada.situacao] : null;
                return (
                  <article key={c.id} className="ct-cartao">
                    <div className="ct-cartao__plastico" style={{ '--cor': c.cor }}>
                      <div className="ct-cartao__topo">
                        <b>{c.nome}</b>
                        <span className="ct-cartao__chip" aria-hidden="true" />
                      </div>
                      <span className="ct-cartao__rotulo">Fatura atual{r.configurado ? ` · fecha ${dataCurta(r.aberta.fecha)}` : ''}</span>
                      <b className="ct-cartao__fatura">{reais(r.configurado ? r.aberta.total : r.devido)}</b>
                      {r.limite > 0 && (
                        <>
                          <div className="ct-cartao__limite" aria-hidden="true">
                            <span style={{ width: `${usoPorcento}%` }} />
                          </div>
                          <span className="ct-cartao__limite-texto">
                            Disponível <b>{saldoTexto(r.disponivel)}</b> de {reais(r.limite)}
                          </span>
                        </>
                      )}
                    </div>

                    {r.configurado ? (
                      <div className="ct-cartao__fechada">
                        <div>
                          <span className="ct-cartao__rotulo-escuro">
                            Fatura de {nomeDoMes(r.fechada.chave).split(' ')[0].toLowerCase()} · vence {dataCurta(r.fechada.vence)}
                          </span>
                          <b>{reais(r.fechada.total)}</b>
                        </div>
                        <span className={`ct-cartao__situacao ct-cartao__situacao--${situacao.classe}`}>
                          {situacao.texto}
                          {r.fechada.faltaPagar > 0.005 && r.fechada.situacao !== 'paga' ? ` · falta ${reais(r.fechada.faltaPagar)}` : ''}
                        </span>
                      </div>
                    ) : (
                      <p className="ct-cartao__configurar">
                        Diga o dia de fechamento e de vencimento para ver as faturas.{' '}
                        <button type="button" onClick={() => abrirEdicao(c)}>
                          Configurar
                        </button>
                      </p>
                    )}

                    {r.configurado && r.proximas.length > 0 && (
                      <ul className="ct-cartao__proximas">
                        {r.proximas.map((f) => (
                          <li key={f.chave}>
                            <span>Fatura de {nomeDoMes(f.chave).split(' ')[0].toLowerCase()}</span>
                            <b>{reais(f.total)}</b>
                          </li>
                        ))}
                      </ul>
                    )}

                    <div className="ct-conta__acoes">
                      {(r.configurado ? r.fechada.faltaPagar > 0.005 : r.devido > 0) && (
                        <button type="button" className="ct-conta__botao ct-conta__botao--pagar" onClick={() => pagarFatura(c)}>
                          Pagar fatura
                        </button>
                      )}
                      <button type="button" className="ct-conta__botao" onClick={() => abrirEdicao(c)}>
                        Editar
                      </button>
                      <button type="button" className="ct-conta__botao ct-conta__botao--excluir" onClick={() => excluir(c)}>
                        Excluir
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {contas.length === 0 && (
          <p className="ct__dica">
            Dica: não precisa cadastrar antes. Ao fazer um <Link to="/painel/lancamentos">lançamento</Link> com uma conta nova,
            ela aparece aqui sozinha. Ou use <b>Importar extrato</b> (OFX ou CSV) para trazer as movimentações do seu banco.
          </p>
        )}

        {/* ===== Transferir / pagar fatura ===== */}
        {transferencia && (
          <Transferir
            contas={contas}
            inicial={transferencia}
            aoConfirmar={confirmarTransferencia}
            aoFechar={() => setTransferencia(null)}
          />
        )}

        {/* ===== Conferência do extrato ===== */}
        {extrato && (
          <ImportarOFX
            extrato={extrato}
            modo={modoImportacao}
            contas={contas}
            lancamentos={lancamentos}
            aoConfirmar={confirmarImportacao}
            aoFechar={() => setExtrato(null)}
          />
        )}

        {/* ===== Formulário (nova conta / editar) ===== */}
        {formulario && (
          <div className="ct-fundo" onClick={() => setFormulario(null)}>
            <form
              className="ct-form"
              role="dialog"
              aria-modal="true"
              aria-labelledby="ct-form-titulo"
              onSubmit={salvarFormulario}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="ct-form__topo">
                <h2 id="ct-form-titulo">
                  {formulario.tipo === 'Cartão de crédito'
                    ? formulario.id
                      ? 'Editar cartão'
                      : 'Novo cartão'
                    : formulario.id
                      ? 'Editar conta'
                      : 'Nova conta'}
                </h2>
                <button type="button" className="ct-form__fechar" onClick={() => setFormulario(null)} aria-label="Fechar">
                  ×
                </button>
              </div>

              <label className="ct-form__campo">
                Nome da conta
                <input
                  autoFocus
                  placeholder={formulario.tipo === 'Cartão de crédito' ? 'Ex.: Cartão Nubank' : 'Ex.: Nubank, Poupança, Carteira'}
                  value={formulario.nome}
                  onChange={(e) => setFormulario({ ...formulario, nome: e.target.value })}
                />
              </label>

              <div className="ct-form__dupla">
                <label className="ct-form__campo">
                  Tipo
                  <select value={formulario.tipo} onChange={(e) => mudarTipo(e.target.value)}>
                    {TIPOS.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </label>
                <label className="ct-form__campo">
                  {formulario.tipo === 'Cartão de crédito' ? 'Já deve hoje (R$)' : 'Saldo atual (R$)'}
                  <input
                    inputMode="decimal"
                    value={formulario.saldoTexto}
                    onChange={(e) => setFormulario({ ...formulario, saldoTexto: mascaraValor(e.target.value) })}
                  />
                </label>
              </div>
              {formulario.tipo === 'Cartão de crédito' ? (
                <>
                  <div className="ct-form__tripla">
                    <label className="ct-form__campo">
                      Limite (R$)
                      <input
                        inputMode="decimal"
                        placeholder="0,00"
                        value={formulario.limiteTexto}
                        onChange={(e) => setFormulario({ ...formulario, limiteTexto: mascaraValor(e.target.value) })}
                      />
                    </label>
                    <label className="ct-form__campo">
                      Fecha no dia
                      <select value={formulario.fechamento} onChange={(e) => setFormulario({ ...formulario, fechamento: e.target.value })}>
                        <option value="">—</option>
                        {DIAS.map((d) => (
                          <option key={d}>{d}</option>
                        ))}
                      </select>
                    </label>
                    <label className="ct-form__campo">
                      Vence no dia
                      <select value={formulario.vencimento} onChange={(e) => setFormulario({ ...formulario, vencimento: e.target.value })}>
                        <option value="">—</option>
                        {DIAS.map((d) => (
                          <option key={d}>{d}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <p className="ct-form__dica">
                    “Já deve hoje” é o que está em aberto no cartão antes de começar a usar a CIFRA. Compras feitas no dia do
                    fechamento ou depois vão para a fatura seguinte.
                  </p>
                </>
              ) : (
                <p className="ct-form__dica">
                  {!formulario.id || (!lancamentos.some((l) => l.conta === formulario.nome) && !formulario.saldoInicial)
                    ? 'Quanto tem na conta hoje. Esse primeiro valor entra como receita deste mês.'
                    : 'Quanto tem na conta hoje. Se mudar, a diferença entra hoje como "Ajuste de saldo" (não conta como receita nem despesa) e os meses passados não mudam.'}
                </p>
              )}

              <fieldset className="ct-form__cores">
                <legend>Cor</legend>
                {CORES.map((cor) => (
                  <label key={cor} className="ct-form__cor" style={{ background: cor }}>
                    <input
                      type="radio"
                      name="cor"
                      value={cor}
                      checked={formulario.cor === cor}
                      onChange={() => setFormulario({ ...formulario, cor })}
                      aria-label={`Cor ${cor}`}
                    />
                  </label>
                ))}
              </fieldset>

              <label className="ct-form__check">
                <input
                  type="checkbox"
                  checked={formulario.noTotal}
                  onChange={(e) => setFormulario({ ...formulario, noTotal: e.target.checked })}
                />
                Somar esta conta no saldo total
              </label>

              {erro && <p className="ct-form__erro">{erro}</p>}

              <div className="ct-form__acoes">
                <button type="submit" className="ct-form__salvar">
                  Salvar
                </button>
                <button type="button" className="ct-form__cancelar" onClick={() => setFormulario(null)}>
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
