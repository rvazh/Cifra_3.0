import { useEffect, useState } from 'react';
import { estadoDaNuvem, temPendentes } from '../dados/nuvem.js';
import './AvisoNuvem.css';

// Faixa pequena no rodapé das telas do sistema:
//  - sem internet: as mudanças ficam no aparelho e sobem quando a conexão voltar;
//  - outro aparelho mudou algo: botão para atualizar a tela.
export default function AvisoNuvem() {
  const [estado, setEstado] = useState(estadoDaNuvem);

  useEffect(() => {
    const aoMudar = (e) => setEstado(e.detail);
    window.addEventListener('cifra:nuvem', aoMudar);
    return () => window.removeEventListener('cifra:nuvem', aoMudar);
  }, []);

  if (estado === 'novidades') {
    return (
      <div className="aviso-nuvem" role="status">
        <span>Seus dados mudaram em outro aparelho.</span>
        <button type="button" className="aviso-nuvem__botao" onClick={() => window.location.reload()}>
          Atualizar
        </button>
      </div>
    );
  }
  if (estado === 'erro' && temPendentes()) {
    return (
      <div className="aviso-nuvem aviso-nuvem--erro" role="status">
        <span>Sem conexão. Suas mudanças estão salvas neste aparelho e sobem quando a internet voltar.</span>
      </div>
    );
  }
  return null;
}
