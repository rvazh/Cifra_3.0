import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import logoCifra from '../assets/cifra-logo.png';
import { IconeSeta } from '../components/Icones.jsx';
import { definirNovaSenha, regrasDaSenha, temSessaoAberta, faltaCodigoDoSegundoFator, confirmarCodigo } from '../dados/usuarios.js';
import { irPara } from '../dados/acesso.js';
import './Entrar.css';
import './Cadastro.css';

// Aberta pelo link do e-mail "Esqueci minha senha" (o link já deixa a pessoa logada)
export default function NovaSenha() {
  const [senha, setSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [mostrar, setMostrar] = useState(false);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [link, setLink] = useState('conferindo'); // conferindo | valido | invalido
  const [pedeCodigo, setPedeCodigo] = useState(false); // conta com verificação em duas etapas
  const [codigo, setCodigo] = useState('');
  const regras = regrasDaSenha(senha);

  // O link do e-mail abre uma sessão; sem ela, o link expirou
  useEffect(() => {
    (async () => {
      const aberta = await temSessaoAberta();
      setLink(aberta ? 'valido' : 'invalido');
      if (aberta) setPedeCodigo(await faltaCodigoDoSegundoFator());
    })();
  }, []);

  async function salvar(evento) {
    evento.preventDefault();
    if (!regras.every((r) => r.ok)) return setErro('A senha ainda não cumpre as regras abaixo.');
    if (senha !== confirmar) return setErro('As senhas não são iguais.');
    setSalvando(true);
    try {
      if (pedeCodigo) await confirmarCodigo(codigo);
      await definirNovaSenha(senha);
      irPara('/painel');
    } catch (e) {
      setSalvando(false);
      setErro(e.message);
    }
    return undefined;
  }

  return (
    <div className="cad">
      <header className="cad__topo">
        <Link to="/" className="entrar__voltar">
          <span className="entrar__voltar-seta">
            <IconeSeta tamanho={18} cor="#141414" espessura={2.2} />
          </span>
          Voltar para o site
        </Link>
      </header>
      <form className="cad__form cad__form--estreito" onSubmit={salvar} noValidate>
        <img className="cad__logo" src={logoCifra} alt="CIFRA" />
        <h1 className="cad__titulo">Criar uma senha nova</h1>
        {link === 'conferindo' ? (
          <p className="cad__sub">Conferindo o link…</p>
        ) : link === 'invalido' ? (
          <>
            <p className="cad__sub">Este link expirou ou já foi usado. Peça um novo na tela de login.</p>
            <Link to="/recuperar-senha" className="entrar__link-forte">
              Pedir um novo link
            </Link>
          </>
        ) : (
          <>
            <label className="cad__campo">
              <span className="cad__rotulo">Nova senha</span>
              <input
                id="nova-senha"
                className="entrar__input"
                type={mostrar ? 'text' : 'password'}
                autoComplete="new-password"
                autoFocus
                value={senha}
                onChange={(e) => {
                  setSenha(e.target.value);
                  setErro('');
                }}
              />
            </label>
            <label className="cad__campo">
              <span className="cad__rotulo">Confirmar a nova senha</span>
              <input
                id="nova-senha-confirmar"
                className="entrar__input"
                type={mostrar ? 'text' : 'password'}
                autoComplete="new-password"
                value={confirmar}
                onChange={(e) => {
                  setConfirmar(e.target.value);
                  setErro('');
                }}
              />
            </label>
            <ul className="cad__regras" aria-label="Regras da senha">
              {regras.map((r) => (
                <li key={r.texto} className={r.ok ? 'cad__regra cad__regra--ok' : 'cad__regra'}>
                  <span className="cad__regra-bola" aria-hidden="true" />
                  {r.texto}
                </li>
              ))}
            </ul>
            <label className="cad__aceite">
              <input type="checkbox" checked={mostrar} onChange={(e) => setMostrar(e.target.checked)} />
              <span>Mostrar as senhas</span>
            </label>
            {pedeCodigo && (
              <label className="cad__campo">
                <span className="cad__rotulo">Código do app autenticador (verificação em duas etapas)</span>
                <input
                  id="nova-senha-codigo"
                  className="entrar__input"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={7}
                  placeholder="000000"
                  value={codigo}
                  onChange={(e) => {
                    setCodigo(e.target.value.replace(/[^\d ]/g, ''));
                    setErro('');
                  }}
                />
              </label>
            )}
            {erro && (
              <p className="entrar__erro" role="alert">
                {erro}
              </p>
            )}
            <button type="submit" className="entrar__botao" disabled={salvando}>
              {salvando ? 'Salvando…' : 'Salvar e entrar'}
              <IconeSeta tamanho={20} cor="#141414" espessura={2.2} />
            </button>
          </>
        )}
      </form>
    </div>
  );
}
