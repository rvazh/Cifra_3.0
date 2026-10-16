import { Link, NavLink } from 'react-router-dom';
import Logo from './Logo.jsx';
import './Header.css';

const links = [
  { para: '/', texto: 'Início' },
  { para: '/quem-somos', texto: 'Quem somos' },
  { para: '/planos', texto: 'Planos' },
  { para: '/teste-gratis', texto: 'Teste grátis' },
];

export default function Header() {
  return (
    <div className="header-fundo">
      <header className="header container">
        <Link to="/" aria-label="CIFRA — página inicial">
          <Logo nome="cifra" />
        </Link>

        <nav aria-label="Principal" className="header__nav">
          {links.map((link) => (
            // NavLink adiciona a classe "active" (e aria-current) no link da página atual
            <NavLink key={link.para} to={link.para} end className="header__link">
              {link.texto}
            </NavLink>
          ))}
        </nav>

        <Link to="/entrar" className="header__entrar">
          Entrar
        </Link>
      </header>
    </div>
  );
}
