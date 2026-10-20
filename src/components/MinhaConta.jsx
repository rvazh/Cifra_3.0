import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
  ESTADOS,
  atualizarUsuario,
  buscarCEP,
  emailValido,
  excluirUsuario,
  mascaraCEP,
  regrasDaSenha,
  soNumeros,
  trocarSenha,
  usuarioAtual,
  iniciarSegundoFator,
  confirmarSegundoFator,
  desligarSegundoFator,
  segundoFatorAtivo,
} from '../dados/usuarios.js';
import { irPara } from '../dados/acesso.js';
import './MinhaConta.css';

// Moldura das janelas (fundo escuro + caixa branca)
function Janela({ titulo, id, aoFechar, aoEnviar, larga, children }) {
  return (
    <div className="cfg-fundo" onClick={aoFechar}>
      <form
        className={larga ? 'cfg-janela mc-janela--larga' : 'cfg-janela'}
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
        onSubmit={aoEnviar}
        onClick={(e) => e.stopPropagation()}
        noValidate
      >
        <div className="cfg-janela__topo">
          <h2 id={id}>{titulo}</h2>
          <button type="button" className="cfg-janela__fechar" onClick={aoFechar} aria-label="Fechar">
            ×
          </button>
        </div>
        {children}
      </form>
    </div>
  );
}

function Erro({ texto }) {
  return texto ? (
    <p className="mc-erro" role="alert">
      {texto}
    </p>
  ) : null;
}

// ===== Editar meus dados: nome, sobrenome, e-mail e endereço =====
export function EditarDados({ usuario, aoSalvar, aoFechar }) {
  const e = usuario.endereco || {};
  const [f, setF] = useState({
    nome: usuario.nome,
    sobrenome: usuario.sobrenome,
    email: usuario.emailNovo || usuario.email,
    cep: mascaraCEP(e.cep),
    rua: e.rua || '',
    numero: e.numero || '',
    complemento: e.complemento || '',
    bairro: e.bairro || '',
    cidade: e.cidade || '',
    uf: e.uf || '',
  });
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const mudar = (campo, valor) => {
    setF((atual) => ({ ...atual, [campo]: valor }));
    setErro('');
  };

  async function mudarCEP(texto) {
    const valor = mascaraCEP(texto);
    mudar('cep', valor);
    if (soNumeros(valor).length !== 8) return;
    const achado = await buscarCEP(valor);
    if (achado && !achado.naoExiste) {
      setF((atual) => ({ ...atual, rua: achado.rua || atual.rua, bairro: achado.bairro || atual.bairro, cidade: achado.cidade || atual.cidade, uf: achado.uf || atual.uf }));
    }
  }

  async function salvar(evento) {
    evento.preventDefault();
    if (!f.nome.trim() || !f.sobrenome.trim()) return setErro('Preencha o nome e o sobrenome.');
    if (!emailValido(f.email)) return setErro('Este e-mail não parece certo. Ex.: nome@email.com');
    // Endereço é opcional; se começar a digitar o CEP, ele precisa estar completo
    const numerosDoCep = soNumeros(f.cep).length;
    if (numerosDoCep > 0 && numerosDoCep !== 8) return setErro('O CEP tem 8 números.');
    setSalvando(true);
    try {
      const { usuario: novo, emailPendente } = await atualizarUsuario({
        nome: f.nome,
        sobrenome: f.sobrenome,
        email: f.email,
        endereco: { cep: f.cep, rua: f.rua, numero: f.numero, complemento: f.complemento, bairro: f.bairro, cidade: f.cidade, uf: f.uf },
      });
      aoSalvar(novo, emailPendente);
    } catch (falha) {
      setSalvando(false);
      setErro(falha.message);
    }
    return undefined;
  }

  const campo = (rotulo, nome, extra = {}) => (
    <label className={`cfg-campo ${extra.classe || ''}`}>
      {rotulo}
      <input value={f[nome]} onChange={(ev) => mudar(nome, ev.target.value)} {...extra.props} />
    </label>
  );

  return (
    <Janela titulo="Meus dados" id="mc-dados-titulo" aoFechar={aoFechar} aoEnviar={salvar} larga>
      <div className="mc-grade">
        {campo('Nome', 'nome', { props: { autoFocus: true, autoComplete: 'given-name' } })}
        {campo('Sobrenome', 'sobrenome', { props: { autoComplete: 'family-name' } })}
        {campo('E-mail', 'email', { classe: 'mc-inteiro', props: { type: 'email', autoComplete: 'email' } })}
        {usuario.emailNovo && usuario.emailNovo !== usuario.email && (
          <p className="mc-inteiro mc-nota">
            Troca para <b>{usuario.emailNovo}</b> esperando confirmação pelo link enviado. Até lá, entre com {usuario.email}.
          </p>
        )}
        <p className="mc-inteiro mc-nota">Endereço é opcional: só será usado quando existir cobrança de planos pagos.</p>
        <label className="cfg-campo">
          CEP
          <input value={f.cep} inputMode="numeric" onChange={(ev) => mudarCEP(ev.target.value)} />
        </label>
        {campo('Rua', 'rua', { classe: 'mc-inteiro' })}
        {campo('Número', 'numero')}
        {campo('Complemento (opcional)', 'complemento')}
        {campo('Bairro', 'bairro')}
        {campo('Cidade', 'cidade')}
        <label className="cfg-campo">
          UF
          <select className="mc-select" value={f.uf} onChange={(ev) => mudar('uf', ev.target.value)}>
            <option value="">UF</option>
            {ESTADOS.map((uf) => (
              <option key={uf} value={uf}>
                {uf}
              </option>
            ))}
          </select>
        </label>
      </div>
      <Erro texto={erro} />
      <div className="cfg-janela__acoes">
        <button type="submit" className="cfg-botao cfg-botao--principal" disabled={salvando}>
          {salvando ? 'Salvando…' : 'Salvar'}
        </button>
        <button type="button" className="cfg-botao" onClick={aoFechar}>
          Cancelar
        </button>
      </div>
    </Janela>
  );
}

