// Ícones em SVG (traço). Herdam a cor pelo "stroke" passado via props.
function Svg({ children, tamanho = 24, cor = 'currentColor', espessura = 2 }) {
  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 24 24"
      fill="none"
      stroke={cor}
      strokeWidth={espessura}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export const IconeSeta = (p) => (
  <Svg {...p}>
    <path d="M5 12h14" />
    <path d="M13 6l6 6-6 6" />
  </Svg>
);

export const IconeCategorias = (p) => (
  <Svg {...p}>
    <rect x="4" y="4" width="6" height="6" rx="1.5" />
    <rect x="14" y="4" width="6" height="6" rx="1.5" />
    <rect x="4" y="14" width="6" height="6" rx="1.5" />
    <path d="M17 14v6" />
    <path d="M14 17h6" />
  </Svg>
);

export const IconeAlvo = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="5" />
    <circle cx="12" cy="12" r="1" />
  </Svg>
);

export const IconeSino = (p) => (
  <Svg {...p}>
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </Svg>
);

export const IconeMoeda = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M15 9.5c-.5-1-1.6-1.5-3-1.5-1.7 0-3 .9-3 2.1 0 2.8 6 1.3 6 4 0 1.2-1.3 2-3 2-1.4 0-2.5-.5-3-1.6" />
    <path d="M12 6.5V8" />
    <path d="M12 16v1.5" />
  </Svg>
);

export const IconeDispositivos = (p) => (
  <Svg {...p}>
    <rect x="2" y="4" width="14" height="10" rx="2" />
    <path d="M6 18h6" />
    <path d="M9 14v4" />
    <rect x="17" y="9" width="5" height="11" rx="1.5" />
  </Svg>
);

export const IconeTransferir = (p) => (
  <Svg {...p}>
    <path d="M7 7h11l-3-3" />
    <path d="M17 17H6l3 3" />
  </Svg>
);

export const IconeCoracao = (p) => (
  <Svg {...p}>
    <path d="M19.5 12.6L12 20l-7.5-7.4A4.8 4.8 0 0 1 12 6.3a4.8 4.8 0 0 1 7.5 6.3z" />
  </Svg>
);

export const IconeBandeira = (p) => (
  <Svg {...p}>
    <path d="M5 21V4" />
    <path d="M5 4h11l-2 4 2 4H5" />
  </Svg>
);

export const IconeRepetir = (p) => (
  <Svg {...p}>
    <path d="M17 2l3 3-3 3" />
    <path d="M4 11V9a4 4 0 0 1 4-4h12" />
    <path d="M7 22l-3-3 3-3" />
    <path d="M20 13v2a4 4 0 0 1-4 4H4" />
  </Svg>
);

export const IconeCartao = (p) => (
  <Svg {...p}>
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <path d="M2 10h20" />
    <path d="M6 15h4" />
  </Svg>
);

export const IconeCalendario = (p) => (
  <Svg {...p}>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 10h18" />
    <path d="M8 3v4" />
    <path d="M16 3v4" />
  </Svg>
);

export const IconeBackup = (p) => (
  <Svg {...p}>
    <path d="M12 3v12" />
    <path d="M7 10l5 5 5-5" />
    <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
  </Svg>
);

export const IconeCadeado = (p) => (
  <Svg {...p}>
    <rect x="4" y="11" width="16" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </Svg>
);

export const IconeSorriso = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M8.5 14a4 4 0 0 0 7 0" />
    <path d="M9 9.5h.01" />
    <path d="M15 9.5h.01" />
  </Svg>
);

export const IconeMonitor = (p) => (
  <Svg {...p}>
    <rect x="2" y="4" width="20" height="13" rx="2" />
    <path d="M8 21h8" />
    <path d="M12 17v4" />
  </Svg>
);

export const IconeCelular = (p) => (
  <Svg {...p}>
    <rect x="6" y="2" width="12" height="20" rx="2.5" />
    <path d="M11 18h2" />
  </Svg>
);

