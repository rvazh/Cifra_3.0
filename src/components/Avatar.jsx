import { useEffect, useState } from 'react';
import { fotoDePerfil } from '../dados/fotoPerfil.js';

// Foto de perfil redonda (ou a inicial do nome, quando não há foto). Atualiza sozinha quando a foto muda.
export default function Avatar({ nome = '', className = '', tamanho }) {
  const [foto, setFoto] = useState(fotoDePerfil);
  useEffect(() => {
    const atualizar = () => setFoto(fotoDePerfil());
    window.addEventListener('cifra:foto-perfil', atualizar);
    return () => window.removeEventListener('cifra:foto-perfil', atualizar);
  }, []);
  const estilo = tamanho ? { width: tamanho, height: tamanho } : undefined;
  if (foto) return <img className={`avatar ${className}`} src={foto} alt="" style={estilo} />;
  return (
    <span className={`avatar avatar--inicial ${className}`} style={estilo} aria-hidden="true">
      {(nome || 'C').trim().charAt(0).toUpperCase()}
    </span>
  );
}
