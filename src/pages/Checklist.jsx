import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import MenuLateral from '../components/MenuLateral.jsx';
import { reais } from '../components/Graficos.jsx';
import {
  categoria,
  carregar,
  salvar,
  dataDeHoje,
  dataCurta,
  nomeDoMes,
  mudarMes,
  lancamentosDoMes,
  situacaoDe,
  comSituacao,
  modeloDaFixa,
} from '../dados/lancamentos.js';
import ReajustarFixa from '../components/ReajustarFixa.jsx';
import ParcelaDivida from '../components/ParcelaDivida.jsx';
import { parcelasDoMes } from '../dados/parcelas.js';
import './Painel.css';
import './Checklist.css';

const SITUACOES = [
  { id: 'pago', texto: 'Pago' },
  { id: 'guardado', texto: 'Guardado' },
  { id: 'pendente', texto: 'Pendente' },
];
// Ganho não tem "guardado": ou já caiu na conta, ou ainda vai cair
const SITUACOES_GANHO = [
  { id: 'pago', texto: 'Recebido' },
  { id: 'pendente', texto: 'Pendente' },
];

// Conta fixa = repete todo mês (ou veio de uma que repete). Parcelada = tem parcelas.
function tipoDaConta(l) {
  if (l.grupo || l.parcela) return 'parcelada';
  if (l.repete || l.previsto || l.origem) return 'fixa';
  return null;
}

// "Celular novo (3/10)" -> "Celular novo"
function nomeBase(descricao) {
  return descricao.replace(/\s*\(\d+\/\d+\)\s*$/, '');
}

// "2026-06-12" -> "jun/2026"
function mesAno(data) {
  const curto = new Date(Number(data.slice(0, 4)), Number(data.slice(5, 7)) - 1, 1)
    .toLocaleDateString('pt-BR', { month: 'short' })
    .replace('.', '');
  return `${curto}/${data.slice(0, 4)}`;
}

// Junta as parcelas de cada compra (mesmo "grupo") e calcula o andamento
function montarParcelamentos(lista) {
  const grupos = {};
  lista
    .filter((l) => l.grupo && l.parcela && l.valor < 0)
    .forEach((l) => {
      (grupos[l.grupo] ||= []).push(l);
    });

  return Object.entries(grupos)
    .map(([id, parcelas]) => {
      parcelas.sort((a, b) => a.data.localeCompare(b.data));
      const primeira = parcelas[0];
      const ultima = parcelas[parcelas.length - 1];
      const total = Math.max(primeira.parcela.total, parcelas.length);
      const pagas = parcelas.filter((l) => situacaoDe(l) === 'pago');
      const abertas = parcelas.filter((l) => situacaoDe(l) !== 'pago');
      const guardadas = abertas.filter((l) => situacaoDe(l) === 'guardado').length;
      const valorTotal = parcelas.reduce((s, l) => s - l.valor, 0);
      const restante = abertas.reduce((s, l) => s - l.valor, 0);
      return {
        id,
        nome: nomeBase(primeira.descricao),
        conta: primeira.conta,
        categoria: primeira.categoria,
        valorParcela: -ultima.valor, // a 1ª pode ter os centavos de diferença
        valorTotal,
        restante,
        total,
        pagas: pagas.length,
        faltam: abertas.length,
        guardadas,
        inicio: primeira.data,
        fim: ultima.data,
        proxima: abertas[0] || null,
        quitado: abertas.length === 0,
      };
    })
    .sort((a, b) => Number(a.quitado) - Number(b.quitado) || a.fim.localeCompare(b.fim));
}

