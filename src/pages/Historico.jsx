import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import MenuLateral from '../components/MenuLateral.jsx';
import ImportarOFX from '../components/ImportarOFX.jsx';
import { reais } from '../components/Graficos.jsx';
import { mascaraValor } from '../dados/dinheiro.js';
import { carregar, salvar, carregarCategorias, categoria as dadosDaCategoria, dataDeHoje, mudarMes, nomeDoMes, dataCurta, TRANSFERENCIA } from '../dados/lancamentos.js';
import { carregarContas, mesmoNome } from '../dados/contas.js';
import { lerArquivoOFX } from '../dados/ofx.js';
import { lerArquivoCSV } from '../dados/csv.js';
import { aplicarImportacao, aplicarPlanilha, aplicarResumo, resumoDoMes, carregarLotes, desfazerLote, CONTA_DO_RESUMO } from '../dados/importacao.js';
import { acharRecorrentes, marcarComoFixos } from '../dados/recorrentes.js';
import { lerPlanilha, linhasDaPlanilha, pareceSemSinal, modeloCSV, COLUNAS, ORIGENS } from '../dados/planilha.js';
import './Painel.css';
import './Historico.css';

const ORIGEM_DO_LOTE = { extrato: 'Extrato', fatura: 'Fatura do cartão', planilha: 'Planilha', resumo: 'Resumo do mês' };

function lerNumero(texto) {
  return parseFloat(String(texto).replace(/\./g, '').replace(',', '.')) || 0;
}

