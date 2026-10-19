import telaDoPainel from '../assets/celular-painel.webp';
import './CelularInicio.css';

// Celular mostrando a tela real da CIFRA (Visão geral, com dados de exemplo).
// A imagem foi tirada do próprio sistema numa tela de 390 x 844 (tamanho de um celular comum).
// Para atualizar: abra o painel no celular (ou no modo celular do navegador), tire um print
// e troque o arquivo src/assets/celular-painel.webp.
export default function CelularInicio() {
  return (
    <div className="celular">
      <div className="celular__tela">
        <img
          className="celular__imagem"
          src={telaDoPainel}
          width="390"
          height="844"
          alt="Tela inicial da CIFRA no celular: saldo geral, receitas, despesas e quanto sobrará no mês"
        />
      </div>
    </div>
  );
}
