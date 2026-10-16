import { IconeSino, IconeBanco, IconeTransferir, IconeMais, IconeGrafico, IconeAlvo } from './Icones.jsx';
import './CelularInicio.css';

// Ilustração da tela inicial do app (dados de exemplo)
const contas = [
  { nome: 'NuBank', valor: 'R$ 2.705,39', cor: '#fbebd2' },
  { nome: 'Inter', valor: 'R$ 300,01', cor: '#efebe4' },
  { nome: 'Santander', valor: 'R$ 1.200,50', cor: '#f6e3c6' },
];

export default function CelularInicio() {
  return (
    <div className="celular" role="img" aria-label="Exemplo da tela inicial da CIFRA no celular">
      <div className="celular__tela">
        <div className="celular__topo">
          <span className="celular__avatar">J</span>
          <span className="celular__saudacao">
            <span className="celular__saudacao-pequena">Bom dia,</span>
            <span className="celular__nome">João</span>
          </span>
          <span className="celular__sino">
            <IconeSino tamanho={16} cor="#eaaf5a" />
          </span>
        </div>

        <div className="celular__card celular__card--saldo">
          <div>
            <div className="celular__legenda">Saldo geral</div>
            <div className="celular__saldo">R$ 4.205,90</div>
          </div>
          <div className="celular__divisor" />
          <div className="celular__subtitulo">Minhas contas</div>
          {contas.map((conta) => (
            <div key={conta.nome} className="celular__conta">
              <span className="celular__conta-bolinha" style={{ background: conta.cor }} />
              <span className="celular__conta-nome">{conta.nome}</span>
              <span className="celular__conta-valor">{conta.valor}</span>
            </div>
          ))}
          <div className="celular__gerenciar">Gerenciar contas</div>
        </div>

        <div className="celular__card celular__card--pagar">
          <div className="celular__legenda">Contas a pagar esta semana</div>
          <div className="celular__pagar">R$ 389,40</div>
        </div>

        <div className="celular__menu">
          <IconeBanco tamanho={20} cor="#141414" />
          <IconeTransferir tamanho={20} cor="#6b6355" />
          <span className="celular__mais">
            <IconeMais tamanho={20} cor="#141414" espessura={2.4} />
          </span>
          <IconeGrafico tamanho={20} cor="#6b6355" />
          <IconeAlvo tamanho={20} cor="#6b6355" />
        </div>
      </div>
    </div>
  );
}