// ===== Janela da planilha: confere as colunas e o que vai entrar =====
function JanelaPlanilha({ planilha, aoConfirmar, aoFechar }) {
  const [mapa, setMapa] = useState(planilha.mapa);
  const [origem, setOrigem] = useState(/organizze/i.test(planilha.arquivo) ? 'organizze' : /mobills/i.test(planilha.arquivo) ? 'mobills' : 'outra');
  const [semSinal, setSemSinal] = useState(() => pareceSemSinal(planilha));
  const [contaPadrao, setContaPadrao] = useState('');
  const [incluirParecidas, setIncluirParecidas] = useState(false);
  const linhas = useMemo(() => linhasDaPlanilha(planilha, mapa, { semSinal }), [planilha, mapa, semSinal]);
  const existentes = useMemo(() => carregar(), []);
  // Parecida = já existe um lançamento com a mesma data e o mesmo valor (na mesma conta, se a planilha tiver conta)
  const parecida = (r) =>
    existentes.some((l) => l.data === r.data && Math.abs(l.valor - r.valor) < 0.005 && (!r.conta || mesmoNome(l.conta, r.conta)));
  const comSituacao = linhas.map((r) => ({ ...r, parecida: parecida(r) }));
  const escolhidas = comSituacao.filter((r) => incluirParecidas || !r.parecida);
  const semConta = escolhidas.some((r) => !r.conta);
  const entradas = escolhidas.filter((r) => r.valor > 0).reduce((s, r) => s + r.valor, 0);
  const saidas = escolhidas.filter((r) => r.valor < 0).reduce((s, r) => s - r.valor, 0);

  useEffect(() => {
    const tecla = (e) => e.key === 'Escape' && aoFechar();
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [aoFechar]);

  function confirmar(e) {
    e.preventDefault();
    if (!escolhidas.length) return;
    aoConfirmar(escolhidas, { contaPadrao: contaPadrao.trim() || 'Planilha importada', origem });
  }

  return (
    <div className="hist-fundo" onClick={aoFechar}>
      <form className="hist-janela" role="dialog" aria-modal="true" aria-labelledby="hist-planilha-titulo" onSubmit={confirmar} onClick={(e) => e.stopPropagation()}>
        <div className="hist-janela__topo">
          <div>
            <h2 id="hist-planilha-titulo">Importar planilha</h2>
            <p>
              {planilha.arquivo} · {linhas.length} {linhas.length === 1 ? 'lançamento encontrado' : 'lançamentos encontrados'}
            </p>
          </div>
          <button type="button" className="hist-janela__fechar" onClick={aoFechar} aria-label="Fechar">
            ×
          </button>
        </div>

        <label className="hist-campo">
          <span>De onde veio a planilha?</span>
          <select value={origem} onChange={(e) => setOrigem(e.target.value)}>
            {ORIGENS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.nome}
              </option>
            ))}
          </select>
          <small>
            {origem === 'organizze' && 'No Organizze: Relatórios > Exportar (Excel). Abra no Excel e salve como CSV.'}
            {origem === 'mobills' && 'No Mobills: Configurações > Exportar dados. Abra no Excel e salve como CSV.'}
            {origem === 'cifra' && 'Use o modelo da CIFRA: uma linha por lançamento.'}
            {origem === 'outra' && 'Qualquer planilha com data e valor serve. Confira as colunas abaixo.'}
          </small>
        </label>

        <div className="hist-colunas">
          {COLUNAS.map((c) => (
            <label key={c.id} className="hist-campo">
              <span>
                {c.nome}
                {c.obrigatoria ? ' *' : ''}
              </span>
              <select value={mapa[c.id]} onChange={(e) => setMapa({ ...mapa, [c.id]: Number(e.target.value) })}>
                <option value={-1}>{c.obrigatoria ? 'Escolha a coluna' : 'Não tem'}</option>
                {planilha.cabecalho.map((nome, i) => (
                  <option key={i} value={i}>
                    {nome}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>

        {mapa.tipo < 0 && (
          <label className="hist-marcar">
            <input type="checkbox" checked={semSinal} onChange={(e) => setSemSinal(e.target.checked)} />
            Os gastos vieram sem o sinal de menos (a CIFRA usa a categoria para saber se é ganho ou gasto)
          </label>
        )}
        {semConta && (
          <label className="hist-campo">
            <span>Conta para as linhas sem conta</span>
            <input value={contaPadrao} placeholder="Ex.: Nubank" onChange={(e) => setContaPadrao(e.target.value)} />
          </label>
        )}

        <div className="hist-resumo-import">
          <b>{escolhidas.length}</b> para importar · <span className="valor--entrada">{reais(entradas)} de ganhos</span> ·{' '}
          <span className="valor--saida">{reais(saidas)} de gastos</span>
        </div>
        {comSituacao.some((r) => r.parecida) && (
          <label className="hist-marcar">
            <input type="checkbox" checked={incluirParecidas} onChange={(e) => setIncluirParecidas(e.target.checked)} />
            Importar também {comSituacao.filter((r) => r.parecida).length} que parecem repetidas (mesma data e valor de um lançamento que você já tem)
          </label>
        )}

        <ul className="hist-previa">
          {comSituacao.slice(0, 8).map((r) => (
            <li key={r.linha} className={r.parecida && !incluirParecidas ? 'hist-previa__item hist-previa__item--fora' : 'hist-previa__item'}>
              <span>{dataCurta(r.data)}</span>
              <b>{r.descricao}</b>
              <small>
                {r.categoria || 'Outros'} · {r.conta || contaPadrao || 'sem conta'}
                {r.parecida ? ' · parece repetida' : ''}
              </small>
              <b className={r.valor >= 0 ? 'valor--entrada' : 'valor--saida'}>
                {r.valor >= 0 ? '+ ' : '− '}
                {reais(Math.abs(r.valor))}
              </b>
            </li>
          ))}
          {comSituacao.length > 8 && <li className="hist-previa__mais">e mais {comSituacao.length - 8}…</li>}
        </ul>

        <div className="hist-janela__acoes">
          <button type="button" className="hist-botao" onClick={aoFechar}>
            Cancelar
          </button>
          <button type="submit" className="hist-botao hist-botao--principal" disabled={!escolhidas.length || mapa.data < 0 || mapa.valor < 0}>
            Importar {escolhidas.length} {escolhidas.length === 1 ? 'lançamento' : 'lançamentos'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ===== Tela "Trazer meses passados" =====
export default function Historico() {
  const [versao, setVersao] = useState(0); // recarrega o que vem do armazenamento depois de cada mudança
  const [aviso, setAviso] = useState(null); // { tipo: 'ok' | 'erro', texto }
  const recarregar = () => setVersao((v) => v + 1);

  // ----- Extratos e faturas (vários arquivos, um de cada vez na conferência) -----
  const campoExtratos = useRef(null);
  const [modo, setModo] = useState('conta'); // 'conta' (extrato) ou 'cartao' (fatura)
  const [fila, setFila] = useState([]); // arquivos esperando
  const [extrato, setExtrato] = useState(null); // arquivo aberto na conferência
  const [feitos, setFeitos] = useState([]); // resultados desta rodada

  async function abrirProximo(arquivos) {
    const [primeiro, ...resto] = arquivos;
    setFila(resto);
    if (!primeiro) {
      setExtrato(null);
      return;
    }
    try {
      const csv = /\.(csv|txt)$/i.test(primeiro.name) || primeiro.type === 'text/csv';
      const lido = csv ? await lerArquivoCSV(primeiro) : await lerArquivoOFX(primeiro);
      setExtrato({ ...lido, nomeDoArquivo: primeiro.name });
    } catch (e) {
      setFeitos((f) => [...f, { arquivo: primeiro.name, erro: e.message || 'Não foi possível ler este arquivo.' }]);
      abrirProximo(resto);
    }
  }

  function escolherExtratos(e) {
    const arquivos = [...(e.target.files || [])];
    e.target.value = '';
    if (!arquivos.length) return;
    setAviso(null);
    setFeitos([]);
    abrirProximo(arquivos.sort((a, b) => a.name.localeCompare(b.name)));
  }

  function confirmarExtrato(dados) {
    const r = aplicarImportacao(dados, { descricao: extrato.nomeDoArquivo });
    setFeitos((f) => [...f, { arquivo: extrato.nomeDoArquivo, ...r }]);
    recarregar();
    abrirProximo(fila);
  }

  // ----- Planilha -----
  const campoPlanilha = useRef(null);
  const [planilha, setPlanilha] = useState(null);

  function baixarModelo() {
    const url = URL.createObjectURL(new Blob([modeloCSV()], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'modelo-cifra.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function escolherPlanilha(e) {
    const arquivo = e.target.files?.[0];
    e.target.value = '';
    if (!arquivo) return;
    setAviso(null);
    try {
      setPlanilha(await lerPlanilha(arquivo));
    } catch (falha) {
      setAviso({ tipo: 'erro', texto: falha.message || 'Não foi possível ler esta planilha.' });
    }
  }

  function confirmarPlanilha(linhas, { contaPadrao, origem }) {
    const nome = ORIGENS.find((o) => o.id === origem)?.nome || 'Planilha';
    const r = aplicarPlanilha(linhas, { descricao: `${nome} · ${planilha.arquivo}`, contaPadrao });
    setPlanilha(null);
    recarregar();
    setAviso({
      tipo: 'ok',
      texto: `${r.importados} lançamentos importados da planilha (${r.contas.join(', ')}).${r.contasCriadas ? ` ${r.contasCriadas} ${r.contasCriadas === 1 ? 'conta criada' : 'contas criadas'}.` : ''}${
        r.categoriasCriadas ? ' Categorias novas foram criadas.' : ''
      }`,
    });
  }

  // ----- Resumo de um mês antigo -----
  const categorias = carregarCategorias().filter((c) => c.nome !== TRANSFERENCIA.nome);
  const deGanho = categorias.filter((c) => c.tipo === 'receita');
  const deGasto = categorias.filter((c) => c.tipo !== 'receita');
  const [mesResumo, setMesResumo] = useState(() => mudarMes(dataDeHoje().slice(0, 7), -1));
  const [valores, setValores] = useState({});
  useEffect(() => {
    const salvo = resumoDoMes(mesResumo);
    const textos = {};
    Object.entries(salvo).forEach(([cat, v]) => {
      textos[cat] = Math.abs(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    });
    setValores(textos);
  }, [mesResumo, versao]);
  const lancamentosDoMesResumo = useMemo(
    () => carregar().filter((l) => l.data.startsWith(mesResumo) && !l.resumo && !l.transferencia).length,
    [mesResumo, versao] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const totalGanhos = deGanho.reduce((s, c) => s + lerNumero(valores[c.nome] || ''), 0);
  const totalGastos = deGasto.reduce((s, c) => s + lerNumero(valores[c.nome] || ''), 0);
  const temResumo = Object.keys(resumoDoMes(mesResumo)).length > 0;

  function salvarResumo(e) {
    e.preventDefault();
    if (mesResumo >= dataDeHoje().slice(0, 7)) {
      setAviso({ tipo: 'erro', texto: 'O resumo é para meses que já passaram. Para este mês, use Lançamentos.' });
      return;
    }
    const itens = categorias.map((c) => ({ categoria: c.nome, valor: (c.tipo === 'receita' ? 1 : -1) * lerNumero(valores[c.nome] || '') }));
    const n = aplicarResumo(mesResumo, itens);
    recarregar();
    setAviso({
      tipo: 'ok',
      texto: n ? `Resumo de ${nomeDoMes(mesResumo).toLowerCase()} salvo. Já aparece no Painel e nos Relatórios.` : `Resumo de ${nomeDoMes(mesResumo).toLowerCase()} apagado.`,
    });
  }

  // ----- Ganhos e gastos que se repetem -----
  const sugestoes = useMemo(() => acharRecorrentes(carregar(), dataDeHoje()), [versao]); // eslint-disable-line react-hooks/exhaustive-deps
  const [desmarcadas, setDesmarcadas] = useState([]);
  const escolhidasRec = sugestoes.filter((s) => !desmarcadas.includes(s.chave));

  function levarAoChecklist() {
    if (!escolhidasRec.length) return;
    salvar(marcarComoFixos(carregar(), escolhidasRec));
    const ganhos = escolhidasRec.filter((s) => s.tipo === 'receita').length;
    const gastos = escolhidasRec.length - ganhos;
    setDesmarcadas([]);
    recarregar();
    setAviso({
      tipo: 'ok',
      texto: `${[ganhos && `${ganhos} ${ganhos === 1 ? 'ganho fixo' : 'ganhos fixos'}`, gastos && `${gastos} ${gastos === 1 ? 'conta fixa' : 'contas fixas'}`]
        .filter(Boolean)
        .join(' e ')} no Checklist. Eles passam a aparecer todo mês (também no Calendário e na previsão do Painel).`,
    });
  }

  // ----- Importações feitas -----
  const lotes = useMemo(() => carregarLotes(), [versao]); // eslint-disable-line react-hooks/exhaustive-deps

  function desfazer(lote) {
    if (!window.confirm(`Desfazer "${lote.descricao}"? ${lote.qtd} lançamentos saem da CIFRA.`)) return;
    desfazerLote(lote.id);
    recarregar();
    setAviso({ tipo: 'ok', texto: `Importação desfeita: ${lote.descricao}.` });
  }

  const contas = useMemo(() => carregarContas(), [versao]); // eslint-disable-line react-hooks/exhaustive-deps
  const lancamentos = useMemo(() => carregar(), [versao]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="pp-app">
      <MenuLateral />

      <main className="pp hist">
        <div className="pp__topo">
          <div>
            <h1 className="pp__titulo">Trazer meses passados</h1>
            <p className="pp__subtitulo">Coloque o seu histórico na CIFRA: extratos, planilhas ou só o total de cada mês</p>
          </div>
        </div>

        {aviso && (
          <p className={aviso.tipo === 'erro' ? 'hist-aviso hist-aviso--erro' : 'hist-aviso'} role="status">
            {aviso.texto}
          </p>
        )}

        <div className="hist__grade">
          {/* ===== 1. Extratos e faturas ===== */}
          <section className="cartao hist-bloco">
            <span className="hist-bloco__numero">1</span>
            <h2 className="cartao__titulo">Extratos e faturas antigos</h2>
            <p className="hist-bloco__texto">
              Baixe no app ou site do banco o extrato (ou a fatura do cartão) em <b>OFX</b> ou <b>CSV</b> dos meses que quiser e escolha
              todos os arquivos de uma vez. Você confere um por um antes de entrar.
            </p>
            <div className="hist-opcoes" role="group" aria-label="Tipo dos arquivos">
              {[
                ['conta', 'Extratos de conta'],
                ['cartao', 'Faturas de cartão'],
              ].map(([v, t]) => (
                <button key={v} type="button" aria-pressed={modo === v} className={modo === v ? 'hist-opcao hist-opcao--ativa' : 'hist-opcao'} onClick={() => setModo(v)}>
                  {t}
                </button>
              ))}
            </div>
            <button type="button" className="hist-botao hist-botao--principal" onClick={() => campoExtratos.current?.click()}>
              Escolher arquivos
            </button>
            <input
              ref={campoExtratos}
              id="hist-extratos"
              type="file"
              multiple
              accept=".ofx,.qfx,.csv,.txt,text/csv,application/x-ofx"
              hidden
              onChange={escolherExtratos}
            />
            <p className="hist-bloco__nota">
              Se o histórico for mais antigo que a conta, a conta passa a começar na data mais antiga e o saldo de hoje continua o mesmo.
            </p>
            {feitos.length > 0 && (
              <ul className="hist-feitos">
                {feitos.map((f, i) => (
                  <li key={i} className={f.erro ? 'hist-feitos__erro' : ''}>
                    <b>{f.arquivo}</b>
                    {f.erro
                      ? ` · ${f.erro}`
                      : ` · ${f.importados} ${f.importados === 1 ? 'lançamento' : 'lançamentos'} em ${f.nome}${f.criada ? ' (conta criada)' : ''}${
                          f.quitadas ? ` · ${f.quitadas} parcela(s) de dívida` : ''
                        }`}
                  </li>
                ))}
                {(fila.length > 0 || extrato) && <li>Faltam {fila.length + (extrato ? 1 : 0)} arquivo(s)…</li>}
              </ul>
            )}
          </section>

          {/* ===== 2. Planilha ===== */}
          <section className="cartao hist-bloco">
            <span className="hist-bloco__numero">2</span>
            <h2 className="cartao__titulo">Planilha (Excel, Organizze, Mobills)</h2>
            <p className="hist-bloco__texto">
              Controlava numa planilha ou em outro app? Exporte em CSV (no Excel: <i>Salvar como &gt; CSV</i>) ou preencha o modelo da CIFRA. Colunas
              como data, descrição, valor, categoria e conta são encontradas sozinhas.
            </p>
            <div className="hist-acoes">
              <button type="button" className="hist-botao" onClick={baixarModelo}>
                Baixar modelo
              </button>
              <button type="button" className="hist-botao hist-botao--principal" onClick={() => campoPlanilha.current?.click()}>
                Importar planilha
              </button>
            </div>
            <input ref={campoPlanilha} id="hist-planilha" type="file" accept=".csv,.txt,text/csv" hidden onChange={escolherPlanilha} />
            <p className="hist-bloco__nota">Categorias que não existem na CIFRA são criadas com o mesmo nome. Contas também.</p>
          </section>

          {/* ===== 3. Resumo do mês ===== */}
          <section className="cartao hist-bloco hist-bloco--largo">
            <span className="hist-bloco__numero">3</span>
            <h2 className="cartao__titulo">Não tem os detalhes? Coloque só o total do mês</h2>
            <p className="hist-bloco__texto">
              Para os gráficos e relatórios terem histórico sem digitar gasto por gasto. O resumo fica em “{CONTA_DO_RESUMO}” e{' '}
              <b>não muda o saldo das suas contas</b>.
            </p>
            <form className="hist-resumo" onSubmit={salvarResumo}>
              <label className="hist-campo hist-campo--mes">
                <span>Mês</span>
                <input id="hist-mes" type="month" value={mesResumo} max={mudarMes(dataDeHoje().slice(0, 7), -1)} onChange={(e) => e.target.value && setMesResumo(e.target.value)} />
              </label>
              {lancamentosDoMesResumo > 0 && (
                <p className="hist-alerta">
                  {nomeDoMes(mesResumo)} já tem {lancamentosDoMesResumo} {lancamentosDoMesResumo === 1 ? 'lançamento' : 'lançamentos'}. O resumo soma em cima
                  deles: coloque só o que ainda não está lançado.
                </p>
              )}
              <div className="hist-resumo__colunas">
                {[
                  ['Ganhos', deGanho, totalGanhos, 'valor--entrada'],
                  ['Gastos', deGasto, totalGastos, 'valor--saida'],
                ].map(([titulo, lista, total, classe]) => (
                  <fieldset key={titulo} className="hist-resumo__grupo">
                    <legend>
                      {titulo} <b className={classe}>{reais(total)}</b>
                    </legend>
                    {lista.map((c) => (
                      <label key={c.nome} className="hist-resumo__linha">
                        <span className="hist-resumo__icone" style={{ background: dadosDaCategoria(c.nome).cor }} aria-hidden="true">
                          {dadosDaCategoria(c.nome).emoji}
                        </span>
                        <span className="hist-resumo__nome">{c.nome}</span>
                        <span className="hist-resumo__caixa">
                          R$
                          <input
                            inputMode="decimal"
                            placeholder="0,00"
                            aria-label={`${titulo}: ${c.nome}`}
                            value={valores[c.nome] || ''}
                            onChange={(e) => setValores((v) => ({ ...v, [c.nome]: mascaraValor(e.target.value).replace('-', '') }))}
                          />
                        </span>
                      </label>
                    ))}
                  </fieldset>
                ))}
              </div>
              <div className="hist-resumo__rodape">
                <span>
                  Sobrou em {nomeDoMes(mesResumo).toLowerCase()}:{' '}
                  <b className={totalGanhos - totalGastos >= 0 ? 'valor--entrada' : 'valor--saida'}>{reais(totalGanhos - totalGastos)}</b>
                </span>
                <button type="submit" className="hist-botao hist-botao--principal">
                  {temResumo ? 'Atualizar resumo' : 'Salvar resumo'}
                </button>
              </div>
            </form>
          </section>

          {/* ===== Ganhos e gastos que se repetem ===== */}
          <section className="cartao hist-bloco hist-bloco--largo hist-recorrentes">
            <h2 className="cartao__titulo">Ganhos e contas que se repetem</h2>
            <p className="hist-bloco__texto">
              A CIFRA olha o seu histórico e acha o que entra ou sai todo mês: do mesmo pagador, no mesmo dia ou em dias bem próximos. Leve para o{' '}
              <Link to="/painel/checklist">Checklist</Link> e eles passam a aparecer todo mês.
            </p>
            {sugestoes.length === 0 ? (
              <p className="hist-vazio">Nada que se repete por enquanto. Traga pelo menos 2 ou 3 meses de histórico para a CIFRA encontrar.</p>
            ) : (
              <>
                <ul className="hist-rec__lista">
                  {sugestoes.map((s) => (
                    <li key={s.chave}>
                      <label className={desmarcadas.includes(s.chave) ? 'hist-rec hist-rec--fora' : 'hist-rec'}>
                        <input
                          type="checkbox"
                          checked={!desmarcadas.includes(s.chave)}
                          onChange={(e) => setDesmarcadas((d) => (e.target.checked ? d.filter((x) => x !== s.chave) : [...d, s.chave]))}
                        />
                        <span className={s.tipo === 'receita' ? 'hist-rec__tipo hist-rec__tipo--ganho' : 'hist-rec__tipo'}>
                          {s.tipo === 'receita' ? 'Ganho' : 'Conta'}
                        </span>
                        <span className="hist-rec__textos">
                          <b>{s.nome}</b>
                          <small>
                            Todo dia ~{s.dia} · {s.vezes} meses ({s.periodo}) · {s.conta} ·{' '}
                            {s.motivo === 'provedor' ? 'mesmo pagador' : 'mesmo dia e valor parecido'}
                          </small>
                        </span>
                        <b className={s.tipo === 'receita' ? 'valor--entrada' : 'valor--saida'}>{reais(s.valor)}</b>
                      </label>
                    </li>
                  ))}
                </ul>
                <button type="button" className="hist-botao hist-botao--principal" onClick={levarAoChecklist} disabled={!escolhidasRec.length}>
                  Levar {escolhidasRec.length} para o Checklist
                </button>
              </>
            )}
          </section>

          {/* ===== Importações feitas ===== */}
          <section className="cartao hist-bloco hist-bloco--largo">
            <h2 className="cartao__titulo">Importações feitas</h2>
            {lotes.length === 0 ? (
              <p className="hist-vazio">Nenhuma ainda. Tudo o que você trouxer aparece aqui, com a opção de desfazer.</p>
            ) : (
              <ul className="hist-lotes">
                {lotes.map((l) => (
                  <li key={l.id}>
                    <span className="hist-lotes__textos">
                      <b>{l.descricao}</b>
                      <small>
                        {ORIGEM_DO_LOTE[l.origem] || 'Importação'} · {l.qtd} {l.qtd === 1 ? 'lançamento' : 'lançamentos'}
                        {l.de ? ` · ${dataCurta(l.de)} a ${dataCurta(l.ate)}` : ''} · em {new Date(l.quando).toLocaleDateString('pt-BR')}
                      </small>
                    </span>
                    <button type="button" className="hist-botao hist-botao--perigo" onClick={() => desfazer(l)}>
                      Desfazer
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {extrato && (
          <ImportarOFX
            key={extrato.nomeDoArquivo}
            extrato={extrato}
            modo={modo}
            contas={contas}
            lancamentos={lancamentos}
            aoConfirmar={confirmarExtrato}
            saldoDoBanco={false}
            aoFechar={() => abrirProximo(fila)}
          />
        )}
        {planilha && <JanelaPlanilha planilha={planilha} aoConfirmar={confirmarPlanilha} aoFechar={() => setPlanilha(null)} />}
      </main>
    </div>
  );
}
