import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import Inicio from './pages/Inicio.jsx';
import Entrar from './pages/Entrar.jsx';
import Planos from './pages/Planos.jsx';
import QuemSomos from './pages/QuemSomos.jsx';
import Privacidade from './pages/Privacidade.jsx';
import Termos from './pages/Termos.jsx';
import Painel from './pages/Painel.jsx';
import Lancamentos from './pages/Lancamentos.jsx';
import Calendario from './pages/Calendario.jsx';
import Contas from './pages/Contas.jsx';
import Relatorios from './pages/Relatorios.jsx';
import Objetivos from './pages/Objetivos.jsx';
import Configuracoes from './pages/Configuracoes.jsx';
import Cursos from './pages/Cursos.jsx';
import EmBreve from './pages/EmBreve.jsx';
import { estaLogado } from './dados/acesso.js';
import AlertasDeVencimento from './components/AlertasDeVencimento.jsx';
import Checklist from './pages/Checklist.jsx';
import Noticias from './pages/Noticias.jsx';
import Comprovantes from './pages/Comprovantes.jsx';
import TesteGratis from './pages/TesteGratis.jsx';
import Cadastro from './pages/Cadastro.jsx';
import Receber from './pages/Receber.jsx';
import Pagar from './pages/Pagar.jsx';
import BotaoAtendimento from './components/BotaoAtendimento.jsx';

// Páginas que aparecem sem o cabeçalho e o rodapé do site
const telasSemMenu = ['/entrar', '/cadastro', '/privacidade', '/termos'];

// O painel (e tudo dentro de /painel) também aparece sem o menu do site
function semMenu(caminho) {
  return telasSemMenu.includes(caminho) || caminho.startsWith('/painel');
}

export default function App() {
  const { pathname } = useLocation();
  const mostrarMenu = !semMenu(pathname);

  // Ao trocar de página, volta para o topo
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  // Telas do sistema (/painel...) só abrem depois do login
  if (pathname.startsWith('/painel') && !estaLogado()) {
    return <Navigate to="/entrar" replace state={{ de: pathname }} />;
  }
  // Quem já entrou e abre a tela de login (ou de criar conta) vai direto para o painel
  if ((pathname === '/entrar' || pathname === '/cadastro') && estaLogado()) {
    return <Navigate to="/painel" replace />;
  }

  return (
    <div className="app">
      {mostrarMenu && <Header />}
      <main>
        <Routes>
          <Route path="/" element={<Inicio />} />
          <Route path="/quem-somos" element={<QuemSomos />} />
          <Route path="/planos" element={<Planos />} />
          <Route path="/teste-gratis" element={<TesteGratis />} />
          <Route path="/entrar" element={<Entrar />} />
          <Route path="/painel" element={<Painel />} />
          <Route path="/painel/lancamentos" element={<Lancamentos />} />
          <Route path="/painel/calendario" element={<Calendario />} />
          <Route path="/painel/contas" element={<Contas />} />
          <Route path="/painel/relatorios" element={<Relatorios />} />
          <Route path="/painel/objetivos" element={<Objetivos />} />
          <Route path="/painel/receber" element={<Receber />} />
          <Route path="/painel/pagar" element={<Pagar />} />
          <Route path="/painel/configuracoes" element={<Configuracoes />} />
          <Route path="/painel/cursos" element={<Cursos />} />
          <Route path="/painel/checklist" element={<Checklist />} />
          <Route path="/painel/noticias" element={<Noticias />} />
          <Route path="/painel/comprovantes" element={<Comprovantes />} />
          <Route
            path="/painel/*"
            element={<EmBreve titulo="Em construção" voltarPara="/painel" voltarTexto="Voltar para o painel" />}
          />
          <Route path="/cadastro" element={<Cadastro />} />
          <Route path="/recuperar-senha" element={<EmBreve titulo="Recuperar senha" />} />
          <Route path="/privacidade" element={<Privacidade />} />
          <Route path="/termos" element={<Termos />} />
          <Route path="*" element={<EmBreve titulo="Página não encontrada" />} />
        </Routes>
      </main>
      {mostrarMenu && <Footer />}
      <AlertasDeVencimento />
      <BotaoAtendimento />
    </div>
  );
}
