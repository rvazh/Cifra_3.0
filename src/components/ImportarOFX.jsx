import { useEffect, useMemo, useState } from 'react';
import { reais } from './Graficos.jsx';
import { carregarCategorias, categoria as dadosDaCategoria, dataCurta, dataPorExtenso } from '../dados/lancamentos.js';
import { mesmoNome, ehCartao } from '../dados/contas.js';
import { aprenderDoHistorico, sugerirCategoria } from '../dados/ofx.js';
import { extratoDoCSV } from '../dados/csv.js';
import { carregarReceber, situacaoDaDivida as situacaoReceber } from '../dados/receber.js';
import { carregarPagar, situacaoDaDivida as situacaoPagar } from '../dados/pagar.js';
import './ImportarOFX.css';

// Como a categoria foi encontrada (aparece como uma etiqueta pequena)
const ORIGEM = {
  historico: 'como você já lançou',
  nome: 'pelo nome da categoria',
  palavra: 'pela descrição',
};

function valorComSinal(valor) {
  return `${valor >= 0 ? '+ ' : '− '}${reais(Math.abs(valor))}`;
}

// Nome sugerido: uma conta (ou cartão) sua que bate com o banco do arquivo, ou o nome do banco
function contaSugerida(extrato, opcoes, paraCartao) {
  const banco = extrato.banco || '';
  const nome = paraCartao ? `Cartão ${banco || 'de crédito'}`.trim() : banco || 'Conta importada';
  const existente =
    opcoes.find((c) => mesmoNome(c.nome, nome)) ||
    (banco && opcoes.find((c) => c.nome.toLowerCase().includes(banco.toLowerCase()))) ||
    (paraCartao && opcoes.length === 1 ? opcoes[0] : null); // só um cartão: é ele
  return existente ? existente.nome : nome;
}

// Dívidas em aberto de "A receber" (para entradas) e "A pagar" (para saídas)
function dividasEmAberto() {
  const sem = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const montar = (lista, situacao, tipo) =>
    lista
      .map((d) => ({ d, s: situacao(d) }))
      .filter(({ s }) => !s.quitada)
      .map(({ d, s }) => ({
        chave: `${tipo}:${d.id}`,
        tipo,
        pessoa: d.pessoa,
        busca: sem(d.pessoa || ''),
        texto: `${tipo === 'receber' ? 'A receber' : 'A pagar'} · ${d.pessoa}${
          s.parcelas > 1 && s.proxima ? ` (parcela ${s.proxima.numero}/${s.parcelas})` : ''
        } · falta ${reais(s.faltaComJuros)}`,
      }));
  return {
    receber: montar(carregarReceber(), situacaoReceber, 'receber'),
    pagar: montar(carregarPagar(), situacaoPagar, 'pagar'),
    sem,
  };
}