// ===== Trocar a senha =====
// Campo do código de 6 números (verificação em duas etapas)
function CampoCodigo({ valor, aoMudar, rotulo = 'Código do app autenticador', autoFocus = false }) {
  return (
    <label className="cfg-campo">
      {rotulo}
      <input
        className="mc-codigo"
        inputMode="numeric"
        autoComplete="one-time-code"
        autoFocus={autoFocus}
        maxLength={7}
        placeholder="000000"
        value={valor}
        onChange={(e) => aoMudar(e.target.value.replace(/[^\d ]/g, ''))}
      />
    </label>
  );
}

export function TrocarSenha({ aoSalvar, aoFechar }) {
  const comCodigo = Boolean(usuarioAtual()?.doisFatores);
  const [codigo, setCodigo] = useState('');
  const [atual, setAtual] = useState('');
  const [nova, setNova] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [mostrar, setMostrar] = useState(false);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const regras = regrasDaSenha(nova);

  async function salvar(evento) {
    evento.preventDefault();
    if (!atual) return setErro('Digite a sua senha atual.');
    if (!regras.every((r) => r.ok)) return setErro('A nova senha ainda não cumpre as regras.');
    if (nova !== confirmar) return setErro('A confirmação não é igual à nova senha.');
    if (nova === atual) return setErro('A nova senha precisa ser diferente da atual.');
    setSalvando(true);
    let certo = false;
    try {
      certo = await trocarSenha(atual, nova, codigo);
    } catch (falha) {
      setSalvando(false);
      return setErro(falha.message);
    }
    setSalvando(false);
    if (!certo) {
      setAtual('');
      return setErro('A senha atual está incorreta.');
    }
    aoSalvar();
    return undefined;
  }

  const tipo = mostrar ? 'text' : 'password';
  return (
    <Janela titulo="Trocar a senha" id="mc-senha-titulo" aoFechar={aoFechar} aoEnviar={salvar}>
      <label className="cfg-campo">
        Senha atual
        <input type={tipo} autoComplete="current-password" autoFocus value={atual} onChange={(e) => { setAtual(e.target.value); setErro(''); }} />
      </label>
      <label className="cfg-campo">
        Nova senha
        <input type={tipo} autoComplete="new-password" value={nova} onChange={(e) => { setNova(e.target.value); setErro(''); }} />
      </label>
      <label className="cfg-campo">
        Confirmar a nova senha
        <input type={tipo} autoComplete="new-password" value={confirmar} onChange={(e) => { setConfirmar(e.target.value); setErro(''); }} />
      </label>
      <ul className="mc-regras" aria-label="Regras da senha">
        {regras.map((r) => (
          <li key={r.texto} className={r.ok ? 'mc-regra mc-regra--ok' : 'mc-regra'}>
            {r.ok ? '✓' : '○'} {r.texto}
          </li>
        ))}
      </ul>
      <label className="mc-mostrar">
        <input type="checkbox" checked={mostrar} onChange={(e) => setMostrar(e.target.checked)} /> Mostrar as senhas
      </label>
      {comCodigo && <CampoCodigo valor={codigo} aoMudar={(v) => { setCodigo(v); setErro(''); }} />}
      <Erro texto={erro} />
      <div className="cfg-janela__acoes">
        <button type="submit" className="cfg-botao cfg-botao--principal" disabled={salvando}>
          {salvando ? 'Conferindo…' : 'Trocar senha'}
        </button>
        <button type="button" className="cfg-botao" onClick={aoFechar}>
          Cancelar
        </button>
      </div>
    </Janela>
  );
}

