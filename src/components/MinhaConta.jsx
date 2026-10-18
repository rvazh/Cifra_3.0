import { useState } from 'react';
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
    if (soNumeros(f.cep).length !== 8) return setErro('O CEP tem 8 números.');
    if (!f.rua.trim() || !f.numero.trim() || !f.bairro.trim() || !f.cidade.trim() || !f.uf) return setErro('Preencha o endereço completo (só o complemento é opcional).');
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
export function TrocarSenha({ aoSalvar, aoFechar }) {
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
      certo = await trocarSenha(atual, nova);
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
      certo = await excluirUsuario(senha);
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