function CartaoParcelamento({ p, hoje }) {
  const pct = (p.pagas / p.total) * 100;
  const atrasada = p.proxima && p.proxima.data < hoje;
  return (
    <li className={p.quitado ? 'chk-parc chk-parc--quitado' : 'chk-parc'}>
      <div className="chk-parc__topo">
        <span className="chk-parc__icone" style={{ background: categoria(p.categoria).cor }} aria-hidden="true">
          {categoria(p.categoria).emoji}
        </span>
        <span className="chk-parc__textos">
          <b className="chk-parc__nome">{p.nome}</b>
          <span className="chk-parc__detalhe">
            {p.total}x de {reais(p.valorParcela)} · {p.conta}
          </span>
        </span>
        {p.quitado ? (
          <span className="chk-parc__selo">Quitado</span>
        ) : (
          <span className="chk-parc__contagem">
            <b>{p.pagas}</b> de {p.total} pagas
          </span>
        )}
      </div>

      <div
        className="chk-parc__barra"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={p.total}
        aria-valuenow={p.pagas}
        aria-label={`${p.pagas} de ${p.total} parcelas pagas`}
      >
        <span style={{ width: `${pct}%` }} />
      </div>

      <dl className="chk-parc__dados">
        <div>
          <dt>Faltam</dt>
          <dd>
            {p.quitado ? 'Nenhuma' : `${p.faltam} ${p.faltam === 1 ? 'parcela' : 'parcelas'}`}
            <small>{p.quitado ? `${p.total} de ${p.total} pagas` : `${reais(p.restante)} a pagar`}</small>
          </dd>
        </div>
        <div>
          <dt>Começou</dt>
          <dd>
            {mesAno(p.inicio)}
            <small>Total {reais(p.valorTotal)}</small>
          </dd>
        </div>
        <div>
          <dt>{p.quitado ? 'Terminou' : 'Previsão de fim'}</dt>
          <dd>
            {mesAno(p.fim)}
            <small>
              {p.quitado
                ? 'Tudo pago'
                : atrasada
                  ? <span className="chk-parc__atrasada">Parcela {p.proxima.parcela.numero} atrasada</span>
                  : `Próxima: ${dataCurta(p.proxima.data)}`}
            </small>
          </dd>
        </div>
      </dl>
      {p.guardadas > 0 && (
        <span className="chk-parc__nota">
          {p.guardadas === 1 ? '1 parcela já está guardada' : `${p.guardadas} parcelas já estão guardadas`}
        </span>
      )}
    </li>
  );
}

function Linha({ l, hoje, aoMudar, aoReajustar, situacoes = SITUACOES }) {
  const situacao = situacaoDe(l);
  const atrasada = situacao === 'pendente' && l.data < hoje;
  const [, mes, dia] = l.data.split('-');
  return (
    <li className={`chk-item chk-item--${situacao}`}>
      <span className="chk-item__data">
        <b>{Number(dia)}</b>/{mes}
      </span>
      <span className="chk-item__icone" style={{ background: categoria(l.categoria).cor }} aria-hidden="true">
        {categoria(l.categoria).emoji}
      </span>
      <span className="chk-item__textos">
        <b className="chk-item__nome">{l.descricao}</b>
        <span className="chk-item__detalhe">
          {l.conta}
          {l.parcela ? ` · parcela ${l.parcela.numero} de ${l.parcela.total}` : ''}
          {atrasada && <span className="chk-item__atrasada">{l.valor > 0 ? 'Não caiu ainda' : 'Atrasada'}</span>}
          {aoReajustar && (
            <button type="button" className="chk-item__reajustar" onClick={() => aoReajustar(l)}>
              Reajustar
            </button>
          )}
        </span>
      </span>
      <b className={l.valor > 0 ? 'chk-item__valor valor--entrada' : 'chk-item__valor'}>
        {l.valor > 0 ? '+ ' : ''}
        {reais(Math.abs(l.valor))}
      </b>
      <span className="chk-situacao" role="group" aria-label={`Situação de ${l.descricao}`}>
        {situacoes.map((s) => (
          <button
            key={s.id}
            type="button"
            aria-pressed={situacao === s.id}
            className={situacao === s.id ? `chk-situacao__botao chk-situacao__botao--${s.id}` : 'chk-situacao__botao'}
            onClick={() => aoMudar(l, s.id)}
          >
            {s.texto}
          </button>
        ))}
      </span>
    </li>
  );
}

