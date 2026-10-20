import { useEffect, useMemo, useState } from 'react';
import MenuLateral from '../components/MenuLateral.jsx';
import { reais } from '../components/Graficos.jsx';
import { mascaraValor } from '../dados/dinheiro.js';
import { carregar, dataDeHoje, lancamentosDoMes, mesFinanceiro } from '../dados/lancamentos.js';
import { inicioDoMes } from '../dados/preferencias.js';
import {
  IPVA_POR_ESTADO,
  PERFIS_DE_RENDA,
  EXEMPLO,
  carregarCarro,
  salvarCarro,
  calcularCarro,
} from '../dados/calculadoraCarro.js';
import './Painel.css';
import './Calculadora.css';

// Calculadoras de custo. A primeira é a do carro; as outras aparecem como "em breve".
const CALCULADORAS = [
  { id: 'carro', nome: 'Carro', emoji: '🚗' },
  { id: 'moto', nome: 'Moto', emoji: '🏍️', emBreve: true },
  { id: 'casa', nome: 'Alugar ou comprar casa', emoji: '🏠', emBreve: true },
  { id: 'pet', nome: 'Pet', emoji: '🐶', emBreve: true },
];

// Dinheiro da calculadora: sempre visível (são números de simulação, não da conta da pessoa)
function rs(valor) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// "1.250,5" -> 1250.5
function lerNumero(texto) {
  return parseFloat(String(texto).replace(/\./g, '').replace(',', '.')) || 0;
}

// 80000 -> "80.000"; 6.3 -> "6,30" (dinheiro) ou "6,3" (número)
function paraTexto(valor, dinheiro) {
  if (!valor) return '';
  if (Number.isInteger(valor)) return valor.toLocaleString('pt-BR');
  return valor.toLocaleString('pt-BR', dinheiro ? { minimumFractionDigits: 2, maximumFractionDigits: 2 } : { maximumFractionDigits: 2 });
}

