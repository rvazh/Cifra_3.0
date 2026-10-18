import { Link } from 'react-router-dom';
import MenuLateral from '../components/MenuLateral.jsx';
import { IconeCarteira, IconeAlvo, IconeBusca, IconeSino, IconeMais, IconeCima, IconeBaixo } from '../components/Icones.jsx';
import { GraficoColunas, reais } from '../components/Graficos.jsx';
import { chave } from '../dados/armazenamento.js';
import { CartaoOrcamento } from '../components/Orcamento.jsx';
import { carregarPagar, situacaoDaDivida as situacaoDoPagar } from '../dados/pagar.js';
import { parcelasAPagarAte, parcelasAReceberAte } from '../dados/parcelas.js';
import {
  carregar,
  lancamentosDoMes,
  dataDeHoje,
  mudarMes,
  diasAte,
  dataCurta,
  mesFinanceiro,
} from '../dados/lancamentos.js';
import { carregarContas, resumoDaConta, saldoGeralNoFimDo } from '../dados/contas.js';
import { carregarPreferencias, inicioDoMes } from '../dados/preferencias.js';
import { situacaoDoPlano } from '../dados/plano.js';
import './Painel.css';

const MESES_CURTOS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

// "Bom dia", "Boa tarde" ou "Boa noite", conforme a hora
function saudacao() {
  const hora = new Date().getHours();
  if (hora < 12) return 'Bom dia';
  if (hora < 18) return 'Boa tarde';
  return 'Boa noite';
}

// Nome da pessoa (vem do cadastro e é sincronizado com a conta)
function nomeDoUsuario() {
  try {
    return localStorage.getItem(chave('usuario')) || '';
  } catch {
    return '';
  }
}

