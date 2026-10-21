import { useEffect, useMemo, useState } from 'react';
import MenuLateral from '../components/MenuLateral.jsx';
import { reais } from '../components/Graficos.jsx';
import { mascaraValor } from '../dados/dinheiro.js';
import { carregar, dataDeHoje, lancamentosDoMes, mesFinanceiro } from '../dados/lancamentos.js';
import { inicioDoMes } from '../dados/preferencias.js';
import { CALCULADORAS, carregarCalculadora, salvarCalculadora } from '../dados/calculadoras.js';
import './Painel.css';
import './Calculadora.css';

// De onde vêm os valores de referência de cada calculadora (aparece no rodapé)
const FONTES = {
  carro: 'Alíquotas do IPVA 2026 por estado, desvalorização média de 7% a 10% ao ano e a regra de até 10%, 20% ou 30% da renda para todos os custos do carro.',
  moto: 'IPVA de moto em SP (2%), desvalorização média de 7% a 10% ao ano e a regra de até 10%, 20% ou 30% da renda para todos os custos do veículo.',
  aluguel: 'Regra de mercado de renda de 3x o aluguel, moradia até 30% da renda, seguro incêndio de R$ 15 a R$ 50 por mês, caução de até 3 aluguéis e seguro fiança de 1 a 2,5 aluguéis por ano.',
  casa: 'Juros do SBPE da Caixa em 2026 (TR + 10,99% a 11,49% ao ano), prazo de até 35 anos, financiamento de até 80% (SAC) ou 70% (Price) e parcela até 30% da renda. A TR não entra na conta.',
  pet: 'Custo médio de um cão de R$ 270 a R$ 600 por mês conforme o porte, vacinas e vermífugos de R$ 750 a R$ 1.200 por ano, banho de R$ 80 a R$ 130 e enxoval de R$ 400 a R$ 800.',
};