// Campos do formulário, em grupos. dinheiro: mostra "R$" na frente
const GRUPOS = [
  {
    titulo: 'O carro',
    campos: [
      { id: 'valorCarro', rotulo: 'Valor do carro', dinheiro: true, dica: 'Use o preço da tabela FIPE ou o valor que você vai pagar.' },
    ],
    estado: true,
  },
  {
    titulo: 'Uso no mês',
    campos: [
      { id: 'kmPorMes', rotulo: 'Quantos km roda por mês', sufixo: 'km', dica: 'Ida e volta do trabalho, passeios... Em média 1.000 km por mês.' },
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
    campos: [
      { id: 'parcela', rotulo: 'Parcela por mês (se for financiado)', dinheiro: true, sufixo: '/mês', dica: 'Deixe vazio se o carro já é seu.' },
    ],
  },
];

const TODOS_OS_CAMPOS = GRUPOS.flatMap((g) => g.campos).concat([
  { id: 'ipva' },
  { id: 'depreciacao' },
  { id: 'rendimento' },
]);

function textosDe(dados) {
  const textos = {};
  TODOS_OS_CAMPOS.forEach((c) => {
    textos[c.id] = paraTexto(dados[c.id], c.dinheiro);
  });
  return textos;
}

// Receitas do mês atual na CIFRA (para comparar com o custo do carro)
function receitasDoMes() {
  const mes = mesFinanceiro(dataDeHoje());
  return lancamentosDoMes(carregar(), mes, inicioDoMes())
    .filter((l) => l.valor > 0 && !l.transferencia && !l.saldoInicialDaConta)
    .reduce((s, l) => s + l.valor, 0);
}

function veredito(parte) {
  if (parte <= 0.1) return { classe: 'otimo', texto: 'Cabe com folga: até 10% da renda.' };
  if (parte <= 0.2) return { classe: 'bom', texto: 'Dentro do recomendado: até 20% da renda.' };
  if (parte <= 0.3) return { classe: 'apertado', texto: 'Apertado: passa de 20% da renda.' };
  return { classe: 'alto', texto: 'Acima do recomendado: mais de 30% da renda.' };
}

function Campo({ campo, texto, aoMudar }) {
  return (
    <label className="calc-campo">
      <span className="calc-campo__rotulo">{campo.rotulo}</span>
      <span className="calc-campo__caixa">
        {campo.dinheiro && <span className="calc-campo__antes">R$</span>}
        <input
          id={`calc-${campo.id}`}
          inputMode="decimal"
          autoComplete="off"
          placeholder="0"
          value={texto}
          onChange={(e) => aoMudar(campo.id, e.target.value)}
        />
        {campo.sufixo && <span className="calc-campo__depois">{campo.sufixo}</span>}
      </span>
      {campo.dica && <small className="calc-campo__dica">{campo.dica}</small>}
    </label>
  );
}

export default function Calculadora() {
  const [dados, setDados] = useState(carregarCarro);
  const [textos, setTextos] = useState(() => textosDe(carregarCarro()));
  const [perfil, setPerfil] = useState('equilibrado');
  const receitas = useMemo(receitasDoMes, []);

  useEffect(() => salvarCarro(dados), [dados]);

  const conta = useMemo(() => calcularCarro(dados), [dados]);
  const escolhido = conta.rendaMinima.find((p) => p.id === perfil);
  const maior = conta.itens[0]?.valor || 1;

  function mudarTexto(id, valor) {
    const texto = mascaraValor(valor).replace('-', '');
    setTextos((t) => ({ ...t, [id]: texto }));
    setDados((d) => ({ ...d, [id]: lerNumero(texto) }));
  }

  function mudar(id, valor) {
    setDados((d) => ({ ...d, [id]: valor }));
  }

  function escolherEstado(uf) {
    const ipva = IPVA_POR_ESTADO[uf];
    setDados((d) => ({ ...d, estado: uf, ipva }));
    setTextos((t) => ({ ...t, ipva: paraTexto(ipva) }));
  }

  function voltarAoExemplo() {
    setDados({ ...EXEMPLO });
    setTextos(textosDe(EXEMPLO));
  }

  function limpar() {
    const vazio = { ...EXEMPLO };
    TODOS_OS_CAMPOS.forEach((c) => {
      if (!['ipva', 'depreciacao', 'rendimento'].includes(c.id)) vazio[c.id] = 0;
    });
    setDados(vazio);
    setTextos(textosDe(vazio));
  }

  const parteDaRenda = receitas > 0 ? conta.doBolso / receitas : 0;
  const v = veredito(parteDaRenda);

  return (
    <div className="pp-app">
      <MenuLateral />

      <main className="pp calc">
        <div className="pp__topo">
          <div>
            <h1 className="pp__titulo">Calculadora</h1>
            <p className="pp__subtitulo">Descubra quanto uma coisa vai custar de verdade antes de comprar</p>
          </div>
        </div>

        <div className="calc__abas" role="tablist" aria-label="Calculadoras">
          {CALCULADORAS.map((c) => (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={c.id === 'carro'}
              disabled={c.emBreve}
              className={c.id === 'carro' ? 'calc__aba calc__aba--ativa' : 'calc__aba'}
            >
              <span aria-hidden="true">{c.emoji}</span>
              {c.nome}
              {c.emBreve && <small>em breve</small>}
            </button>
          ))}
        </div>

        <div className="calc__grade">
          {/* ===== Resumo: custo por mês e renda mínima ===== */}
          <section className="calc-resumo" aria-live="polite">
            <span className="calc-resumo__rotulo">Este carro custa</span>
            <b className="calc-resumo__valor">
              {rs(conta.total)}
              <small>/mês</small>
            </b>
            <span className="calc-resumo__linha">
              {rs(conta.porAno)} por ano · {rs(conta.porDia)} por dia
            </span>
            {conta.total !== conta.doBolso && (
              <span className="calc-resumo__bolso">
                Sai do bolso todo mês: <b>{rs(conta.doBolso)}</b>
                <small>O resto é a desvalorização{dados.contarRendimento ? ' e o rendimento perdido' : ''}: não sai da conta, mas você perde.</small>
              </span>
            )}

            <div className="calc-km">
              <div>
                <span>Para rodar 1 km</span>
                <b>{rs(conta.porKmRodar)}</b>
                <small>combustível, pneus e manutenção</small>
              </div>
              <div>
                <span>Custo total por km</span>
                <b>{rs(conta.porKmTotal)}</b>
                <small>tudo ÷ km do mês</small>
              </div>
            </div>

            <div className="calc-renda">
              <span className="calc-renda__titulo">Renda mínima para ter este carro</span>
              <div className="calc-renda__perfis" role="radiogroup" aria-label="Quanto da renda vai para o carro">
                {conta.rendaMinima.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    role="radio"
                    aria-checked={perfil === p.id}
                    className={perfil === p.id ? 'calc-renda__perfil calc-renda__perfil--ativo' : 'calc-renda__perfil'}
                    onClick={() => setPerfil(p.id)}
                  >
                    {p.nome}
                    <small>{Math.round(p.parte * 100)}% da renda</small>
                  </button>
                ))}
              </div>
              <b className="calc-renda__valor">{rs(escolhido.renda)}</b>
              <small className="calc-renda__dica">
                Renda líquida (o que cai na conta) para o carro ocupar até {Math.round(escolhido.parte * 100)}% dela.{' '}
                {escolhido.dica}
              </small>
              {receitas > 0 && conta.doBolso > 0 && (
                <p className={`calc-renda__voce calc-renda__voce--${v.classe}`}>
                  Suas receitas deste mês na CIFRA: <b>{reais(receitas)}</b>. O carro levaria{' '}
                  <b>{Math.round(parteDaRenda * 100)}%</b> delas. {v.texto}
                </p>
              )}
            </div>
          </section>

          {/* ===== Formulário ===== */}
          <section className="calc-form" aria-label="Informações do carro">
            <div className="calc-form__acoes">
              <button type="button" onClick={voltarAoExemplo}>
                Ver exemplo
              </button>
              <button type="button" onClick={limpar}>
                Limpar
              </button>
            </div>

            {GRUPOS.map((g) => (
              <fieldset key={g.titulo} className="cartao calc-grupo">
                <legend className="calc-grupo__titulo">{g.titulo}</legend>
                <div className="calc-grupo__campos">
                  {g.campos.map((c) => (
                    <Campo key={c.id} campo={c} texto={textos[c.id]} aoMudar={mudarTexto} />
                  ))}
                  {g.estado && (
                    <>
                      <label className="calc-campo">
                        <span className="calc-campo__rotulo">Estado (para o IPVA)</span>
                        <span className="calc-campo__caixa">
                          <select id="calc-estado" value={dados.estado} onChange={(e) => escolherEstado(e.target.value)}>
                            {Object.keys(IPVA_POR_ESTADO)
                              .sort()
                              .map((uf) => (
                                <option key={uf} value={uf}>
                                  {uf}
                                </option>
                              ))}
                          </select>
                        </span>
                      </label>
                      <Campo
                        campo={{ id: 'ipva', rotulo: 'IPVA', sufixo: '% ao ano', dica: 'Alíquota de 2026 para carro a gasolina/flex. Elétricos e híbridos podem pagar menos.' }}
                        texto={textos.ipva}
                        aoMudar={mudarTexto}
                      />
                    </>
                  )}
                </div>
              </fieldset>
            ))}

            <fieldset className="cartao calc-grupo">
              <legend className="calc-grupo__titulo">Custos escondidos</legend>
              <p className="calc-grupo__texto">Não saem da conta todo mês, mas fazem parte do custo real do carro.</p>
              <div className="calc-grupo__campos">
                <div className="calc-escondido">
                  <label className="calc-escondido__liga">
                    <input type="checkbox" checked={dados.contarDepreciacao} onChange={(e) => mudar('contarDepreciacao', e.target.checked)} />
                    Contar a desvalorização
                  </label>
                  <Campo
                    campo={{ id: 'depreciacao', rotulo: 'O carro perde por ano', sufixo: '% do valor', dica: 'Em geral entre 7% e 10% ao ano; carro novo perde mais no 1º ano.' }}
                    texto={textos.depreciacao}
                    aoMudar={mudarTexto}
                  />
                </div>
                <div className="calc-escondido">
                  <label className="calc-escondido__liga">
                    <input type="checkbox" checked={dados.contarRendimento} onChange={(e) => mudar('contarRendimento', e.target.checked)} />
                    Contar o rendimento que o dinheiro teria
                  </label>
                  <Campo
                    campo={{ id: 'rendimento', rotulo: 'Se o dinheiro estivesse aplicado', sufixo: '% ao ano', dica: 'Quanto o valor do carro renderia numa aplicação. Se for financiado, use só a entrada.' }}
                    texto={textos.rendimento}
                    aoMudar={mudarTexto}
                  />
                </div>
              </div>
            </fieldset>
          </section>

          {/* ===== Para onde vai o dinheiro ===== */}
          <section className="cartao calc-detalhe">
            <h2 className="cartao__titulo">Para onde vai o dinheiro</h2>
            {conta.itens.length === 0 ? (
              <p className="calc-detalhe__vazio">Preencha os campos para ver a conta.</p>
            ) : (
              <ul className="calc-itens">
                {conta.itens.map((i) => (
                  <li key={i.id} className={`calc-item calc-item--${i.tipo}`}>
                    <div className="calc-item__linha">
                      <span className="calc-item__nome">{i.nome}</span>
                      <b>{rs(i.valor)}</b>
                    </div>
                    <span className="calc-item__trilho" aria-hidden="true">
                      <span style={{ width: `${Math.max(2, (i.valor / maior) * 100)}%` }} />
                    </span>
                    <small>
                      {i.dica ? `${i.dica} · ` : ''}
                      {conta.total ? Math.round((i.valor / conta.total) * 100) : 0}% do total
                    </small>
                  </li>
                ))}
              </ul>
            )}
            <p className="calc-detalhe__legenda">
              <span className="calc-item__cor calc-item__cor--rodar" /> depende de quanto você roda
              <span className="calc-item__cor calc-item__cor--fixo" /> fixo
              <span className="calc-item__cor calc-item__cor--escondido" /> escondido
            </p>
            <p className="calc-detalhe__fonte">
              Valores de referência: alíquotas do IPVA 2026 por estado, desvalorização média de 7% a 10% ao ano e a regra de
              até 10%, 20% ou 30% da renda para todos os custos do carro. É uma estimativa: confira os valores do seu caso.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
