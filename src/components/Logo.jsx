import logoCifra from '../assets/cifra-logo.png';
import './Logo.css';

// "nome" permite mudar o texto ao lado da logo (padrão: CIFRA)
export default function Logo({ nome = 'CIFRA' }) {
  return (
    <span className="logo">
      {/* alt vazio: o nome "cifra" ao lado já identifica a marca */}
      <img className="logo__marca" src={logoCifra} alt="" />
      <span className="logo__nome">{nome}</span>
    </span>
  );
}