export const IconePizza = (p) => (
  <Svg {...p}>
    <path d="M21 12a9 9 0 1 1-9-9v9z" />
    <path d="M14 3.2A9 9 0 0 1 20.8 10H14z" />
  </Svg>
);

export const IconeCheck = (p) => (
  <Svg {...p}>
    <path d="M20 6L9 17l-5-5" />
  </Svg>
);

export const IconeMais = (p) => (
  <Svg {...p}>
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </Svg>
);

export const IconeCarteira = (p) => (
  <Svg {...p}>
    <path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    <path d="M21 11h-5a2 2 0 0 0 0 4h5z" />
  </Svg>
);

export const IconeGrafico = (p) => (
  <Svg {...p}>
    <path d="M4 20V10" />
    <path d="M10 20V4" />
    <path d="M16 20v-7" />
    <path d="M22 20H2" />
  </Svg>
);

export const IconeBanco = (p) => (
  <Svg {...p}>
    <path d="M3 10l9-6 9 6" />
    <path d="M5 10v9h14v-9" />
    <path d="M10 19v-5h4v5" />
  </Svg>
);

export const IconeDinheiro = (p) => (
  <Svg {...p}>
    <rect x="2" y="6" width="20" height="12" rx="2" />
    <circle cx="12" cy="12" r="2.5" />
  </Svg>
);

// ===== Ícones do painel =====
export const IconeCasa = (p) => (
  <Svg {...p}>
    <path d="M3 11l9-7 9 7" />
    <path d="M5 10v10h14V10" />
  </Svg>
);

export const IconeLista = (p) => (
  <Svg {...p}>
    <path d="M8 6h13" />
    <path d="M8 12h13" />
    <path d="M8 18h13" />
    <circle cx="4" cy="6" r="1" />
    <circle cx="4" cy="12" r="1" />
    <circle cx="4" cy="18" r="1" />
  </Svg>
);

export const IconePlanejamento = (p) => (
  <Svg {...p}>
    <path d="M9 11l3 3 8-8" />
    <path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9" />
  </Svg>
);

export const IconeConfig = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2v3" />
    <path d="M12 19v3" />
    <path d="M4.9 4.9l2.1 2.1" />
    <path d="M17 17l2.1 2.1" />
    <path d="M2 12h3" />
    <path d="M19 12h3" />
    <path d="M4.9 19.1L7 17" />
    <path d="M17 7l2.1-2.1" />
  </Svg>
);

export const IconeSair = (p) => (
  <Svg {...p}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="M16 17l5-5-5-5" />
    <path d="M21 12H9" />
  </Svg>
);

export const IconeBusca = (p) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="M21 21l-4.3-4.3" />
  </Svg>
);

export const IconeCima = (p) => (
  <Svg {...p}>
    <path d="M12 19V5" />
    <path d="M5 12l7-7 7 7" />
  </Svg>
);

export const IconeBaixo = (p) => (
  <Svg {...p}>
    <path d="M12 5v14" />
    <path d="M19 12l-7 7-7-7" />
  </Svg>
);

// Olho (mostrar/esconder valores). Com "fechado", aparece riscado.
export const IconeOlho = ({ fechado, ...p }) => (
  <Svg {...p}>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
    {fechado && <path d="M3 3l18 18" />}
  </Svg>
);

export const IconeUsuario = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0 1 16 0" />
  </Svg>
);

export const IconeEtiqueta = (p) => (
  <Svg {...p}>
    <path d="M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z" />
    <circle cx="7.5" cy="7.5" r="1.5" />
  </Svg>
);

export const IconeBaixar = (p) => (
  <Svg {...p}>
    <path d="M12 3v12" />
    <path d="M7 10l5 5 5-5" />
    <path d="M5 21h14" />
  </Svg>
);

export const IconeEnviar = (p) => (
  <Svg {...p}>
    <path d="M12 21V9" />
    <path d="M7 14l5-5 5 5" />
    <path d="M5 3h14" />
  </Svg>
);

