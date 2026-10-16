import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { reais } from './Graficos.jsx';
import { carregar, mesFinanceiro, mudarMes, dataDeHoje, nomeDoMes, periodoDoMes } from '../dados/lancamentos.js';
import { carregarPreferencias, salvarPreferencias, inicioDoMes } from '../dados/preferencias.js';
import { pedirPermissaoDeAviso } from '../dados/alertas.js';
import { resumoDoMes, frasesDoResumo, textoParaWhatsApp, linkDoWhatsApp, mesParaResumir } from '../dados/resumo.js';
import './ResumoMeses.css';

const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

// "Resumo rápido dos meses": um cartão por mês e o texto pronto para mandar no WhatsApp
export default function ResumoMeses() {
  const lista = useMemo(carregar, []);
  const inicio = inicioDoMes();
  const mesAtual = mesFinanceiro(dataDeHoje());
  const [escolhido, setEscolhido] = useState(mesParaResumir);
  const [preferencias, setPreferencias] = useState(carregarPreferencias);
  const [copiado, setCopiado] = useState(false);

  // Últimos 6 meses (o atual aparece como "em andamento")
  const meses = Array.from({ length: 6 }, (_, i) => mudarMes(mesAtual, i - 5));
  const resumos = useMemo(() => Object.fromEntries(meses.map((m) => [m, resumoDoMes(lista, m, inicio)])), [lista, inicio]); // eslint-disable-line react-hooks/exhaustive-deps
  const maiorMovimento = Math.max(1, ...meses.map((m) => Math.max(resumos[m].receitas, resumos[m].despesas)));
  const r = resumos[escolhido] || resumoDoMes(lista, escolhido, inicio);
  const texto = textoParaWhatsApp(r);

  function mudarPreferencia(campo, valor) {
    const novas = { ...preferencias, [campo]: valor };
    setPreferencias(novas);
    salvarPreferencias(novas);
    if (campo === 'resumoMensal' && valor) pedirPermissaoDeAviso();
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      window.prompt('Copie o texto:', texto);
    }
  }

  return (
    <section className="cartao rsm">
      <div className="cartao__titulo-linha">
        <h2 className="cartao__titulo">Resumo rápido dos meses</h2>
        <span className="rsm__sub">Toque num mês para ver o resumo</span>
      </div>

      {/* Um cartão por mês */}
      <div className="rsm__meses" role="list">
        {meses.map((m) => {
          const x = resumos[m];
          return (
            <button
              key={m}
              type="button"
              role="listitem"
              aria-pressed={m === escolhido}
              className={m === escolhido ? 'rsm-mes rsm-mes--ativo' : 'rsm-mes'}
              onClick={() => setEscolhido(m)}
            >
              <span className="rsm-mes__nome">
                {MESES_CURTOS[Number(m.slice(5, 7)) - 1]}
                {m === mesAtual && <small>agora</small>}
              </span>
              <span className="rsm-mes__barras" aria-hidden="true">
                <i className="rsm-mes__barra rsm-mes__barra--entrou" style={{ height: `${(x.receitas / maiorMovimento) * 100}%` }} />
                <i className="rsm-mes__barra rsm-mes__barra--saiu" style={{ height: `${(x.despesas / maiorMovimento) * 100}%` }} />
              </span>
              <b className={x.sobra >= 0 ? 'rsm-mes__sobra valor--entrada' : 'rsm-mes__sobra valor--saida'}>
                {x.quantidade ? `${x.sobra < 0 ? '−' : '+'} ${reais(Math.abs(x.sobra)).replace(',00', '')}` : '—'}
              </b>
            </button>
          );
        })}
      </div>

      {/* Resumo do mês escolhido */}
      <div className="rsm__detalhe">
        <div className="rsm__texto">
          <span className="rsm__rotulo">
            {nomeDoMes(r.mes)}
            {periodoDoMes(r.mes) && ` · ${periodoDoMes(r.mes)}`}
            {r.mes === mesAtual && ' · ainda em andamento'}
          </span>
          <ul>
            {frasesDoResumo(r).map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </div>
        <div className="rsm__botoes">
          <a
            className={r.quantidade ? 'rsm__whatsapp' : 'rsm__whatsapp rsm__whatsapp--desligado'}
            href={r.quantidade ? linkDoWhatsApp(texto, preferencias.whatsapp) : undefined}
            target="_blank"
            rel="noopener noreferrer"
            aria-disabled={!r.quantidade}
          >
            Enviar no WhatsApp
          </a>
          <button type="button" className="rsm__copiar" onClick={copiar} disabled={!r.quantidade}>
            {copiado ? 'Copiado!' : 'Copiar texto'}
          </button>
        </div>
      </div>

      {/* Lembrete mensal */}
      <div className="rsm__lembrete">
        <label className="rsm__chave">
          <input
            type="checkbox"
            checked={Boolean(preferencias.resumoMensal)}
            onChange={(e) => mudarPreferencia('resumoMensal', e.target.checked)}
          />
          <span>
            <b>Me lembrar todo mês no dia {inicio}</b>
            <small>
              No dia em que o seu mês começa (<Link to="/painel/configuracoes">“Meu mês começa no dia”</Link>), a CIFRA avisa
              que o resumo do mês que fechou está pronto para enviar.
            </small>
          </span>
        </label>
        <label className="rsm__numero">
          Seu WhatsApp (opcional)
          <input
            inputMode="tel"
            placeholder="(11) 91234-5678"
            value={preferencias.whatsapp || ''}
            onChange={(e) => mudarPreferencia('whatsapp', e.target.value)}
          />
          <small>Com o número, o resumo abre direto na sua conversa. Sem ele, você escolhe o contato.</small>
        </label>
      </div>
    </section>
  );
}