// ===== Excluir a conta =====
export function ExcluirConta({ aoFechar }) {
  const comCodigo = Boolean(usuarioAtual()?.doisFatores);
  const [codigo, setCodigo] = useState('');
  const [senha, setSenha] = useState('');
  const [entendi, setEntendi] = useState(false);
  const [erro, setErro] = useState('');
  const [excluindo, setExcluindo] = useState(false);

  async function excluir(evento) {
    evento.preventDefault();
    if (!entendi) return setErro('Marque que você entende que a exclusão não tem volta.');
    if (!senha) return setErro('Digite a sua senha para confirmar.');
    setExcluindo(true);
    // Confere a senha antes de apagar qualquer coisa
    let certo = false;
    try {
      certo = await excluirUsuario(senha, codigo);
    } catch (falha) {
      setExcluindo(false);
      return setErro(falha.message);
    }
    if (!certo) {
      setExcluindo(false);
      setSenha('');
      return setErro('Senha incorreta. Nada foi apagado.');
    }
    irPara('/');
    return undefined;
  }

  return (
    <Janela titulo="Excluir minha conta" id="mc-excluir-titulo" aoFechar={aoFechar} aoEnviar={excluir}>
      <p className="mc-aviso">
        Isto apaga <b>a sua conta e tudo o que está nela</b>: contas, cartões, lançamentos, objetivos, comprovantes, orçamentos e
        preferências. <b>Não tem volta.</b> Se quiser guardar uma cópia, baixe um backup antes.
      </p>
      <label className="cfg-campo">
        Sua senha
        <input type="password" autoComplete="current-password" autoFocus value={senha} onChange={(e) => { setSenha(e.target.value); setErro(''); }} />
      </label>
      {comCodigo && <CampoCodigo valor={codigo} aoMudar={(v) => { setCodigo(v); setErro(''); }} />}
      <label className="mc-mostrar">
        <input type="checkbox" checked={entendi} onChange={(e) => { setEntendi(e.target.checked); setErro(''); }} /> Entendo que a exclusão não tem
        volta.
      </label>
      <Erro texto={erro} />
      <div className="cfg-janela__acoes">
        <button type="submit" className="cfg-botao mc-botao--perigo" disabled={excluindo}>
          {excluindo ? 'Excluindo…' : 'Excluir a conta'}
        </button>
        <button type="button" className="cfg-botao" onClick={aoFechar}>
          Cancelar
        </button>
      </div>
    </Janela>
  );
}