export const IconeLixeira = (p) => (
  <Svg {...p}>
    <path d="M3 6h18" />
    <path d="M8 6V4h8v2" />
    <path d="M6 6l1 15h10l1-15" />
  </Svg>
);

export const IconeEscudo = (p) => (
  <Svg {...p}>
    <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />
    <path d="M9 12l2 2 4-4" />
  </Svg>
);

export const IconeInfo = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v6" />
    <path d="M12 7.5v.5" />
  </Svg>
);

export const IconeEstrela = (p) => (
  <Svg {...p}>
    <path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9z" />
  </Svg>
);

export const IconeDireita = (p) => (
  <Svg {...p}>
    <path d="M9 6l6 6-6 6" />
  </Svg>
);

export const IconeLivro = (p) => (
  <Svg {...p}>
    <path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z" />
    <path d="M4 21V5" />
    <path d="M9 7h6" />
  </Svg>
);

export const IconeChecklist = (p) => (
  <Svg {...p}>
    <path d="M9 6h11" />
    <path d="M9 12h11" />
    <path d="M9 18h11" />
    <path d="M3 6l1.5 1.5L7 5" />
    <path d="M3 12l1.5 1.5L7 11" />
    <path d="M3 18l1.5 1.5L7 17" />
  </Svg>
);

export const IconeRecibo = (p) => (
  <Svg {...p}>
    <path d="M6 2h12v20l-3-2-3 2-3-2-3 2z" />
    <path d="M9 7h6" />
    <path d="M9 11h6" />
    <path d="M9 15h4" />
  </Svg>
);

export const IconeJornal = (p) => (
  <Svg {...p}>
    <path d="M4 4h13v16H6a2 2 0 0 1-2-2z" />
    <path d="M17 8h3v10a2 2 0 0 1-2 2" />
    <path d="M8 8h5" />
    <path d="M8 12h5" />
    <path d="M8 16h3" />
  </Svg>
);

export const IconeClipe = (p) => (
  <Svg {...p}>
    <path d="M21 11l-8.5 8.5a5 5 0 0 1-7-7L14 4a3.5 3.5 0 0 1 5 5l-8.5 8.5a2 2 0 0 1-3-3L15 7" />
  </Svg>
);

// Fone de atendimento (headset)
export const IconeAtendimento = (p) => (
  <Svg {...p}>
    <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
    <rect x="3" y="13" width="4" height="6" rx="1.5" />
    <rect x="17" y="13" width="4" height="6" rx="1.5" />
    <path d="M19 19c0 1.7-1.8 3-4 3h-2" />
  </Svg>
);

// Balão do WhatsApp (traço simples)
export const IconeWhatsApp = (p) => (
  <Svg {...p}>
    <path d="M4 20l1.3-3.9A8 8 0 1 1 8 19l-4 1z" />
    <path d="M9.5 9.5c0 2.5 2.5 5 5 5l1-1.2-1.8-.8-.7.7c-.9-.4-1.8-1.3-2.2-2.2l.7-.7-.8-1.8z" />
  </Svg>
);

// Envelope (e-mail)
export const IconeEmail = (p) => (
  <Svg {...p}>
    <rect x="3" y="5" width="18" height="14" rx="2.5" />
    <path d="M4 7l8 6 8-6" />
  </Svg>
);

// Dinheiro saindo: moeda com seta para fora (tela "A pagar")
export const IconeAPagar = (p) => (
  <Svg {...p}>
    <circle cx="10" cy="14" r="7" />
    <path d="M10 11v6" />
    <path d="M14.5 3.5H20.5V9.5" />
    <path d="M20.5 3.5L14 10" />
  </Svg>
);

export const IconeImagem = (p) => (
  <Svg {...p}>
    <rect x="3" y="3" width="18" height="18" rx="3" />
    <circle cx="9" cy="9" r="2" />
    <path d="M21 15l-5-5L5 21" />
  </Svg>
);
