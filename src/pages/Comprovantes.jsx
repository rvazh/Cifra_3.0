import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import MenuLateral from '../components/MenuLateral.jsx';
import { IconeMais, IconeBusca, IconeBaixar, IconeLixeira } from '../components/Icones.jsx';
import { reais } from '../components/Graficos.jsx';
import { carregar, salvar, dataCurta } from '../dados/lancamentos.js';
import {
  TIPOS_ACEITOS,
  guardarComprovante,
  listarComprovantes,
  apagarComprovante,
  vincularComprovante,
  tamanhoLegivel,
} from '../dados/comprovantes.js';
import './Painel.css';
import './Comprovantes.css';

function simplificar(texto) {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

function dataDoEnvio(iso) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function Comprovantes() {
  const [comprovantes, setComprovantes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [lista, setLista] = useState(carregar);
  const [busca, setBusca] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState('');
  const [vendo, setVendo] = useState(null); // comprovante aberto na janela
  const [vinculo, setVinculo] = useState(''); // lançamento escolhido no envio avulso
  const campoArquivo = useRef(null);

  // Endereços temporários para mostrar as imagens (um por comprovante)
  const enderecos = useMemo(() => {
    const mapa = {};
    comprovantes.forEach((c) => {
      mapa[c.id] = URL.createObjectURL(c.blob);
    });
    return mapa;
  }, [comprovantes]);
  useEffect(() => () => Object.values(enderecos).forEach((u) => URL.revokeObjectURL(u)), [enderecos]);

  async function recarregar() {
    try {
      setComprovantes(await listarComprovantes());
    } catch {
      setErro('Este navegador não deixou abrir o armazenamento de comprovantes.');
    }
    setCarregando(false);
  }

  useEffect(() => {
    recarregar();
  }, []);

  useEffect(() => salvar(lista), [lista]);

  // Fecha a janela com Esc
  useEffect(() => {
    if (!vendo) return undefined;
    const aoTeclar = (e) => e.key === 'Escape' && setVendo(null);
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, [vendo]);

  const porId = useMemo(() => Object.fromEntries(lista.map((l) => [l.id, l])), [lista]);
  const recentes = useMemo(
    () => [...lista].filter((l) => !l.comprovanteId).sort((a, b) => b.data.localeCompare(a.data)).slice(0, 40),
    [lista]
  );

  const termo = simplificar(busca.trim());
  const visiveis = comprovantes.filter((c) => {
    if (!termo) return true;
    const l = porId[c.lancamentoId];
    return simplificar(`${c.nome} ${l ? `${l.descricao} ${l.categoria} ${l.conta}` : ''}`).includes(termo);
  });
  const totalOcupado = comprovantes.reduce((s, c) => s + c.tamanho, 0);

  async function enviar(evento) {
    const arquivos = [...evento.target.files];
    evento.target.value = '';
    if (!arquivos.length) return;
    setErro('');
    setMensagem('');
    try {
      for (const arquivo of arquivos) {
        const registro = await guardarComprovante(arquivo, vinculo || null);
        if (vinculo) {
          setLista((atual) => atual.map((l) => (l.id === vinculo ? { ...l, comprovanteId: registro.id } : l)));
        }
      }
      setMensagem(arquivos.length > 1 ? `${arquivos.length} comprovantes guardados.` : 'Comprovante guardado.');
      setVinculo('');
      recarregar();
    } catch (e) {
      setErro(e.message || 'Não foi possível guardar o arquivo.');
    }
  }

  async function excluir(c) {
    if (!window.confirm(`Excluir o comprovante "${c.nome}"? Não tem volta.`)) return;
    await apagarComprovante(c.id);
    setLista((atual) => atual.map((l) => (l.comprovanteId === c.id ? { ...l, comprovanteId: undefined } : l)));
    setVendo(null);
    recarregar();
  }

  async function ligarALancamento(c, lancamentoId) {
    await vincularComprovante(c.id, lancamentoId || null);
    setLista((atual) =>
      atual.map((l) => {
        if (l.comprovanteId === c.id && l.id !== lancamentoId) return { ...l, comprovanteId: undefined };
        if (l.id === lancamentoId) return { ...l, comprovanteId: c.id };
        return l;
      })
    );
    recarregar();
  }

  return (
    <div className="pp-app">
      <MenuLateral />

      <main className="pp comp">
        <div className="pp__topo">
          <div>
            <h1 className="pp__titulo">Comprovantes</h1>
            <p className="pp__subtitulo">Fotos e PDFs dos seus pagamentos, guardados neste aparelho</p>
          </div>
        </div>

        {/* ===== Enviar ===== */}
        <section className="comp-envio">
          <div className="comp-envio__textos">
            <b>Guardar comprovante</b>
            <span>Foto (JPG, PNG) ou PDF de até 10 MB. Fotos grandes são reduzidas para ocupar menos espaço.</span>
          </div>
          <label className="comp-envio__vinculo">
            Ligar ao lançamento (opcional)
            <select value={vinculo} onChange={(e) => setVinculo(e.target.value)}>
              <option value="">Nenhum</option>
              {recentes.map((l) => (
                <option key={l.id} value={l.id}>
                  {dataCurta(l.data)} · {l.descricao} · {reais(Math.abs(l.valor))}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="comp-envio__botao" onClick={() => campoArquivo.current?.click()}>
            <IconeMais tamanho={18} espessura={2.6} />
            Enviar arquivo
          </button>
          <input ref={campoArquivo} type="file" accept={TIPOS_ACEITOS} multiple hidden onChange={enviar} />
          {mensagem && (
            <p className="comp-envio__ok" role="status">
              {mensagem}
            </p>
          )}
          {erro && (
            <p className="comp-envio__erro" role="alert">
              {erro}
            </p>
          )}
        </section>

        <div className="comp__barra">
          <span className="comp__contagem">
            {comprovantes.length} {comprovantes.length === 1 ? 'comprovante' : 'comprovantes'} · {tamanhoLegivel(totalOcupado)}
          </span>
          {comprovantes.length > 0 && (
            <label className="comp__busca">
              <IconeBusca tamanho={16} espessura={2.2} />
              <input
                type="search"
                placeholder="Buscar"
                aria-label="Buscar comprovante"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </label>
          )}
        </div>

        {/* ===== Lista ===== */}
        {carregando ? null : comprovantes.length === 0 ? (
          <section className="comp-vazio">
            <span className="comp-vazio__icone" aria-hidden="true">
              🧾
            </span>
            <b>Nenhum comprovante guardado ainda</b>
            <span>
              Envie aqui, ou anexe na hora de fazer um <Link to="/painel/lancamentos">lançamento</Link>.
            </span>
          </section>
        ) : visiveis.length === 0 ? (
          <p className="comp__nada">Nada encontrado para “{busca}”.</p>
        ) : (
          <div className="comp__grade">
            {visiveis.map((c) => {
              const l = porId[c.lancamentoId];
              const imagem = c.tipo.startsWith('image/');
              return (
                <article key={c.id} className="comp-cartao">
                  <button type="button" className="comp-cartao__previa" onClick={() => setVendo(c)} aria-label={`Ver ${c.nome}`}>
                    {imagem ? <img src={enderecos[c.id]} alt="" /> : <span className="comp-cartao__pdf">PDF</span>}
                  </button>
                  <div className="comp-cartao__textos">
                    <b className="comp-cartao__nome" title={c.nome}>
                      {c.nome}
                    </b>
                    <span className="comp-cartao__info">
                      {dataDoEnvio(c.criadoEm)} · {tamanhoLegivel(c.tamanho)}
                    </span>
                    {l ? (
                      <span className="comp-cartao__lanc">
                        {l.descricao} · <b className={l.valor >= 0 ? 'valor--entrada' : 'valor--saida'}>{reais(Math.abs(l.valor))}</b>
                      </span>
                    ) : (
                      <span className="comp-cartao__lanc comp-cartao__lanc--solto">Sem lançamento</span>
                    )}
                  </div>
                  <div className="comp-cartao__acoes">
                    <a className="comp-cartao__botao" href={enderecos[c.id]} download={c.nome} aria-label={`Baixar ${c.nome}`}>
                      <IconeBaixar tamanho={16} espessura={2.2} />
                    </a>
                    <button type="button" className="comp-cartao__botao comp-cartao__botao--excluir" onClick={() => excluir(c)} aria-label={`Excluir ${c.nome}`}>
                      <IconeLixeira tamanho={16} espessura={2.2} />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <p className="comp__nota">
          Os comprovantes ficam só neste navegador e não entram no backup de Configurações. Para guardar uma cópia, use o
          botão de baixar.
        </p>

        {/* ===== Janela: ver comprovante ===== */}
        {vendo && (
          <div className="comp-fundo" onClick={() => setVendo(null)}>
            <div className="comp-janela" role="dialog" aria-modal="true" aria-label={vendo.nome} onClick={(e) => e.stopPropagation()}>
              <div className="comp-janela__topo">
                <b title={vendo.nome}>{vendo.nome}</b>
                <button type="button" className="comp-janela__fechar" onClick={() => setVendo(null)} aria-label="Fechar">
                  ×
                </button>
              </div>
              <div className="comp-janela__conteudo">
                {vendo.tipo.startsWith('image/') ? (
                  <img src={enderecos[vendo.id]} alt={`Comprovante ${vendo.nome}`} />
                ) : (
                  <iframe src={enderecos[vendo.id]} title={vendo.nome} />
                )}
              </div>
              <div className="comp-janela__rodape">
                <label className="comp-envio__vinculo">
                  Lançamento
                  <select value={vendo.lancamentoId || ''} onChange={(e) => {
                    ligarALancamento(vendo, e.target.value);
                    setVendo({ ...vendo, lancamentoId: e.target.value || null });
                  }}>
                    <option value="">Nenhum</option>
                    {vendo.lancamentoId && porId[vendo.lancamentoId] && (
                      <option value={vendo.lancamentoId}>
                        {dataCurta(porId[vendo.lancamentoId].data)} · {porId[vendo.lancamentoId].descricao}
                      </option>
                    )}
                    {recentes.map((l) => (
                      <option key={l.id} value={l.id}>
                        {dataCurta(l.data)} · {l.descricao} · {reais(Math.abs(l.valor))}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="comp-janela__botoes">
                  <a className="comp-botao" href={enderecos[vendo.id]} target="_blank" rel="noopener noreferrer">
                    Abrir em nova aba
                  </a>
                  <a className="comp-botao" href={enderecos[vendo.id]} download={vendo.nome}>
                    Baixar
                  </a>
                  <button type="button" className="comp-botao comp-botao--excluir" onClick={() => excluir(vendo)}>
                    Excluir
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