// Janela de conferência: mostra o que veio do extrato antes de virar lançamento
// modo: 'conta' (extrato do banco) ou 'cartao' (fatura do cartão de crédito)
// saldoDoBanco: já vem marcado "Deixar o saldo igual ao do banco" (em Trazer meses passados vem desmarcado: extrato antigo)
export default function ImportarOFX({ extrato: arquivo, modo = 'conta', contas: todasAsContas, lancamentos, aoConfirmar, aoFechar, saldoDoBanco = true }) {
  const categorias = carregarCategorias();
  const csv = arquivo.tipo === 'csv';
  const paraCartao = modo === 'cartao';
  // Só aparecem as opções do tipo certo: cartões na fatura, contas no extrato
  const contas = todasAsContas.filter((c) => (paraCartao ? ehCartao(c) : !ehCartao(c)));
  // No CSV dá para trocar as colunas: o extrato é montado de novo a cada mudança
  const [mapa, setMapa] = useState(arquivo.mapa);
  // Fatura de cartão costuma trazer as compras positivas: nesse caso os sinais são invertidos
  // (no botão de fatura, se a maioria dos valores é positiva, as compras vieram positivas)
  const [inverter, setInverter] = useState(Boolean(csv && paraCartao && arquivo.proporcaoPositiva > 0.5));
  const extrato = useMemo(() => {
    const base = csv ? extratoDoCSV(arquivo, mapa, inverter) : arquivo;
    return { ...base, cartao: paraCartao, saldo: paraCartao ? null : base.saldo };
  }, [arquivo, csv, mapa, inverter, paraCartao]);
  // Arquivo de um tipo importado pelo botão do outro (ex.: fatura no botão de extrato)
  const tipoTrocado = paraCartao ? !csv && !arquivo.cartao : Boolean(arquivo.cartao) && !csv;
  const [conta, setConta] = useState(() => contaSugerida(extrato, contas, paraCartao));
  const [ajustarSaldo, setAjustarSaldo] = useState(arquivo.saldo != null && saldoDoBanco);
  const [escolhas, setEscolhas] = useState({}); // o que a pessoa mudou: { [chave]: { incluir, categoria, divida } }
  // Pagamentos e recebimentos podem quitar parcelas de "A receber"/"A pagar" (só no extrato da conta)
  const dividas = useMemo(() => (paraCartao ? { receber: [], pagar: [], sem: (s) => s } : dividasEmAberto()), [paraCartao]);

  // Fecha com Esc
  useEffect(() => {
    const aoTeclar = (e) => e.key === 'Escape' && aoFechar();
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, [aoFechar]);

  // Categoria sugerida para cada movimentação (aprende com o que você já lançou)
  const sugestoes = useMemo(() => {
    const historico = aprenderDoHistorico(lancamentos);
    return Object.fromEntries(extrato.transacoes.map((t) => [t.chave, sugerirCategoria(t.original, t.valor, historico, categorias)]));
  }, [extrato, lancamentos]); // eslint-disable-line react-hooks/exhaustive-deps

  // Situação de cada movimentação: nova, já importada antes ou parecida com um lançamento que você fez à mão
  const linhas = useMemo(
    () =>
      extrato.transacoes.map((t) => {
        let situacao = 'nova';
        if (lancamentos.some((l) => l.ofx === t.chave)) situacao = 'importada';
        else if (
          lancamentos.some(
            (l) => !l.ofx && mesmoNome(l.conta, conta) && l.data === t.data && Math.abs(l.valor - t.valor) < 0.005
          )
        ) {
          situacao = 'parecida';
        }
        const sugestao = sugestoes[t.chave];
        const escolha = escolhas[t.chave] || {};
        // Sugere a dívida quando o nome da pessoa aparece na descrição (ex.: "PIX JOAO SILVA")
        const opcoes = t.valor > 0 ? dividas.receber : dividas.pagar;
        const texto = dividas.sem(`${t.descricao} ${t.original || ''}`);
        const sugerida = situacao === 'nova' ? opcoes.find((o) => o.busca.length >= 3 && texto.includes(o.busca.split(' ')[0])) : null;
        return {
          ...t,
          situacao,
          incluir: escolha.incluir ?? situacao === 'nova',
          categoria: escolha.categoria ?? sugestao.categoria,
          como: escolha.categoria ? 'voce' : sugestao.como,
          opcoesDeDivida: opcoes,
          divida: escolha.divida ?? (sugerida ? sugerida.chave : ''),
          dividaSugerida: escolha.divida === undefined && Boolean(sugerida),
        };
      }),
    [extrato, lancamentos, conta, sugestoes, escolhas, dividas]
  );

  const marcadas = linhas.filter((l) => l.incluir);
  const entradas = marcadas.filter((l) => l.valor > 0).reduce((s, l) => s + l.valor, 0);
  const saidas = marcadas.filter((l) => l.valor < 0).reduce((s, l) => s - l.valor, 0);
  const identificadas = linhas.filter((l) => l.como).length;
  const jaImportadas = linhas.filter((l) => l.situacao === 'importada').length;
  const parecidas = linhas.filter((l) => l.situacao === 'parecida').length;
  const contaExiste = contas.some((c) => mesmoNome(c.nome, conta));

  function mudar(chave, mudanca) {
    setEscolhas((atual) => ({ ...atual, [chave]: { ...atual[chave], ...mudanca } }));
  }

  function marcarTodas(incluir) {
    setEscolhas((atual) => {
      const novo = { ...atual };
      linhas.forEach((l) => {
        if (l.situacao !== 'importada') novo[l.chave] = { ...novo[l.chave], incluir };
      });
      return novo;
    });
  }

  function confirmar(e) {
    e.preventDefault();
    if (!conta.trim() || !marcadas.length) return;
    aoConfirmar({
      conta: conta.trim().replace(/\s+/g, ' '),
      cartao: extrato.cartao,
      itens: marcadas.map((l) => ({
        chave: l.chave,
        data: l.data,
        descricao: l.descricao,
        valor: l.valor,
        categoria: l.categoria,
        divida: l.divida || null, // "receber:<id>" ou "pagar:<id>": registra a parcela em vez de um lançamento solto
      })),
      saldo: ajustarSaldo ? extrato.saldo : null,
      saldoData: extrato.saldoData || extrato.fim,
    });
  }

  return (
    <div className="ofx-fundo" onClick={aoFechar}>
      <form
        className="ofx"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ofx-titulo"
        onSubmit={confirmar}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ===== Topo ===== */}
        <div className="ofx__topo">
          <div>
            <h2 id="ofx-titulo">
              {paraCartao ? 'Importar fatura do cartão' : 'Importar extrato da conta'}
              {csv ? ' (CSV)' : ' (OFX)'}
            </h2>
            <p className="ofx__sub">
              {extrato.banco || (csv ? arquivo.nomeArquivo : 'Banco não informado')}
              {extrato.inicio ? ` · ${dataCurta(extrato.inicio)} a ${dataCurta(extrato.fim)}` : ''} ·{' '}
              {extrato.transacoes.length} {extrato.transacoes.length === 1 ? 'movimentação' : 'movimentações'}
            </p>
          </div>
          <button type="button" className="ofx__fechar" onClick={aoFechar} aria-label="Fechar">
            ×
          </button>
        </div>

        {/* ===== Conta e saldo ===== */}
        <div className="ofx__config">
          <label className="ofx__campo">
            {paraCartao ? 'Para qual cartão?' : 'Para qual conta?'}
            <input list="ofx-contas" value={conta} onChange={(e) => setConta(e.target.value)} autoComplete="off" required />
            <datalist id="ofx-contas">
              {contas.map((c) => (
                <option key={c.id} value={c.nome} />
              ))}
            </datalist>
            <small>
              {contaExiste
                ? paraCartao
                  ? 'Cartão já cadastrado'
                  : 'Conta já cadastrada'
                : paraCartao
                  ? 'Cartão novo: será criado em Contas (depois diga o fechamento e o vencimento)'
                  : 'Conta nova: será criada em Contas'}
            </small>
          </label>

          {extrato.saldo != null && (
            <label className="ofx__saldo">
              <input type="checkbox" checked={ajustarSaldo} onChange={(e) => setAjustarSaldo(e.target.checked)} />
              <span>
                <b>Deixar o saldo igual ao do banco</b>
                Saldo do extrato: {valorComSinal(extrato.saldo).replace('+ ', '')} em{' '}
                {dataPorExtenso(extrato.saldoData || extrato.fim)}
              </span>
            </label>
          )}
        </div>

        {tipoTrocado && (
          <p className="ofx__aviso ofx__aviso--topo">
            {paraCartao
              ? 'Este arquivo parece um extrato de conta, não uma fatura de cartão. Se for, use “Importar extrato” no topo da tela.'
              : 'Este arquivo parece uma fatura de cartão. Se for, use “Importar fatura” na área de Cartões de crédito.'}
          </p>
        )}

        {/* ===== Colunas do CSV ===== */}
        {csv && (
          <div className="ofx__colunas">
            <span className="ofx__colunas-titulo">Colunas da planilha</span>
            {[
              ['data', 'Data'],
              ['descricao', 'Descrição'],
              ...(mapa.valor >= 0 || (mapa.debito < 0 && mapa.credito < 0)
                ? [['valor', 'Valor']]
                : [
                    ['debito', 'Débito (saída)'],
                    ['credito', 'Crédito (entrada)'],
                  ]),
            ].map(([campo, rotulo]) => (
              <label key={campo} className="ofx__coluna">
                {rotulo}
                <select value={mapa[campo]} onChange={(e) => setMapa({ ...mapa, [campo]: Number(e.target.value) })}>
                  <option value={-1}>—</option>
                  {arquivo.tabela.cabecalho.map((c, i) => (
                    <option key={i} value={i}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
            ))}
            {mapa.valor >= 0 && (
              <label className="ofx__inverter">
                <input type="checkbox" checked={inverter} onChange={(e) => setInverter(e.target.checked)} />
                Os gastos aparecem positivos (fatura de cartão)
              </label>
            )}
          </div>
        )}

        {/* ===== Resumo ===== */}
        <div className="ofx__resumo">
          <span>
            <b>{marcadas.length}</b> para importar
          </span>
          <span className="valor--entrada">
            <b>{reais(entradas)}</b> entradas
          </span>
          <span className="valor--saida">
            <b>{reais(saidas)}</b> saídas
          </span>
          <span>
            Categoria identificada em <b>{identificadas}</b> de {linhas.length}
          </span>
        </div>
        {(jaImportadas > 0 || parecidas > 0) && (
          <p className="ofx__aviso">
            {jaImportadas > 0 && `${jaImportadas} já ${jaImportadas === 1 ? 'foi importada' : 'foram importadas'} antes e não entram de novo. `}
            {parecidas > 0 &&
              `${parecidas} ${parecidas === 1 ? 'parece' : 'parecem'} com lançamentos que você já fez à mão (mesmo dia e valor): ficaram desmarcadas.`}
          </p>
        )}

        {/* ===== Lista ===== */}
        <div className="ofx__lista-topo">
          <span>Confira as categorias. Você pode trocar qualquer uma.</span>
          <span className="ofx__marcar">
            <button type="button" onClick={() => marcarTodas(true)}>
              Marcar todas
            </button>
            <button type="button" onClick={() => marcarTodas(false)}>
              Desmarcar
            </button>
          </span>
        </div>
        {linhas.length === 0 && (
          <p className="ofx__nada">Nenhuma movimentação com data e valor. Confira as colunas da planilha acima.</p>
        )}
        <ul className="ofx__lista">
          {linhas.map((l) => (
            <li key={l.chave} className={l.incluir ? 'ofx-linha' : 'ofx-linha ofx-linha--fora'}>
              <input
                type="checkbox"
                className="ofx-linha__check"
                checked={l.incluir}
                disabled={l.situacao === 'importada'}
                onChange={(e) => mudar(l.chave, { incluir: e.target.checked })}
                aria-label={`Importar ${l.descricao}`}
              />
              <span className="ofx-linha__data">{dataCurta(l.data)}</span>
              <span className="ofx-linha__textos">
                <b title={l.original}>{l.descricao}</b>
                <small>
                  {l.situacao === 'importada' && <span className="ofx-tag ofx-tag--cinza">Já importada</span>}
                  {l.situacao === 'parecida' && <span className="ofx-tag ofx-tag--alerta">Parece repetida</span>}
                  {l.como === 'voce' && <span className="ofx-tag">Você escolheu</span>}
                  {l.como && l.como !== 'voce' && <span className="ofx-tag ofx-tag--ok">Identificada {ORIGEM[l.como]}</span>}
                  {!l.como && <span className="ofx-tag ofx-tag--cinza">Não identificada</span>}
                </small>
              </span>
              <label className="ofx-linha__categoria">
                <span className="ofx-linha__cor" style={{ background: dadosDaCategoria(l.categoria).cor }} aria-hidden="true">
                  {dadosDaCategoria(l.categoria).emoji}
                </span>
                <select
                  value={l.categoria}
                  onChange={(e) => mudar(l.chave, { categoria: e.target.value })}
                  aria-label={`Categoria de ${l.descricao}`}
                  disabled={l.situacao === 'importada'}
                >
                  {categorias.map((c) => (
                    <option key={c.nome} value={c.nome}>
                      {c.nome}
                    </option>
                  ))}
                </select>
              </label>
              <b className={l.valor >= 0 ? 'ofx-linha__valor valor--entrada' : 'ofx-linha__valor valor--saida'}>
                {valorComSinal(l.valor)}
              </b>
              {l.opcoesDeDivida.length > 0 && l.situacao !== 'importada' && (
                <label className={l.divida ? 'ofx-linha__divida ofx-linha__divida--ligada' : 'ofx-linha__divida'}>
                  <span>{l.valor > 0 ? 'É recebimento de uma dívida?' : 'É pagamento de uma dívida?'}</span>
                  <select
                    value={l.divida}
                    onChange={(e) => mudar(l.chave, { divida: e.target.value })}
                    aria-label={`Ligar ${l.descricao} a uma dívida`}
                  >
                    <option value="">Não, é um lançamento comum</option>
                    {l.opcoesDeDivida.map((o) => (
                      <option key={o.chave} value={o.chave}>
                        {o.texto}
                      </option>
                    ))}
                  </select>
                  {l.dividaSugerida && <small>Sugerido pelo nome na descrição</small>}
                </label>
              )}
            </li>
          ))}
        </ul>

        {/* ===== Rodapé ===== */}
        <div className="ofx__rodape">
          <p>
            Tudo entra como já pago/recebido e atualiza Contas, Lançamentos, Painel e Relatórios.
            {marcadas.some((l) => l.divida) &&
              ` ${marcadas.filter((l) => l.divida).length} ${marcadas.filter((l) => l.divida).length === 1 ? 'movimentação vai' : 'movimentações vão'} quitar parcelas de A receber/A pagar.`}
          </p>
          <div className="ofx__botoes">
            <button type="button" className="ofx__cancelar" onClick={aoFechar}>
              Cancelar
            </button>
            <button type="submit" className="ofx__importar" disabled={!marcadas.length || !conta.trim()}>
              Importar {marcadas.length} {marcadas.length === 1 ? 'lançamento' : 'lançamentos'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