// Dinheiro da calculadora: sempre visível (são números de simulação, não da conta da pessoa)
function rs(valor) {
  return (Number(valor) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
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

const camposDe = (calc) => calc.grupos.flatMap((g) => g.campos);
const ehNumero = (c) => !c.tipo;

function textosDe(calc, dados) {
  const textos = {};
  camposDe(calc)
    .filter(ehNumero)
    .forEach((c) => {
      textos[c.id] = paraTexto(dados[c.id], c.dinheiro);
    });
  return textos;
}

// Receitas do mês atual na CIFRA (para comparar com o custo)
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

// Uma calculadora qualquer (carro, moto, aluguel, casa, pet): formulário + resultado
function CalculadoraDe({ calc, receitas }) {
  const [dados, setDados] = useState(() => carregarCalculadora(calc));
  const [textos, setTextos] = useState(() => textosDe(calc, carregarCalculadora(calc)));
  const conta = useMemo(() => calc.calcular(dados), [calc, dados]);
  const [perfil, setPerfil] = useState(() => calc.calcular(carregarCalculadora(calc)).renda?.padrao);

  useEffect(() => salvarCalculadora(calc, dados), [calc, dados]);

  const escolhido = conta.renda?.perfis.find((p) => p.id === perfil) || conta.renda?.perfis[0];
  const maior = conta.itens[0]?.valor || 1;
  const parteDaRenda = receitas > 0 ? conta.comparar / receitas : 0;
  const v = veredito(parteDaRenda);
  const totalUnicos = conta.unicos.reduce((s, u) => s + u.valor, 0);

  function mudarTexto(id, valor) {
    const texto = mascaraValor(valor).replace('-', '');
    setTextos((t) => ({ ...t, [id]: texto }));
    setDados((d) => ({ ...d, [id]: lerNumero(texto) }));
  }

  // Lista de opções (estado, espécie, tabela...): algumas já preenchem outros campos
  function escolher(campo, valor) {
    setDados((d) => {
      const extra = campo.aoEscolher ? campo.aoEscolher(valor, { ...d, [campo.id]: valor }) || {} : {};
      if (Object.keys(extra).length) {
        setTextos((t) => {
          const novo = { ...t };
          camposDe(calc)
            .filter((c) => ehNumero(c) && c.id in extra)
            .forEach((c) => {
              novo[c.id] = paraTexto(extra[c.id], c.dinheiro);
            });
          return novo;
        });
      }
      return { ...d, [campo.id]: valor, ...extra };
    });
  }

  function voltarAoExemplo() {
    setDados({ ...calc.exemplo });
    setTextos(textosDe(calc, calc.exemplo));
  }

  function limpar() {
    const vazio = { ...calc.exemplo };
    camposDe(calc)
      .filter(ehNumero)
      .forEach((c) => {
        vazio[c.id] = 0;
      });
    setDados(vazio);
    setTextos(textosDe(calc, vazio));
  }

  return (
    <div className="calc__grade">
      {/* ===== Resumo ===== */}
      <section className="calc-resumo" aria-live="polite">
        <span className="calc-resumo__rotulo">{conta.rotulo}</span>
        <b className="calc-resumo__valor">
          {rs(conta.mensal)}
          <small>/mês</small>
        </b>
        <span className="calc-resumo__linha">
          {rs(conta.porAno)} por ano · {rs(conta.porDia)} por dia
        </span>
        {conta.destaque && (
          <span className="calc-resumo__bolso">
            {conta.destaque.texto}: <b>{rs(conta.destaque.valor)}</b>
            {conta.destaque.nota && <small>{conta.destaque.nota}</small>}
          </span>
        )}

        {conta.minis.length > 0 && (
          <div className="calc-km">
            {conta.minis.map((m) => (
              <div key={m.rotulo}>
                <span>{m.rotulo}</span>
                <b>{rs(m.valor)}</b>
                {m.nota && <small>{m.nota}</small>}
              </div>
            ))}
          </div>
        )}

        {conta.renda ? (
          <div className="calc-renda">
            <span className="calc-renda__titulo">{conta.renda.titulo}</span>
            <div
              className="calc-renda__perfis"
              role="radiogroup"
              aria-label="Regra de renda"
              style={{ gridTemplateColumns: `repeat(${conta.renda.perfis.length}, minmax(0, 1fr))` }}
            >
              {conta.renda.perfis.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={escolhido.id === p.id}
                  className={escolhido.id === p.id ? 'calc-renda__perfil calc-renda__perfil--ativo' : 'calc-renda__perfil'}
                  onClick={() => setPerfil(p.id)}
                >
                  {p.nome}
                  <small>{p.sub}</small>
                </button>
              ))}
            </div>
            <b className="calc-renda__valor">{rs(escolhido.renda)}</b>
            <small className="calc-renda__dica">{escolhido.dica}</small>
            {receitas > 0 && conta.comparar > 0 && (
              <p className={`calc-renda__voce calc-renda__voce--${conta.veredito ? v.classe : 'neutro'}`}>
                Suas receitas deste mês na CIFRA: <b>{reais(receitas)}</b>. Isso levaria <b>{Math.round(parteDaRenda * 100)}%</b> delas.
                {conta.veredito ? ` ${v.texto}` : ''}
              </p>
            )}
          </div>
        ) : (
          receitas > 0 &&
          conta.comparar > 0 && (
            <div className="calc-renda">
              <p className="calc-renda__voce calc-renda__voce--neutro">
                Suas receitas deste mês na CIFRA: <b>{reais(receitas)}</b>. Isso levaria <b>{Math.round(parteDaRenda * 100)}%</b> delas.
              </p>
            </div>
          )
        )}
      </section>

      {/* ===== Formulário ===== */}
      <section className="calc-form" aria-label={`Informações: ${calc.nome}`}>
        <div className="calc-form__acoes">
          <button type="button" onClick={voltarAoExemplo}>
            Ver exemplo
          </button>
          <button type="button" onClick={limpar}>
            Limpar
          </button>
        </div>

        {calc.grupos.map((g) => (
          <fieldset key={g.titulo} className="cartao calc-grupo">
            <legend className="calc-grupo__titulo">{g.titulo}</legend>
            {g.texto && <p className="calc-grupo__texto">{g.texto}</p>}
            <div className="calc-grupo__campos">
              {g.campos.map((c) => {
                if (c.tipo === 'liga') {
                  return (
                    <label key={c.id} className="calc-escondido__liga">
                      <input type="checkbox" checked={Boolean(dados[c.id])} onChange={(e) => setDados((d) => ({ ...d, [c.id]: e.target.checked }))} />
                      {c.rotulo}
                    </label>
                  );
                }
                if (c.tipo === 'opcoes') {
                  return (
                    <label key={c.id} className="calc-campo">
                      <span className="calc-campo__rotulo">{c.rotulo}</span>
                      <span className="calc-campo__caixa">
                        <select id={`calc-${c.id}`} value={dados[c.id]} onChange={(e) => escolher(c, e.target.value)}>
                          {c.opcoes.map((o) => (
                            <option key={o.valor} value={o.valor}>
                              {o.texto}
                            </option>
                          ))}
                        </select>
                      </span>
                      {c.dica && <small className="calc-campo__dica">{c.dica}</small>}
                    </label>
                  );
                }
                return <Campo key={c.id} campo={c} texto={textos[c.id] ?? ''} aoMudar={mudarTexto} />;
              })}
            </div>
          </fieldset>
        ))}
      </section>

      {/* ===== Para onde vai o dinheiro ===== */}
      <section className="cartao calc-detalhe">
        <h2 className="cartao__titulo">Para onde vai o dinheiro (por mês)</h2>
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
                  {conta.mensal ? Math.round((i.valor / conta.mensal) * 100) : 0}% do total
                </small>
              </li>
            ))}
          </ul>
        )}
        <p className="calc-detalhe__legenda">
          {conta.legenda.map((l, k) => (
            <span key={l.tipo} className="calc-detalhe__legenda-item">
              <span className={`calc-item__cor calc-item__cor--${l.tipo}${k === 0 ? ' calc-item__cor--primeira' : ''}`} /> {l.texto}
            </span>
          ))}
        </p>

        {conta.unicos.length > 0 && (
          <div className="calc-unicos">
            <h3 className="calc-unicos__titulo">Na hora de começar (uma vez só)</h3>
            <ul>
              {conta.unicos.map((u) => (
                <li key={u.nome}>
                  <span>{u.nome}</span>
                  <b>{rs(u.valor)}</b>
                </li>
              ))}
            </ul>
            <div className="calc-unicos__total">
              <span>Total</span>
              <b>{rs(totalUnicos)}</b>
            </div>
          </div>
        )}

        <p className="calc-detalhe__fonte">
          Valores de referência: {FONTES[calc.id]} É uma estimativa: confira os valores do seu caso.
        </p>
      </section>
    </div>
  );
}

export default function Calculadora() {
  const [aba, setAba] = useState('carro');
  const receitas = useMemo(receitasDoMes, []);
  const calc = CALCULADORAS.find((c) => c.id === aba) || CALCULADORAS[0];

  return (
    <div className="pp-app">
      <MenuLateral />

      <main className="pp calc">
        <div className="pp__topo">
          <div>
            <h1 className="pp__titulo">Calculadora</h1>
            <p className="pp__subtitulo">Descubra quanto uma coisa vai custar de verdade antes de assumir</p>
          </div>
        </div>

        <div className="calc__abas" role="tablist" aria-label="Calculadoras">
          {CALCULADORAS.map((c) => (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={c.id === aba}
              className={c.id === aba ? 'calc__aba calc__aba--ativa' : 'calc__aba'}
              onClick={() => setAba(c.id)}
            >
              <span aria-hidden="true">{c.emoji}</span>
              {c.nome}
            </button>
          ))}
        </div>

        {/* "key" recria a calculadora ao trocar de aba (cada uma com os seus números) */}
        <CalculadoraDe key={calc.id} calc={calc} receitas={receitas} />
      </main>
    </div>
  );
}