export default function Checklist() {
  const hoje = dataDeHoje();
  const [lista, setLista] = useState(carregar);
  const [mes, setMes] = useState(hoje.slice(0, 7));

  useEffect(() => salvar(lista), [lista]);

  // Contas do mês que são fixas ou parceladas (só as despesas)
  const contas = useMemo(
    () =>
      lancamentosDoMes(lista, mes)
        .filter((l) => l.valor < 0 && tipoDaConta(l))
        .sort((a, b) => a.data.localeCompare(b.data)),
    [lista, mes]
  );
  const parcelamentos = useMemo(() => montarParcelamentos(lista), [lista]);
  const emAndamento = parcelamentos.filter((p) => !p.quitado);
  const fixas = contas.filter((l) => tipoDaConta(l) === 'fixa');
  // Ganhos fixos do mês (salário, aluguel que você recebe...): marque quando cair na conta
  const ganhos = useMemo(
    () =>
      lancamentosDoMes(lista, mes)
        .filter((l) => l.valor > 0 && !l.transferencia && tipoDaConta(l) === 'fixa')
        .sort((a, b) => a.data.localeCompare(b.data)),
    [lista, mes]
  );
  const ganhosTotal = ganhos.reduce((t, l) => t + l.valor, 0);
  const ganhosRecebidos = ganhos.filter((l) => situacaoDe(l) === 'pago').reduce((t, l) => t + l.valor, 0);
  const parceladas = contas.filter((l) => tipoDaConta(l) === 'parcelada');

  // Parcelas de "A pagar" e "A receber" do mês (ficam guardadas à parte; "versao" recarrega depois de uma mudança)
  const [versao, setVersao] = useState(0);
  const [aviso, setAviso] = useState('');
  const parcelas = useMemo(() => parcelasDoMes(mes), [mes, versao]); // eslint-disable-line react-hooks/exhaustive-deps
  const aPagarDoMes = parcelas.filter((p) => p.tipo === 'pagar');
  const aReceberDoMes = parcelas.filter((p) => p.tipo === 'receber');
  function parcelaMudou(texto) {
    setLista(carregar()); // registrar uma parcela pode criar lançamentos nas contas
    setVersao((v) => v + 1);
    setAviso(texto);
  }

  // As parcelas das suas dívidas entram nas contas do mês (pagas ou pendentes)
  const soma = (s) => contas.filter((l) => situacaoDe(l) === s).reduce((t, l) => t - l.valor, 0);
  const total = contas.reduce((t, l) => t - l.valor, 0) + aPagarDoMes.reduce((t, p) => t + p.valor, 0);
  const pago = soma('pago') + aPagarDoMes.reduce((t, p) => t + (p.valor - p.falta), 0);
  const guardado = soma('guardado');
  const pendente = soma('pendente') + aPagarDoMes.reduce((t, p) => t + p.falta, 0);
  const feitas = contas.filter((l) => situacaoDe(l) !== 'pendente').length + aPagarDoMes.filter((p) => p.estado === 'paga').length;
  const quantidade = contas.length + aPagarDoMes.length;
  const pct = (v) => (total > 0 ? (v / total) * 100 : 0);

  const [reajustando, setReajustando] = useState(null);

  function mudarSituacao(l, situacao) {
    setLista((atual) => comSituacao(atual, l, situacao));
  }

  return (
    <div className="pp-app">
      <MenuLateral />

      <main className="pp chk">
        <div className="pp__topo">
          <div>
            <h1 className="pp__titulo">Checklist do mês</h1>
            <p className="pp__subtitulo">Ganhos e contas fixas e parceladas: marque o que já caiu, foi pago ou guardado</p>
          </div>
          <div className="chk__navegacao">
            <button type="button" className="chk__seta" onClick={() => setMes(mudarMes(mes, -1))} aria-label="Mês anterior">
              ‹
            </button>
            <b>{nomeDoMes(mes)}</b>
            <button type="button" className="chk__seta" onClick={() => setMes(mudarMes(mes, 1))} aria-label="Próximo mês">
              ›
            </button>
          </div>
        </div>

        {/* ===== Resumo ===== */}
        <section className="chk-resumo">
          <div className="chk-resumo__topo">
            <div>
              <span className="chk-resumo__rotulo">Contas do mês</span>
              <b className="chk-resumo__total">{reais(total)}</b>
            </div>
            <span className="chk-resumo__contador">
              {feitas} de {quantidade} {quantidade === 1 ? 'conta resolvida' : 'contas resolvidas'}
            </span>
          </div>
          <div className="chk-barra" aria-hidden="true">
            <span className="chk-barra__pago" style={{ width: `${pct(pago)}%` }} />
            <span className="chk-barra__guardado" style={{ width: `${pct(guardado)}%` }} />
          </div>
          <div className="chk-resumo__legenda">
            <span>
              <i className="chk-ponto chk-ponto--pago" /> Pago <b>{reais(pago)}</b>
            </span>
            <span>
              <i className="chk-ponto chk-ponto--guardado" /> Guardado <b>{reais(guardado)}</b>
            </span>
            <span>
              <i className="chk-ponto chk-ponto--pendente" /> Pendente <b>{reais(pendente)}</b>
            </span>
          </div>
          <p className="chk-resumo__dica">
            <b>Guardado</b> é o dinheiro que você já separou para a conta, mas que ainda não foi pago.
          </p>
        </section>

        {aviso && (
          <p className="chk__aviso" role="status">
            {aviso}
          </p>
        )}

        {/* ===== Parcelas de A pagar e A receber ===== */}
        {parcelas.length > 0 && (
          <div className="chk__grupos">
            {[
              ['A pagar', 'Parcelas das suas dívidas', aPagarDoMes, '/painel/pagar'],
              ['A receber', 'Parcelas que te devem', aReceberDoMes, '/painel/receber'],
            ]
              .filter(([, , itens]) => itens.length > 0)
              .map(([titulo, sub, itens, rota]) => (
                <section key={titulo} className="cartao chk-grupo">
                  <div className="cartao__titulo-linha">
                    <h2 className="cartao__titulo">
                      {titulo} <span className="chk-grupo__qtd">{itens.length}</span>
                    </h2>
                    <Link to={rota} className="chk-grupo__sub chk-grupo__link">
                      {sub} ›
                    </Link>
                  </div>
                  <ul className="chk-lista">
                    {itens.map((p) => (
                      <ParcelaDivida key={p.chave} p={p} aoMudar={parcelaMudou} mostrarData />
                    ))}
                  </ul>
                </section>
              ))}
          </div>
        )}

        {/* ===== Ganhos fixos ===== */}
        {ganhos.length > 0 && (
          <div className="chk__grupos">
            <section className="cartao chk-grupo chk-grupo--ganhos">
              <div className="cartao__titulo-linha">
                <h2 className="cartao__titulo">
                  Ganhos fixos <span className="chk-grupo__qtd">{ganhos.length}</span>
                </h2>
                <span className="chk-grupo__sub">
                  Recebido <b className="valor--entrada">{reais(ganhosRecebidos)}</b> de {reais(ganhosTotal)}
                </span>
              </div>
              <ul className="chk-lista">
                {ganhos.map((l) => (
                  <Linha
                    key={l.id}
                    l={l}
                    hoje={hoje}
                    situacoes={SITUACOES_GANHO}
                    aoMudar={mudarSituacao}
                    aoReajustar={modeloDaFixa(l, lista) ? (item) => setReajustando(modeloDaFixa(item, lista)) : null}
                  />
                ))}
              </ul>
            </section>
          </div>
        )}

        {contas.length === 0 && (parcelas.length > 0 || ganhos.length > 0) ? null : contas.length === 0 ? (
          <section className="cartao chk-vazio">
            <b>Nenhuma conta fixa ou parcelada em {nomeDoMes(mes)}.</b>
            <span>
              Crie uma conta fixa no <Link to="/painel/calendario">Calendário</Link>, ou faça um{' '}
              <Link to="/painel/lancamentos">lançamento</Link> marcado como “Fixo (todo mês)” ou “Parcelado”.
            </span>
          </section>
        ) : (
          <div className="chk__grupos">
            {[
              ['Contas fixas', 'Se repetem todo mês', fixas],
              ['Parceladas', 'Compras divididas em parcelas', parceladas],
            ]
              .filter(([, , itens]) => itens.length > 0)
              .map(([titulo, sub, itens]) => (
                <section key={titulo} className="cartao chk-grupo">
                  <div className="cartao__titulo-linha">
                    <h2 className="cartao__titulo">
                      {titulo} <span className="chk-grupo__qtd">{itens.length}</span>
                    </h2>
                    <span className="chk-grupo__sub">{sub}</span>
                  </div>
                  <ul className="chk-lista">
                    {itens.map((l) => (
                      <Linha
                        key={l.id}
                        l={l}
                        hoje={hoje}
                        aoMudar={mudarSituacao}
                        aoReajustar={modeloDaFixa(l, lista) ? (item) => setReajustando(modeloDaFixa(item, lista)) : null}
                      />
                    ))}
                  </ul>
                </section>
              ))}
          </div>
        )}

        {/* ===== Parcelamentos (não depende do mês escolhido) ===== */}
        {parcelamentos.length > 0 && (
          <section className="cartao chk-parcelamentos">
            <div className="cartao__titulo-linha">
              <h2 className="cartao__titulo">
                Parcelamentos <span className="chk-grupo__qtd">{emAndamento.length}</span>
              </h2>
              <span className="chk-grupo__sub">
                {emAndamento.length > 0
                  ? `Ainda faltam ${reais(emAndamento.reduce((s, p) => s + p.restante, 0))} no total`
                  : 'Tudo quitado'}
              </span>
            </div>
            <ul className="chk-parc__lista">
              {parcelamentos.map((p) => (
                <CartaoParcelamento key={p.id} p={p} hoje={hoje} />
              ))}
            </ul>
          </section>
        )}
        {reajustando && (
          <ReajustarFixa
            modelo={reajustando}
            lista={lista}
            aoFechar={() => setReajustando(null)}
            aoSalvar={(novaLista) => {
              setLista(novaLista);
              setReajustando(null);
            }}
          />
        )}
      </main>
    </div>
  );
}