// ===== Verificação em duas etapas =====
// Ativar: mostra um QR code para o app autenticador (Google Authenticator, Authy, Microsoft Authenticator…)
// e pede o primeiro código. Desativar: pede um código atual.
export function SegundoFator({ aoMudar, aoFechar }) {
  const [etapa, setEtapa] = useState('carregando'); // carregando | desligado | ligando | ligado | pronto
  const [fator, setFator] = useState(null); // { fatorId, uri, chave }
  const [qr, setQr] = useState('');
  const [codigo, setCodigo] = useState('');
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    segundoFatorAtivo()
      .then((ativo) => setEtapa(ativo ? 'ligado' : 'desligado'))
      .catch(() => setEtapa('desligado'));
  }, []);

  async function comecar() {
    setErro('');
    setOcupado(true);
    try {
      const novo = await iniciarSegundoFator();
      setFator(novo);
      setQr(await QRCode.toString(novo.uri, { type: 'svg', margin: 1, color: { dark: '#141414', light: '#ffffff' } }));
      setEtapa('ligando');
    } catch (e) {
      setErro(e.message || 'Não foi possível começar agora. Tente de novo.');
    }
    setOcupado(false);
  }

  async function enviar(evento) {
    evento.preventDefault();
    setErro('');
    setOcupado(true);
    try {
      if (etapa === 'ligando') {
        await confirmarSegundoFator(fator.fatorId, codigo);
        setEtapa('pronto');
        aoMudar(true);
      } else if (etapa === 'ligado') {
        await desligarSegundoFator(codigo);
        setEtapa('desligado');
        aoMudar(false);
      }
      setCodigo('');
    } catch (e) {
      setErro(e.message);
      setCodigo('');
    }
    setOcupado(false);
  }

  return (
    <Janela titulo="Verificação em duas etapas" id="mc-2fa-titulo" aoFechar={aoFechar} aoEnviar={enviar}>
      {etapa === 'carregando' && <p className="mc-texto">Carregando…</p>}

      {etapa === 'desligado' && (
        <>
          <p className="mc-texto">
            Com a verificação em duas etapas, além da senha a CIFRA pede um <b>código de 6 números</b> que muda a cada 30
            segundos, gerado por um app no seu celular. Mesmo que alguém descubra a sua senha, não entra sem o seu celular.
          </p>
          <p className="mc-texto">
            Você vai precisar de um app autenticador: <b>Google Authenticator</b>, <b>Microsoft Authenticator</b> ou{' '}
            <b>Authy</b> (todos grátis).
          </p>
          <Erro texto={erro} />
          <div className="cfg-janela__acoes">
            <button type="button" className="cfg-botao cfg-botao--principal" onClick={comecar} disabled={ocupado}>
              {ocupado ? 'Preparando…' : 'Ativar'}
            </button>
            <button type="button" className="cfg-botao" onClick={aoFechar}>
              Agora não
            </button>
          </div>
        </>
      )}

      {etapa === 'ligando' && (
        <>
          <ol className="mc-passos">
            <li>No app autenticador, toque em <b>+</b> e escolha <b>ler QR code</b>.</li>
            <li>Aponte a câmera para o código abaixo.</li>
            <li>Digite o código de 6 números que aparecer para a CIFRA.</li>
          </ol>
          {qr && <span className="mc-qr" aria-label="QR code para o app autenticador" role="img" dangerouslySetInnerHTML={{ __html: qr }} />}
          <p className="mc-chave">
            Não consegue ler? Digite esta chave no app: <code>{fator?.chave}</code>
          </p>
          <CampoCodigo valor={codigo} aoMudar={(v) => { setCodigo(v); setErro(''); }} rotulo="Código que apareceu no app" />
          <Erro texto={erro} />
          <div className="cfg-janela__acoes">
            <button type="submit" className="cfg-botao cfg-botao--principal" disabled={ocupado}>
              {ocupado ? 'Conferindo…' : 'Confirmar e ativar'}
            </button>
            <button type="button" className="cfg-botao" onClick={aoFechar}>
              Cancelar
            </button>
          </div>
        </>
      )}

      {etapa === 'pronto' && (
        <>
          <p className="mc-texto">
            <b>Pronto! A verificação em duas etapas está ativa.</b> Da próxima vez que entrar na CIFRA (em qualquer aparelho),
            depois da senha vamos pedir o código do app.
          </p>
          <p className="mc-aviso">
            Guarde bem o celular com o app autenticador. Se perder o acesso a ele, fale com o atendimento da CIFRA para recuperar a
            conta.
          </p>
          <div className="cfg-janela__acoes">
            <button type="button" className="cfg-botao cfg-botao--principal" onClick={aoFechar}>
              Fechar
            </button>
          </div>
        </>
      )}

      {etapa === 'ligado' && (
        <>
          <p className="mc-texto">
            A verificação em duas etapas está <b>ativa</b>. Para desativar, digite o código que aparece agora no seu app
            autenticador.
          </p>
          <CampoCodigo valor={codigo} aoMudar={(v) => { setCodigo(v); setErro(''); }} autoFocus />
          <Erro texto={erro} />
          <div className="cfg-janela__acoes">
            <button type="submit" className="cfg-botao mc-botao--perigo" disabled={ocupado}>
              {ocupado ? 'Conferindo…' : 'Desativar'}
            </button>
            <button type="button" className="cfg-botao" onClick={aoFechar}>
              Manter ativa
            </button>
          </div>
        </>
      )}
    </Janela>
  );
}