// Hoje por extenso: "sexta-feira, 9 de outubro"
const hojePorExtenso = new Date().toLocaleDateString('pt-BR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

function totais(todos) {
  const itens = todos.filter((l) => !l.transferencia); // transferência entre contas não conta
  const receitas = itens.filter((l) => l.valor > 0).reduce((s, l) => s + l.valor, 0);
  const despesas = itens.filter((l) => l.valor < 0).reduce((s, l) => s - l.valor, 0);
  return { receitas, despesas };
}

// Contas em aberto deste mês e do próximo (as atrasadas aparecem primeiro, pela data)
function contasEmAberto(lista) {
  const mes = dataDeHoje().slice(0, 7);
  return [...lancamentosDoMes(lista, mes), ...lancamentosDoMes(lista, mudarMes(mes, 1))]
    .filter((l) => l.valor < 0 && !l.pago && !l.transferencia)
    .sort((a, b) => a.data.localeCompare(b.data));
}

function CartaoResumo({ rotulo, valor, Icone, destaque, variante, rodape }) {
  return (
    <div className={destaque ? 'resumo resumo--destaque' : 'resumo'}>
      <div className="resumo__topo">
        <span className="resumo__rotulo">{rotulo}</span>
        <span className={`resumo__icone resumo__icone--${variante}`}>
          <Icone tamanho={18} espessura={2.2} />
        </span>
      </div>
      <div className="resumo__valor">{valor}</div>
      {rodape}
    </div>
  );
}

function TituloCartao({ titulo, link, para = '#' }) {
  return (
    <div className="cartao__titulo-linha">
      <h2 className="cartao__titulo">{titulo}</h2>
      {link && (
        <Link to={para} className="cartao__link">
          {link}
        </Link>
      )}
    </div>
  );
}

export default function Painel() {
  const nome = nomeDoUsuario();
  const hoje = dataDeHoje();
  const lista = carregar();
  const contas = carregarContas();
  const mesAtual = mesFinanceiro(hoje);

  // ----- Números do topo (vêm das suas contas e lançamentos) -----
  const contasNoTotal = contas.filter((c) => c.noTotal);
  const saldoGeral = contasNoTotal.reduce((s, c) => s + resumoDaConta(c, lista).saldo, 0);
  // Saldo no fim do mês passado = saldo de hoje sem o que já foi pago/recebido neste mês
  const nomesNoTotal = contasNoTotal.map((c) => c.nome);
  const movimentoDoMes = lista
    .filter((l) => l.pago && nomesNoTotal.includes(l.conta) && mesFinanceiro(l.data) === mesAtual)
    .reduce((s, l) => s + l.valor, 0);
  const saldoAnterior = saldoGeral - movimentoDoMes;
  const variacao = saldoAnterior > 0 ? ((saldoGeral - saldoAnterior) / saldoAnterior) * 100 : null;


  // ----- Previsão do mês (cartões Receitas, Despesas e "Sobrará no mês") -----
  // Receitas: tudo o que entra no mês, recebido ou ainda previsto (inclui as fixas que se repetem).
  // Despesas: fixas do mês (todas, pagas ou não, inclusive as que ainda vão se repetir)
  //         + gastos lançados no mês (pagos ou não; cada gasto novo entra assim que é lançado)
  //         + parcelas de "A pagar" ainda não pagas que vencem no mês (e as atrasadas).
  // Sobrará = saldo no início do mês + receitas − despesas.
  // Transferências entre contas ficam de fora (não são ganho nem gasto).
  const doMesComFixas = lancamentosDoMes(lista, mesAtual, inicioDoMes()).filter((l) => !l.transferencia);
  const ehFixa = (l) => Boolean(l.repete || l.previsto || l.origem);
  const somaDe = (itens) => itens.reduce((s, l) => s + Math.abs(l.valor), 0);
  const previsao = {
    inicio: saldoAnterior,
    receitas: somaDe(doMesComFixas.filter((l) => l.valor > 0)),
    fixas: somaDe(doMesComFixas.filter((l) => l.valor < 0 && ehFixa(l))),
    lancadas: somaDe(doMesComFixas.filter((l) => l.valor < 0 && !ehFixa(l))),
    parcelas: parcelasAPagarAte(mesAtual).reduce((s, p) => s + p.aPagarAgora, 0),
  };
  previsao.despesas = previsao.fixas + previsao.lancadas + previsao.parcelas;
  const sobrara = previsao.inicio + previsao.receitas - previsao.despesas;
  // O que te devem neste mês (parcelas de "A receber", com juros se atrasadas): fica fora da conta
  // principal, porque pode não chegar. Aparece como "melhor cenário" dentro do cartão.
  const aReceber = parcelasAReceberAte(mesAtual);
  const totalAReceber = aReceber.reduce((s, p) => s + p.aPagarAgora, 0);

  // ----- Gráfico: últimos 6 meses (mais estreito no celular) -----
  const telaPequena = typeof window !== 'undefined' && window.innerWidth < 700;
  const historico = Array.from({ length: 6 }, (_, i) => {
    const m = mudarMes(mesAtual, i - 5);
    return {
      chave: m,
      mes: MESES_CURTOS[Number(m.slice(5, 7)) - 1],
      ...totais(lista.filter((l) => mesFinanceiro(l.data) === m)),
      saldo: saldoGeralNoFimDo(m, lista, contas), // saldo geral no fim de cada mês (no mês atual, o de hoje)
    };
  });

  // ----- Listas -----
  const ultimos = lista
    .filter((l) => l.data <= hoje && !l.transferencia)
    .sort((a, b) => b.data.localeCompare(a.data))
    .slice(0, 5);
  const emAberto = contasEmAberto(lista);
  // Cartão "Contas a pagar": o que vence até o fim deste mês (inclui as atrasadas)
  // Parcelas das dívidas da tela "A pagar" que vencem até o fim deste mês também entram
  const dasDividas = carregarPagar()
    .map((d) => ({ d, s: situacaoDoPagar(d) }))
    .filter(({ s }) => !s.quitada && s.proxima?.vence && s.proxima.vence.slice(0, 7) <= hoje.slice(0, 7))
    .map(({ d, s }) => ({
      id: `pagar-${d.id}`,
      data: s.proxima.vence,
      descricao: s.parcelas > 1 ? `${d.pessoa} (${s.proxima.numero}/${s.parcelas})` : d.pessoa,
      valor: -(s.proxima.atrasada && s.jurosAbertos > 0 ? s.proxima.comJuros : s.proxima.valor),
      conta: 'Dívida · A pagar',
      dePagar: true,
    }));
  const doMesCalendario = [...emAberto.filter((l) => l.data.slice(0, 7) <= hoje.slice(0, 7)), ...dasDividas].sort((a, b) => a.data.localeCompare(b.data));
  const aPagar = doMesCalendario.slice(0, 4);
  const totalAPagar = doMesCalendario.reduce((s, l) => s - l.valor, 0);

  // Usuário novo: ainda não lançou nada
  const comecando = lista.length === 0;

  // Aviso de contas a vencer (ligado e desligado nas Configurações)
  const preferencias = carregarPreferencias();
  const avisos = preferencias.avisarContas ? emAberto.filter((l) => diasAte(l.data) <= preferencias.diasDeAviso) : [];
  const atrasadas = avisos.filter((l) => diasAte(l.data) < 0).length;
  const plano = situacaoDoPlano();
  const vencendo = avisos.length - atrasadas;

  return (
    <div className="pp-app">
      <MenuLateral />

      {/* ===== Conteúdo ===== */}
      <main className="pp">
        <div className="pp__topo">
          <div>
            <h1 className="pp__titulo">
              {saudacao()}
              {nome ? `, ${nome}` : ''}!
            </h1>
            <p className="pp__subtitulo">
              <span className="pp__data">{hojePorExtenso}</span> · aqui está o resumo do seu mês
            </p>
          </div>
          <div className="pp__acoes">
            <Link to="/painel/lancamentos" state={{ buscar: true }} className="pp__icone" aria-label="Buscar lançamento">
              <IconeBusca tamanho={18} espessura={2.2} />
            </Link>
            <Link to="/painel/calendario" className="pp__icone" aria-label={avisos.length ? `${avisos.length} avisos de contas` : 'Calendário de contas'}>
              <IconeSino tamanho={18} espessura={2.2} />
              {avisos.length > 0 && <span className="pp__aviso" />}
            </Link>
            <Link to="/painel/lancamentos" className="pp__novo">
              <IconeMais tamanho={18} espessura={2.6} />
              Novo lançamento
            </Link>
          </div>
        </div>

        {/* Teste grátis acabando (aparece nos 3 últimos dias) */}
        {plano.emTeste && plano.diasRestantes <= 3 && (
          <div className="pp__alerta pp__alerta--teste" role="status">
            <span className="pp__alerta-icone">
              <IconeSino tamanho={18} espessura={2.2} />
            </span>
            <div className="pp__alerta-textos">
              <b>
                Seu teste do Plano Essencial termina{' '}
                {plano.diasRestantes === 1 ? 'amanhã' : `em ${plano.diasRestantes} dias`}
              </b>
              <span>Se não assinar, você passa para o Plano Gratuito. Seus dados continuam salvos.</span>
            </div>
            <Link to="/planos" className="pp__alerta-link">
              Ver planos
            </Link>
          </div>
        )}

        {avisos.length > 0 && (
          <div className="pp__alerta" role="status">
            <span className="pp__alerta-icone">
              <IconeSino tamanho={18} espessura={2.2} />
            </span>
            <div className="pp__alerta-textos">
              <b>
                {atrasadas > 0 && `${atrasadas} ${atrasadas === 1 ? 'conta atrasada' : 'contas atrasadas'}`}
                {atrasadas > 0 && vencendo > 0 && ' e '}
                {vencendo > 0 &&
                  `${vencendo} ${vencendo === 1 ? 'conta vence' : 'contas vencem'} nos próximos ${preferencias.diasDeAviso} dias`}
              </b>
              <span>{avisos.slice(0, 3).map((l) => `${l.descricao} (${dataCurta(l.data)})`).join(' · ')}</span>
            </div>
            <Link to="/painel/calendario" className="pp__alerta-link">
              Ver no calendário
            </Link>
          </div>
        )}

        {/* Cartões de resumo */}
        <div className="pp__resumos">
          <CartaoResumo
            destaque
            rotulo="Saldo geral"
            valor={saldoGeral < 0 ? `− ${reais(-saldoGeral)}` : reais(saldoGeral)}
            Icone={IconeCarteira}
            variante="dourado"
            rodape={
              variacao !== null && Math.abs(variacao) >= 0.5 ? (
                <span className={variacao > 0 ? 'resumo__variacao' : 'resumo__variacao resumo__variacao--queda'}>
                  {variacao > 0 ? '+ ' : '− '}
                  {Math.round(Math.abs(variacao))}% em relação ao mês passado
                </span>
              ) : (
                <Link to="/painel/contas" className="resumo__link">
                  Ver contas
                </Link>
              )
            }
          />
          <CartaoResumo
            rotulo="Receitas do mês"
            valor={reais(previsao.receitas)}
            Icone={IconeCima}
            variante="positivo"
            rodape={<span className="resumo__formula">Recebidas e previstas</span>}
          />
          <CartaoResumo
            rotulo="Despesas do mês"
            valor={reais(previsao.despesas)}
            Icone={IconeBaixo}
            variante="negativo"
            rodape={
              <span
                className="resumo__formula"
                title={`Fixas ${reais(previsao.fixas)} + gastos lançados ${reais(previsao.lancadas)}${previsao.parcelas ? ` + parcelas a pagar ${reais(previsao.parcelas)}` : ''}`}
              >
                {previsao.parcelas ? 'Fixas + gastos + parcelas a pagar' : 'Fixas previstas + gastos lançados'}
              </span>
            }
          />
          <CartaoResumo
            rotulo="Sobrará no mês"
            valor={sobrara < 0 ? `− ${reais(-sobrara)}` : reais(sobrara)}
            Icone={IconeAlvo}
            variante="claro"
            rodape={
              <span className="resumo__rodape">
                <span
                  className="resumo__formula"
                  title={`Início do mês ${reais(previsao.inicio)} + receitas ${reais(previsao.receitas)} − despesas ${reais(previsao.despesas)}`}
                >
                  Início do mês + receitas − despesas
                </span>
                {totalAReceber > 0 && (
                  <Link
                    to="/painel/receber"
                    className="resumo__cenario"
                    title={aReceber.map((p) => `${p.divida.pessoa}${p.total > 1 ? ` (${p.numero}/${p.total})` : ''}: ${reais(p.aPagarAgora)}`).join('\n')}
                  >
                    <span>Se receber o que te devem:</span>
                    <span>
                      <b>{sobrara + totalAReceber < 0 ? `− ${reais(-(sobrara + totalAReceber))}` : reais(sobrara + totalAReceber)}</b>{' '}
                      <span className="resumo__cenario-extra">(+ {reais(totalAReceber)})</span>
                    </span>
                  </Link>
                )}
              </span>
            }
          />
        </div>

        {/* Primeiros passos (só para quem ainda não lançou nada) */}
        {comecando && (
          <section className="cartao pp-comeco">
            <div>
              <h2 className="cartao__titulo">Comece por aqui</h2>
              <p className="pp-comeco__texto">
                Sua CIFRA está zerada. Conforme você lança, tudo se atualiza sozinho: saldo, contas, calendário,
                checklist e relatórios.
              </p>
            </div>
            <ol className="pp-comeco__passos">
              <li>
                <span className="pp-comeco__numero">1</span>
                <span>
                  <b>Faça seu primeiro lançamento</b>
                  Diga a conta (ex.: Nubank). Se ela não existir, a CIFRA cria para você.
                </span>
                <Link to="/painel/lancamentos" className="pp-comeco__link">
                  Lançar
                </Link>
              </li>
              <li>
                <span className="pp-comeco__numero">2</span>
                <span>
                  <b>Ajuste o saldo das contas</b>
                  Em Contas, coloque quanto já tem em cada uma hoje.
                </span>
                <Link to="/painel/contas" className="pp-comeco__link">
                  Contas
                </Link>
              </li>
              <li>
                <span className="pp-comeco__numero">3</span>
                <span>
                  <b>Cadastre as contas fixas</b>
                  Aluguel, internet, assinaturas: marque como fixo e elas aparecem todo mês.
                </span>
                <Link to="/painel/calendario" className="pp-comeco__link">
                  Calendário
                </Link>
              </li>
            </ol>
          </section>
        )}

        {/* Orçamento do mês (só aparece quando há limites definidos) */}
        <CartaoOrcamento />

        {/* Gráfico */}
        <section className="cartao">
          <TituloCartao titulo="Receitas x despesas x saldo" link="Relatórios" para="/painel/relatorios" />
          <div className="legenda">
            <span className="legenda__item">
              <span className="legenda__cor legenda__cor--receita" />
              Receitas
            </span>
            <span className="legenda__item">
              <span className="legenda__cor legenda__cor--despesa" />
              Despesas
            </span>
            <span className="legenda__item">
              <span className="legenda__cor legenda__cor--saldo" />
              Saldo geral
            </span>
            <span className="legenda__item">últimos 6 meses</span>
          </div>
          <div className="cartao__grafico pp__grafico">
            <GraficoColunas dados={historico} largura={telaPequena ? 560 : 1000} altura={telaPequena ? 220 : 230} />
          </div>
        </section>

        <div className="pp__linha pp__linha--listas">
          <section className="cartao">
            <TituloCartao titulo="Últimos lançamentos" link="Ver tudo" para="/painel/lancamentos" />
            {ultimos.length === 0 ? (
              <p className="pp__vazio">
                Nenhum lançamento ainda. <Link to="/painel/lancamentos">Faça o primeiro</Link>.
              </p>
            ) : (
              <ul className="lista">
                {ultimos.map((l) => {
                  const entrada = l.valor > 0;
                  return (
                    <li key={l.id} className="lista__linha">
                      <span className={entrada ? 'seta seta--entrada' : 'seta seta--saida'}>
                        {entrada ? <IconeCima tamanho={16} espessura={2.4} /> : <IconeBaixo tamanho={16} espessura={2.4} />}
                      </span>
                      <span className="lista__textos">
                        <span className="lista__nome">{l.descricao}</span>
                        <span className="lista__detalhe">
                          {l.categoria} · {dataCurta(l.data)}
                        </span>
                      </span>
                      <b className={entrada ? 'lista__valor valor--entrada' : 'lista__valor valor--saida'}>
                        {entrada ? '+ ' : '− '}
                        {reais(Math.abs(l.valor))}
                      </b>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="cartao">
            <TituloCartao titulo="Contas a pagar" link="Calendário" para="/painel/calendario" />
            {aPagar.length === 0 ? (
              <p className="pp__vazio">Nenhuma conta em aberto neste mês. 🎉</p>
            ) : (
              <>
                <ul className="lista">
                  {aPagar.map((l) => {
                    const atrasada = diasAte(l.data) < 0;
                    return (
                      <li key={l.id} className="lista__linha">
                        <span className={atrasada ? 'vencimento vencimento--atrasado' : 'vencimento'}>
                          <b>{Number(l.data.slice(8))}</b>
                          {MESES_CURTOS[Number(l.data.slice(5, 7)) - 1].toUpperCase()}
                        </span>
                        <span className="lista__textos">
                          <span className="lista__nome">{l.descricao}</span>
                          <span className={atrasada ? 'lista__detalhe valor--saida' : 'lista__detalhe'}>
                            {atrasada ? 'Atrasada' : l.previsto ? 'Previsto · repete todo mês' : l.conta}
                          </span>
                        </span>
                        <b className="lista__valor">{reais(Math.abs(l.valor))}</b>
                      </li>
                    );
                  })}
                </ul>
                <div className="cartao__total">
                  <b>Total do mês{doMesCalendario.length > aPagar.length ? ` (${doMesCalendario.length} contas)` : ''}</b>
                  <b>{reais(totalAPagar)}</b>
                </div>
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
