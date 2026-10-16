import { Link } from 'react-router-dom';
import {
  IconeCheck,
  IconeSeta,
  IconeMonitor,
  IconeCelular,
  IconePizza,
  IconeCadeado,
  IconeCartao,
} from './Icones.jsx';
import imagemPainel from '../assets/painel-principal.webp';
import './Seguranca.css';

// Lista com ✓ (o último item fica em destaque)
const vantagens = [
  'Sem anúncios dentro do seu sistema. Livre de poluição visual',
  'Registre os seus gastos a qualquer momento e em qualquer lugar',
  'Gerencie os seus cartões em um só lugar',
  'Receba lembretes de contas a pagar e nunca mais pague juros por atraso',
];
const vantagemDestaque =
  'Segurança, planejamento e direção. Tudo o que você precisa em um só lugar';

export default function Seguranca() {
  return (
    <section className="seg">
      <div className="container">
        <span className="seg__rotulo">Facilidade com o que importa</span>
        <h2 className="seg__titulo">Tenha a sua gestão financeira com tranquilidade</h2>

        <div className="seg__conteudo">
          {/* ===== Texto ===== */}
          <div className="seg__texto">

            <ul className="seg__lista">
              {vantagens.map((item) => (
                <li key={item} className="seg__item">
                  <span className="seg__check">
                    <IconeCheck tamanho={13} cor="#8c5a10" espessura={3} />
                  </span>
                  {item}
                </li>
              ))}
              <li className="seg__item seg__item--destaque">
                <span className="seg__check seg__check--destaque">
                  <IconeCheck tamanho={13} cor="#eaaf5a" espessura={3} />
                </span>
                {vantagemDestaque}
              </li>
            </ul>

            <Link to="/entrar" className="seg__botao">
              Se planeje agora, para o futuro
              <IconeSeta tamanho={22} cor="#141414" espessura={2.2} />
            </Link>

            <div className="seg__plataformas">
              <span className="seg__plataforma-icone">
                <IconeMonitor tamanho={22} cor="#141414" espessura={1.8} />
              </span>
              <strong className="seg__plataforma-texto">Disponível na Web e no App, acesse!</strong>
              <span className="seg__plataforma-icone">
                <IconeCelular tamanho={22} cor="#141414" espessura={1.8} />
              </span>
            </div>
          </div>

          {/* ===== Painel da CIFRA no computador ===== */}
          <div className="seg__visual">
            <span className="seg__selo seg__selo--grafico" aria-hidden="true">
              <IconePizza tamanho={28} cor="#141414" />
            </span>
            <span className="seg__selo seg__selo--cadeado" aria-hidden="true">
              <IconeCadeado tamanho={28} cor="#eaaf5a" />
            </span>
            <span className="seg__selo seg__selo--cartao" aria-hidden="true">
              <IconeCartao tamanho={56} cor="#8c5a10" espessura={1.8} />
            </span>

            <div className="painel-pc">
              <div className="painel-pc__barra" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <img
                className="painel-pc__imagem"
                src={imagemPainel}
                alt="Painel principal da CIFRA no computador"
                width="1600"
                height="1000"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
