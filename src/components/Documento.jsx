import { Link } from 'react-router-dom';
import logoCifra from '../assets/cifra-logo.png';
import { IconeSeta } from './Icones.jsx';
import './Documento.css';

// Layout das páginas de texto longo (Política de Privacidade, Termos de Uso...).
// Logo centralizada no topo, título, subtítulo e o conteúdo em uma coluna.
export default function Documento({ titulo, subtitulo, atualizado, children }) {
  return (
    <div className="doc">
      <Link to="/" className="doc__logo" aria-label="CIFRA — página inicial">
        <img src={logoCifra} alt="" />
        <span>CIFRA</span>
      </Link>

      <article className="doc__conteudo">
        <header className="doc__cabecalho">
          <h1 className="doc__titulo">{titulo}</h1>
          {subtitulo && <p className="doc__subtitulo">{subtitulo}</p>}
          {atualizado && <span className="doc__data">Última atualização: {atualizado}</span>}
        </header>

        {children}
      </article>

      <div className="doc__fim">
        <Link to="/" className="doc__voltar">
          <span className="doc__voltar-seta">
            <IconeSeta tamanho={18} cor="#141414" espessura={2.2} />
          </span>
          Voltar para o site
        </Link>
        <span className="doc__copy">© 2026 CIFRA Tech Ltda.</span>
      </div>
    </div>
  );
}
