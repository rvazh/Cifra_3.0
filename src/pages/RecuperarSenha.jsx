import { useState } from 'react';
import { Link } from 'react-router-dom';
import logoCifra from '../assets/cifra-logo.png';
import { IconeSeta } from '../components/Icones.jsx';
import { emailValido, pedirNovaSenha } from '../dados/usuarios.js';
import './Entrar.css';
import './Cadastro.css';

// "Esqueci minha senha": o Supabase manda um link para o e-mail; o link abre a tela "Nova senha"
export default function RecuperarSenha() {
  const [email, setEmail] = useState('');
  const [erro, setErro] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function enviar(evento) {
    evento.preventDefault();
    if (!emailValido(email)) return setErro('Digite o e-mail da sua conta. Ex.: nome@email.com');
    setEnviando(true);
    try {
      await pedirNovaSenha(email);
      setEnviado(true);
    } catch (e) {
      setErro(e.message);
    }
    setEnviando(false);
    return undefined;
  }

  return (
    <div className="cad">
      <header className="cad__topo">
        <Link to="/entrar" className="entrar__voltar">
          <span className="entrar__voltar-seta">
            <IconeSeta tamanho={18} cor="#141414" espessura={2.2} />
          </span>
          Voltar para o login
        </Link>
      </header>

      <form className="cad__form cad__form--estreito" onSubmit={enviar} noValidate>
        <img className="cad__logo" src={logoCifra} alt="CIFRA" />
        <h1 className="cad__titulo">Esqueci minha senha</h1>
        {enviado ? (
          <>
            <p className="cad__sub" role="status">
              Se existir uma conta com <b>{email.trim()}</b>, enviamos um link para criar uma senha nova. Confira a caixa de entrada e o
              spam. O link vale por 1 hora.
            </p>
            <Link to="/entrar" className="entrar__link-forte">
              Voltar para o login
            </Link>
          </>
        ) : (
          <>
            <p className="cad__sub">Digite o e-mail da sua conta. Vamos mandar um link para você criar uma senha nova.</p>
            <label className="cad__campo">
              <span className="cad__rotulo">E-mail</span>
              <input
                id="rec-email"
                className="entrar__input"
                type="email"
                inputMode="email"
                autoComplete="email"
                autoFocus
                placeholder="nome@email.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErro('');
                }}
              />
            </label>
            {erro && (
              <p className="entrar__erro" role="alert">
                {erro}
              </p>
            )}
            <button type="submit" className="entrar__botao" disabled={enviando}>
              {enviando ? 'Enviando…' : 'Enviar o link'}
              <IconeSeta tamanho={20} cor="#141414" espessura={2.2} />
            </button>
          </>
        )}
      </form>
    </div>
  );
}
