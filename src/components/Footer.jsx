import { Link } from 'react-router-dom';
import Logo from './Logo.jsx';
import './Footer.css';

const links = [
  { para: '/', texto: 'Início' },
  { para: '/quem-somos', texto: 'Quem somos' },
  { para: '/planos', texto: 'Planos' },
  { para: '/teste-gratis', texto: 'Teste grátis' },
];

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        {/* Linha de cima: logo, menu e botão */}
        <div className="footer__topo">
          <Link to="/" aria-label="CIFRA — página inicial">
            <Logo />
          </Link>

          <nav aria-label="Rodapé" className="footer__nav">
            {links.map((link) => (
              <Link key={link.para} to={link.para} className="footer__link">
                {link.texto}
              </Link>
            ))}
          </nav>

          <Link to="/entrar" className="footer__botao">
            Inicie uma nova etapa!
          </Link>
        </div>

        {/* Linha de baixo: direitos e páginas legais */}
        <div className="footer__base">
          <span className="footer__copy">© 2026 CIFRA Tech Ltda. Todos os direitos reservados.</span>
          <div className="footer__legais">
            <Link to="/privacidade" className="footer__link footer__link--pequeno">
              Política de Privacidade
            </Link>
            <Link to="/termos" className="footer__link footer__link--pequeno">
              Termos de Uso
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
