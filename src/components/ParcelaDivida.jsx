import { useState } from 'react';
import { Link } from 'react-router-dom';
import { reais } from './Graficos.jsx';
import { dataCurta, dataDeHoje, diasAte } from '../dados/lancamentos.js';
import { contasParaParcela, contaSugerida, registrarParcela, mudarDataDaParcela } from '../dados/parcelas.js';
import { conferirAlertasAgora } from '../dados/alertas.js';
import './ParcelaDivida.css';
import { mascaraValor, valorParaCampo } from '../dados/dinheiro.js';

const paraTexto = (n) => valorParaCampo(n);
function lerNumero(texto) {
  const n = parseFloat(String(texto).replace(/\s|R\$/gi, '').replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function selo(p) {
  if (p.estado === 'paga') return { classe: 'ok', texto: p.tipo === 'receber' ? 'Recebida' : 'Paga' };
  if (p.atrasada) return { classe: 'atrasada', texto: 'Atrasada' };
  if (p.estado === 'parcial') return { classe: 'parcial', texto: `Parcial · falta ${reais(p.falta)}` };
  if (p.vence === dataDeHoje()) return { classe: 'hoje', texto: 'Vence hoje' };
  const dias = diasAte(p.vence);
  return { classe: 'aberta', texto: dias === 1 ? 'Vence amanhã' : `Vence em ${dias} dias` };
}

// Uma parcela de "A receber" ou "A pagar" dentro do Calendário ou do Checklist.
// Permite registrar o pagamento/recebimento (só da próxima parcela em aberto, para seguir a ordem)
// e mudar o dia de vencimento desta parcela.
export default function ParcelaDivida({ p, aoMudar, mostrarData = false }) {
  const [acao, setAcao] = useState(null); // null | 'registrar' | 'data'
  const [form, setForm] = useState({ valorTexto: '', conta: '', data: '' });
  const [erro, setErro] = useState('');
  const receber = p.tipo === 'receber';
  const s = selo(p);
  const contas = contasParaParcela();
  const nome = p.divida.pessoa;
  const rota = receber ? '/painel/receber' : '/painel/pagar';

  function abrirRegistro() {
    setErro('');
    setForm({ valorTexto: paraTexto(p.aPagarAgora), conta: contaSugerida(p, contas), data: dataDeHoje() });
    setAcao('registrar');
  }

  function abrirData() {
    setErro('');
    setForm({ ...form, data: p.vence });
    setAcao('data');
  }

  function confirmarRegistro(e) {
    e.preventDefault();
    const valor = lerNumero(form.valorTexto);
    if (!valor || valor <= 0) return setErro('Digite o valor.');
    registrarParcela(p, { valor, conta: form.conta, data: form.data || dataDeHoje() });
    setAcao(null);
    conferirAlertasAgora();
    aoMudar?.(
      `${reais(valor)} ${receber ? `recebidos de ${nome}` : `pagos a ${nome}`}${form.conta ? ` (${form.conta})` : ''}.`
    );
    return undefined;
  }

  function confirmarData(e) {
    e.preventDefault();
    if (!form.data) return setErro('Escolha a data.');
    mudarDataDaParcela(p, form.data);
    setAcao(null);
    conferirAlertasAgora();
    aoMudar?.(`Parcela ${p.numero} de ${nome} agora vence em ${dataCurta(form.data)}.`);
    return undefined;
  }

  return (
    <li className={`pcl pcl--${p.tipo} pcl--${s.classe}`}>
      <div className="pcl__linha">
        {mostrarData && (
          <span className="pcl__data">
            <b>{Number(p.vence.slice(8))}</b>/{p.vence.slice(5, 7)}
          </span>
        )}
        <span className="pcl__icone" aria-hidden="true">
          {receber ? '🤝' : '🧾'}
        </span>
        <span className="pcl__textos">
          <b className="pcl__nome">
            {receber ? `${nome} te paga` : `Pagar ${nome}`}
            {p.total > 1 && <span className="pcl__parcela"> · {p.numero}/{p.total}</span>}
          </b>
          <span className="pcl__detalhe">
            <span className={receber ? 'pcl__tag pcl__tag--receber' : 'pcl__tag pcl__tag--pagar'}>{receber ? 'A receber' : 'A pagar'}</span>
            {p.divida.motivo || (receber ? 'Conta a receber' : 'Dívida')}
            {p.ajustada && ' · dia mudado'}
          </span>
          <span className={`pcl__selo pcl__selo--${s.classe}`}>{s.texto}</span>
        </span>
        <span className="pcl__direita">
          <b className={receber ? 'pcl__valor valor--entrada' : 'pcl__valor valor--saida'}>
            {receber ? '+ ' : '− '}
            {reais(p.estado === 'paga' ? p.valor : p.aPagarAgora)}
          </b>
          {p.juros > 0 && <small className="pcl__juros">com {reais(p.juros)} de juros</small>}
          <span className="pcl__botoes">
            {p.proxima && p.estado !== 'paga' && (
              <button type="button" className="pcl__botao pcl__botao--principal" onClick={abrirRegistro}>
                {receber ? 'Recebi' : 'Paguei'}
              </button>
            )}
            {p.estado !== 'paga' && (
              <button type="button" className="pcl__botao" onClick={abrirData}>
                Mudar dia
              </button>
            )}
            {!p.proxima && p.estado !== 'paga' && (
              <Link to={rota} className="pcl__link" title="Registre as parcelas em ordem, a partir da mais antiga">
                Ver
              </Link>
            )}
          </span>
        </span>
      </div>

      {acao === 'registrar' && (
        <form className="pcl__form" onSubmit={confirmarRegistro}>
          <label>
            {receber ? 'Quanto recebeu (R$)' : 'Quanto pagou (R$)'}
            <input autoFocus inputMode="decimal" value={form.valorTexto} onChange={(e) => { setForm({ ...form, valorTexto: mascaraValor(e.target.value) }); setErro(''); }} />
          </label>
          <label>
            {receber ? 'Entrou em' : 'Saiu de'}
            <select value={form.conta} onChange={(e) => setForm({ ...form, conta: e.target.value })}>
              {contas.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
              <option value="">Nenhuma (só anotar)</option>
            </select>
          </label>
          <label>
            Quando
            <input type="date" value={form.data} max={dataDeHoje()} onChange={(e) => setForm({ ...form, data: e.target.value })} />
          </label>
          {p.juros > 0 && <p className="pcl__nota">Inclui {reais(p.juros)} de juros por atraso (entram como {receber ? 'ganho' : 'gasto'}).</p>}
          {erro && <p className="pcl__erro">{erro}</p>}
          <span className="pcl__acoes">
            <button type="submit" className="pcl__botao pcl__botao--principal">
              Confirmar
            </button>
            <button type="button" className="pcl__botao" onClick={() => setAcao(null)}>
              Cancelar
            </button>
          </span>
        </form>
      )}

      {acao === 'data' && (
        <form className="pcl__form" onSubmit={confirmarData}>
          <label>
            {receber ? 'Vai receber em' : 'Vai vencer em'}
            <input autoFocus type="date" value={form.data} onChange={(e) => { setForm({ ...form, data: e.target.value }); setErro(''); }} />
          </label>
          <p className="pcl__nota">Muda só esta parcela ({p.numero}/{p.total}). As outras continuam no mesmo dia.</p>
          {erro && <p className="pcl__erro">{erro}</p>}
          <span className="pcl__acoes">
            <button type="submit" className="pcl__botao pcl__botao--principal">
              Salvar dia
            </button>
            <button type="button" className="pcl__botao" onClick={() => setAcao(null)}>
              Cancelar
            </button>
          </span>
        </form>
      )}
    </li>
  );
}
