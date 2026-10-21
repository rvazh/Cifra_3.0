import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import MenuLateral from '../components/MenuLateral.jsx';
import {
  IconeCalendario,
  IconeOlho,
  IconeEtiqueta,
  IconeCarteira,
  IconeSino,
  IconeBaixar,
  IconeEnviar,
  IconeLixeira,
  IconeEstrela,
  IconeInfo,
  IconeEscudo,
  IconeDireita,
  IconeWhatsApp,
  IconeCelular,
  IconeUsuario,
  IconeCadeado,
  IconePlanejamento,
  IconeRepetir,
  IconeMonitor,
  IconeImagem,
} from '../components/Icones.jsx';
import EscolherFundo from '../components/EscolherFundo.jsx';
import Avatar from '../components/Avatar.jsx';
import { fotoDePerfil, prepararFoto, salvarFotoDePerfil, apagarFotoDePerfil } from '../dados/fotoPerfil.js';
import { EditarDados, TrocarSenha, ExcluirConta, SegundoFator } from '../components/MinhaConta.jsx';
import OrcamentoCategorias from '../components/Orcamento.jsx';
import ContasFixas from '../components/ContasFixas.jsx';
import { carregarOrcamentos, AVISOS_POSSIVEIS } from '../dados/orcamentos.js';
import { usuarioAtual } from '../dados/usuarios.js';
import { carregarCategorias, carregar, salvar, nomeDoMes, listarFixas } from '../dados/lancamentos.js';
import { carregarContas, salvarContas } from '../dados/contas.js';
import { carregarObjetivos, salvarObjetivos } from '../dados/objetivos.js';
import { carregarPreferencias, salvarPreferencias, aplicarTema, FUNDOS, fotoDeFundo } from '../dados/preferencias.js';
import { EMAIL_CONTATO } from '../config.js';
import { pedirPermissaoDeAviso } from '../dados/alertas.js';
import { apagarTodosComprovantes } from '../dados/comprovantes.js';
import './Painel.css';
import { situacaoDoPlano } from '../dados/plano.js';
import { chave, chavesDoUsuario, nomeDaChave } from '../dados/armazenamento.js';
import { irPara } from '../dados/acesso.js';
import { enviarPendentes } from '../dados/nuvem.js';
import './Configuracoes.css';

const VERSAO = '1.0';

function lerNome() {
  try {
    return localStorage.getItem(chave('usuario')) || '';
  } catch {
    return '';
  }
}

// Todas as informações da pessoa logada (cópia local da conta na nuvem)
// (cada pessoa tem as suas; as de outras contas não entram)
function chavesDaCifra() {
  return chavesDoUsuario();
}

// ===== Uma linha da lista =====
function Linha({ Icone, titulo, sub, perigo, children }) {
  return (
    <>
      <span className={perigo ? 'cfg-linha__icone cfg-linha__icone--perigo' : 'cfg-linha__icone'}>
        <Icone tamanho={17} espessura={2.2} />
      </span>
      <span className="cfg-linha__textos">
        <span className={perigo ? 'cfg-linha__titulo cfg-linha__titulo--perigo' : 'cfg-linha__titulo'}>{titulo}</span>
        {sub && <span className="cfg-linha__sub">{sub}</span>}
      </span>
      {children}
    </>
  );
}

const Seta = () => (
  <span className="cfg-linha__seta">
    <IconeDireita tamanho={18} espessura={2} />
  </span>
);

function Grupo({ titulo, children }) {
  return (
    <section className="cfg-grupo">
      <h2 className="cfg-grupo__titulo">{titulo}</h2>
      <div className="cfg-grupo__lista">{children}</div>
    </section>
  );
}

// Interruptor liga/desliga (é um checkbox por baixo, então funciona no teclado)
function Interruptor({ ligado, aoMudar, rotulo }) {
  return (
    <span className="cfg-interruptor">
      <input type="checkbox" role="switch" checked={ligado} onChange={(e) => aoMudar(e.target.checked)} aria-label={rotulo} />
      <span className="cfg-interruptor__trilho" aria-hidden="true">
        <span className="cfg-interruptor__bola" />
      </span>
    </span>
  );
}

// "Plano Essencial (teste)" durante o teste grátis; senão, o plano atual
function textoDoPlano() {
  const plano = situacaoDoPlano();
  return plano.emTeste ? `${plano.nome} (teste)` : plano.nome;
}

export default function Configuracoes() {
  const [preferencias, setPreferencias] = useState(carregarPreferencias);
  const [nome, setNome] = useState(lerNome);
  const local = useLocation();
  // O Painel pode pedir para abrir uma janela direto (ex.: "Ajustar limites" do orçamento)
  const [janela, setJanela] = useState(local.state?.abrir || null); // 'perfil' | 'categorias' | 'dados' | 'senha' | 'excluir' | 'orcamento' | 'fixas'
  const [conta, setConta] = useState(usuarioAtual); // a pessoa logada (perfil guardado no Supabase)
  const [qtdOrcamentos, setQtdOrcamentos] = useState(() => Object.keys(carregarOrcamentos()).length);
  const [qtdFixas, setQtdFixas] = useState(() => listarFixas(carregar()).filter((f) => !f.encerradaEm).length);
  const [rascunho, setRascunho] = useState({ nome: '', email: '' });
  const [mensagem, setMensagem] = useState('');
  const arquivoBackup = useRef(null);
  const campoFoto = useRef(null);
  const [temFoto, setTemFoto] = useState(() => Boolean(fotoDePerfil()));

  async function trocarFoto(evento) {
    const arquivo = evento.target.files?.[0];
    evento.target.value = '';
    if (!arquivo) return;
    try {
      const dados = await prepararFoto(arquivo);
      if (!salvarFotoDePerfil(dados)) throw new Error('Não foi possível guardar a foto.');
      setTemFoto(true);
      setMensagem('Foto de perfil trocada.');
    } catch (falha) {
      setMensagem(falha.message);
    }
  }

  function tirarFoto() {
    apagarFotoDePerfil();
    setTemFoto(false);
    setMensagem('Foto de perfil removida.');
  }

  const [contagem] = useState(() => contar());

  function contar() {
    const lancamentos = carregar();
    const contas = carregarContas();
    const objetivos = carregarObjetivos();
    return {
      contas: contas.length,
      lancamentos: lancamentos.length,
      objetivos: objetivos.length,
      porCategoria: lancamentos.reduce((g, l) => ({ ...g, [l.categoria]: (g[l.categoria] || 0) + 1 }), {}),
    };
  }

  // Cada mudança é salva na hora
  function mudar(campo, valor) {
    const novas = { ...preferencias, [campo]: valor };
    setPreferencias(novas);
    salvarPreferencias(novas);
  }

  // Mensagem rápida no rodapé ("Backup baixado" etc.)
  useEffect(() => {
    if (!mensagem) return undefined;
    const tempo = setTimeout(() => setMensagem(''), 3500);
    return () => clearTimeout(tempo);
  }, [mensagem]);

  // Fecha a janela com Esc
  useEffect(() => {
    if (!janela) return undefined;
    const aoTeclar = (e) => e.key === 'Escape' && setJanela(null);
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, [janela]);

  function abrirPerfil() {
    // Abre o cadastro completo (a janela simples "perfil" só aparece se o cadastro não carregou)
    if (conta) {
      setJanela('dados');
      return;
    }
    setRascunho({ nome, email: preferencias.email });
    setJanela('perfil');
  }

  // Depois de salvar "Meus dados": atualiza o nome do painel e o e-mail das preferências
  function dadosSalvos(novo, emailPendente) {
    setConta(novo);
    try {
      localStorage.setItem(chave('usuario'), novo.nome);
    } catch {
      /* sem acesso ao armazenamento */
    }
    setNome(novo.nome);
    setJanela(null);
    setMensagem(emailPendente ? 'Dados salvos. Confirme o novo e-mail pelo link que enviamos.' : 'Dados atualizados.');
  }

  function salvarPerfil(evento) {
    evento.preventDefault();
    const novoNome = rascunho.nome.trim();
    try {
      localStorage.setItem(chave('usuario'), novoNome);
    } catch {
      /* sem acesso ao armazenamento */
    }
    setNome(novoNome);
    mudar('email', rascunho.email.trim());
    setJanela(null);
    setMensagem('Perfil atualizado.');
  }

  // ----- Backup -----
  function baixarBackup() {
    // Lê pelas funções de cada parte: assim entram também os dados que ainda não foram salvos (ex.: os exemplos)
    const dados = {
      'cifra:lancamentos': carregar(),
      'cifra:contas': carregarContas(),
      'cifra:objetivos': carregarObjetivos(),
      'cifra:preferencias': preferencias,
    };
    // No arquivo as chaves ficam sem o código da pessoa ("cifra:contas"), para o backup
    // poder ser restaurado em qualquer conta
    chavesDaCifra().forEach((k) => {
      const nome = `cifra:${nomeDaChave(k)}`;
      if (nome in dados) return;
      try {
        dados[nome] = JSON.parse(localStorage.getItem(k));
      } catch {
        dados[nome] = localStorage.getItem(k);
      }
    });
    const conteudo = { app: 'CIFRA', versao: VERSAO, criadoEm: new Date().toISOString(), dados };
    const arquivo = new Blob([JSON.stringify(conteudo, null, 2)], { type: 'application/json' });
    const endereco = URL.createObjectURL(arquivo);
    const link = document.createElement('a');
    link.href = endereco;
    link.download = `cifra-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(endereco);
    setMensagem('Backup baixado. Guarde o arquivo em um lugar seguro.');
  }

  function restaurarBackup(evento) {
    const arquivo = evento.target.files[0];
    evento.target.value = ''; // permite escolher o mesmo arquivo de novo
    if (!arquivo) return;
    const leitor = new FileReader();
    leitor.onload = () => {
      let conteudo;
      try {
        conteudo = JSON.parse(leitor.result);
      } catch {
        conteudo = null;
      }
      if (!conteudo || conteudo.app !== 'CIFRA' || typeof conteudo.dados !== 'object') {
        setMensagem('Esse arquivo não é um backup da CIFRA.');
        return;
      }
      if (!window.confirm('Restaurar este backup? Os dados atuais da sua conta serão substituídos pelos do arquivo (em todos os aparelhos).')) return;
      try {
        // O cadastro e a lista de comprovantes (arquivos na nuvem) continuam como estão
        const manter = [chave('perfil'), chave('comprovantes')];
        chavesDaCifra()
          .filter((k) => !manter.includes(k))
          .forEach((k) => localStorage.removeItem(k));
        Object.entries(conteudo.dados)
          .filter(([k]) => k.startsWith('cifra:') && !k.startsWith('cifra:u:') && !['cifra:sessao', 'cifra:usuarios'].includes(k))
          .filter(([k]) => !['cifra:comprovantes', 'cifra:perfil'].includes(k)) // arquivos e cadastro não vêm no backup
          .forEach(([k, v]) => localStorage.setItem(chave(k.slice('cifra:'.length)), typeof v === 'string' ? v : JSON.stringify(v)));
      } catch {
        setMensagem('Não foi possível restaurar neste navegador.');
        return;
      }
      setMensagem('Restaurando…');
      enviarPendentes().finally(() => window.location.reload());
    };
    leitor.readAsText(arquivo);
  }

  // ----- Apagar -----
  async function apagarTudo() {
    const certeza = window.confirm(
      'Apagar todos os dados da sua conta?\n\nContas, lançamentos, objetivos, comprovantes e preferências serão apagados em todos os aparelhos. A conta continua existindo. Não tem volta.'
    );
    if (!certeza) return;
    try {
      // Continua com o nome e o cadastro; o resto é apagado (aqui e na nuvem)
      const manter = [chave('usuario'), chave('perfil'), chave('comprovantes')];
      chavesDaCifra()
        .filter((k) => !manter.includes(k))
        .forEach((k) => localStorage.removeItem(k));
    } catch {
      /* sem acesso ao armazenamento */
    }
    // Deixa tudo zerado, como um usuário novo
    salvar([]);
    salvarContas([]);
    salvarObjetivos([]);
    await apagarTodosComprovantes();
    await enviarPendentes();
    irPara('/painel');
  }

  const diasDeAviso = [1, 3, 5, 7];
  const inicio = preferencias.inicioDoMes;

  return (
    <div className="pp-app">
      <MenuLateral />

      <main className="pp cfg">
        <div>
          <h1 className="pp__titulo">Configurações</h1>
          <p className="pp__subtitulo">Ajuste a CIFRA do seu jeito</p>
        </div>

        <div className="cfg__coluna">
          {/* ===== Perfil ===== */}
          <section className="cfg-perfil">
            <div className="cfg-perfil__foto">
              <button
                type="button"
                className="cfg-perfil__avatar"
                onClick={() => campoFoto.current?.click()}
                aria-label={temFoto ? 'Trocar a foto de perfil' : 'Colocar uma foto de perfil'}
                title={temFoto ? 'Trocar a foto de perfil' : 'Colocar uma foto de perfil'}
              >
                <Avatar nome={nome} />
                <span className="cfg-perfil__camera" aria-hidden="true">📷</span>
              </button>
              {temFoto && (
                <button type="button" className="cfg-perfil__tirar" onClick={tirarFoto}>
                  Tirar foto
                </button>
              )}
              <input ref={campoFoto} id="cfg-foto" type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={trocarFoto} />
            </div>
            <div className="cfg-perfil__textos">
              <b className="cfg-perfil__nome">{nome || 'Sem nome'}</b>
              <span className="cfg-perfil__plano">
                {textoDoPlano()} · usando a CIFRA desde {nomeDoMes(preferencias.desde).toLowerCase().replace(' ', ' de ')}
              </span>
              <div className="cfg-perfil__chips">
                <span>
                  <b>{contagem.contas}</b> {contagem.contas === 1 ? 'conta' : 'contas'}
                </span>
                <span>
                  <b>{contagem.lancamentos}</b> {contagem.lancamentos === 1 ? 'lançamento' : 'lançamentos'}
                </span>
              </div>
            </div>
            <button type="button" className="cfg-perfil__editar" onClick={abrirPerfil}>
              Editar perfil
            </button>
          </section>

          {/* ===== Minha conta ===== */}
          <Grupo titulo="Minha conta">
            <button type="button" className="cfg-linha" onClick={abrirPerfil}>
              <Linha
                Icone={IconeUsuario}
                titulo="Meus dados"
                sub={conta ? `${conta.email} · ${conta.endereco?.cidade || ''}${conta.endereco?.uf ? `/${conta.endereco.uf}` : ''}` : 'Nome e e-mail'}
              >
                <span className="cfg-linha__valor">
                  {conta ? 'Nome, e-mail e endereço' : 'Editar'}
                  <Seta />
                </span>
              </Linha>
            </button>
            {conta ? (
              <button type="button" className="cfg-linha" onClick={() => setJanela('senha')}>
                <Linha Icone={IconeCadeado} titulo="Trocar a senha" sub="Pede a senha atual">
                  <Seta />
                </Linha>
              </button>
            ) : (
              <div className="cfg-linha cfg-linha--desligada">
                <Linha Icone={IconeCadeado} titulo="Trocar a senha" sub="Disponível nas contas criadas em “Criar conta”" />
              </div>
            )}
            {conta && (
              <button type="button" className="cfg-linha" onClick={() => setJanela('2fa')}>
                <Linha
                  Icone={IconeEscudo}
                  titulo="Verificação em duas etapas"
                  sub={conta.doisFatores ? 'Ativa: a senha e um código do celular' : 'Mais proteção: pede um código do celular ao entrar'}
                >
                  <span className="cfg-linha__valor">
                    {conta.doisFatores ? 'Ativa' : 'Desativada'}
                    <Seta />
                  </span>
                </Linha>
              </button>
            )}
          </Grupo>

          {/* ===== Preferências ===== */}
          <Grupo titulo="Preferências">
            <label className="cfg-linha">
              <Linha Icone={IconeCalendario} titulo="Primeiro dia da semana" sub="Muda a ordem dos dias no calendário">
                <span className="cfg-linha__valor">
                  <select value={preferencias.primeiroDiaDaSemana} onChange={(e) => mudar('primeiroDiaDaSemana', Number(e.target.value))}>
                    <option value={0}>Domingo</option>
                    <option value={1}>Segunda</option>
                  </select>
                  <Seta />
                </span>
              </Linha>
            </label>
            <label className="cfg-linha">
              <Linha
                Icone={IconeCalendario}
                titulo="Meu mês começa no dia"
                sub={inicio === 1 ? 'Útil se o seu salário cai depois do dia 1' : `Cada mês vai do dia ${inicio} ao dia ${inicio - 1} do mês seguinte`}
              >
                <span className="cfg-linha__valor">
                  <select value={inicio} onChange={(e) => mudar('inicioDoMes', Number(e.target.value))}>
                    {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={d}>
                        Dia {d}
                      </option>
                    ))}
                  </select>
                  <Seta />
                </span>
              </Linha>
            </label>
            <label className="cfg-linha">
              <Linha
                Icone={IconeCalendario}
                titulo="Datas sazonais no calendário"
                sub="Dias com gasto a mais (Dia das Mães, Black Friday, Natal…) ficam coloridos e o mês mostra um aviso"
              >
                <Interruptor
                  rotulo="Datas sazonais no calendário"
                  ligado={preferencias.datasSazonais !== false}
                  aoMudar={(v) => mudar('datasSazonais', v)}
                />
              </Linha>
            </label>
            <label className="cfg-linha">
              <Linha Icone={IconeOlho} titulo="Esconder valores ao abrir" sub="Mostra •••• até você tocar no olho do menu">
                <Interruptor
                  rotulo="Esconder valores ao abrir"
                  ligado={preferencias.esconderValores}
                  aoMudar={(v) => mudar('esconderValores', v)}
                />
              </Linha>
            </label>
            <div className="cfg-linha">
              <Linha Icone={IconeMonitor} titulo="Tema" sub="Cores do menu e dos destaques">
                <span className="cfg-tema" role="radiogroup" aria-label="Tema">
                  {[
                    ['escuro', 'Escuro'],
                    ['claro', 'Claro'],
                  ].map(([valor, texto]) => (
                    <button
                      key={valor}
                      type="button"
                      role="radio"
                      aria-checked={(preferencias.tema || 'escuro') === valor}
                      className={(preferencias.tema || 'escuro') === valor ? 'cfg-tema__opcao cfg-tema__opcao--ativa' : 'cfg-tema__opcao'}
                      onClick={() => {
                        mudar('tema', valor);
                        aplicarTema(valor);
                      }}
                    >
                      <span className={`cfg-tema__amostra cfg-tema__amostra--${valor}`} aria-hidden="true" />
                      {texto}
                    </button>
                  ))}
                </span>
              </Linha>
            </div>
            <button type="button" className="cfg-linha" onClick={() => setJanela('fundo')}>
              <Linha Icone={IconeImagem} titulo="Fundo" sub="Cor, padrão ou uma foto sua atrás das telas">
                <span className="cfg-linha__valor">
                  <span
                    className="cfg-fundo-amostra"
                    aria-hidden="true"
                    style={
                      preferencias.fundo === 'foto' && fotoDeFundo()
                        ? { backgroundImage: `url("${fotoDeFundo()}")`, backgroundSize: 'cover', backgroundPosition: 'center' }
                        : { background: (FUNDOS.find((f) => f.id === preferencias.fundo) || FUNDOS[0]).css }
                    }
                  />
                  {preferencias.fundo === 'foto' ? 'Sua foto' : (FUNDOS.find((f) => f.id === preferencias.fundo) || FUNDOS[0]).nome}
                  <Seta />
                </span>
              </Linha>
            </button>
          </Grupo>

          {/* ===== Organização ===== */}
          <Grupo titulo="Organização">
            <button type="button" className="cfg-linha" onClick={() => setJanela('categorias')}>
              <Linha Icone={IconeEtiqueta} titulo="Categorias">
                <span className="cfg-linha__valor">
                  {carregarCategorias().length}
                  <Seta />
                </span>
              </Linha>
            </button>
            <button type="button" className="cfg-linha" onClick={() => setJanela('fixas')}>
              <Linha Icone={IconeRepetir} titulo="Contas fixas" sub="Reajustar o valor ou encerrar a partir de um mês">
                <span className="cfg-linha__valor">
                  {qtdFixas}
                  <Seta />
                </span>
              </Linha>
            </button>
            <Link to="/painel/contas" className="cfg-linha">
              <Linha Icone={IconeCarteira} titulo="Contas">
                <span className="cfg-linha__valor">
                  {contagem.contas}
                  <Seta />
                </span>
              </Linha>
            </Link>
          </Grupo>

          {/* ===== Orçamento ===== */}
          <Grupo titulo="Orçamento">
            <button type="button" className="cfg-linha" onClick={() => setJanela('orcamento')}>
              <Linha Icone={IconePlanejamento} titulo="Limite por categoria" sub="Quanto gastar por mês em cada categoria. A CIFRA sugere pelos seus gastos.">
                <span className="cfg-linha__valor">
                  {qtdOrcamentos ? `${qtdOrcamentos} ${qtdOrcamentos === 1 ? 'categoria' : 'categorias'}` : 'Definir'}
                  <Seta />
                </span>
              </Linha>
            </button>
            <label className={qtdOrcamentos ? 'cfg-linha' : 'cfg-linha cfg-linha--desligada'}>
              <Linha Icone={IconeSino} titulo="Avisar quando chegar em" sub="Porcentagem do limite que dispara o aviso (e outro aviso ao passar de 100%)">
                <span className="cfg-linha__valor">
                  <select value={preferencias.avisoOrcamento || 80} disabled={!qtdOrcamentos} onChange={(e) => mudar('avisoOrcamento', Number(e.target.value))}>
                    {AVISOS_POSSIVEIS.map((p) => (
                      <option key={p} value={p}>
                        {p}% do limite
                      </option>
                    ))}
                  </select>
                  <Seta />
                </span>
              </Linha>
            </label>
          </Grupo>

          {/* ===== Lembretes ===== */}
          <Grupo titulo="Lembretes">
            <label className="cfg-linha">
              <Linha
                Icone={IconeSino}
                titulo="Avisar contas a vencer"
                sub="Notificação 3 dias e 1 dia antes, e aviso no topo do painel"
              >
                <Interruptor
                  rotulo="Avisar contas a vencer"
                  ligado={preferencias.avisarContas}
                  aoMudar={(v) => {
                    mudar('avisarContas', v);
                    if (v) pedirPermissaoDeAviso();
                  }}
                />
              </Linha>
            </label>
            <label className={preferencias.avisarContas ? 'cfg-linha' : 'cfg-linha cfg-linha--desligada'}>
              <Linha Icone={IconeCalendario} titulo="Aviso no painel com">
                <span className="cfg-linha__valor">
                  <select
                    value={preferencias.diasDeAviso}
                    disabled={!preferencias.avisarContas}
                    onChange={(e) => mudar('diasDeAviso', Number(e.target.value))}
                  >
                    {diasDeAviso.map((d) => (
                      <option key={d} value={d}>
                        {d} {d === 1 ? 'dia' : 'dias'} de antecedência
                      </option>
                    ))}
                  </select>
                  <Seta />
                </span>
              </Linha>
            </label>
            <label className="cfg-linha">
              <Linha
                Icone={IconeWhatsApp}
                titulo="Relatório mensal pelo WhatsApp"
                sub={`No dia ${inicio} de cada mês, a CIFRA avisa que o resumo do mês anterior está pronto para enviar no WhatsApp`}
              >
                <Interruptor
                  rotulo="Relatório mensal pelo WhatsApp"
                  ligado={Boolean(preferencias.resumoMensal)}
                  aoMudar={(v) => {
                    mudar('resumoMensal', v);
                    if (v) pedirPermissaoDeAviso();
                  }}
                />
              </Linha>
            </label>
            <label className={preferencias.resumoMensal ? 'cfg-linha' : 'cfg-linha cfg-linha--desligada'}>
              <Linha Icone={IconeCelular} titulo="Número do WhatsApp" sub="Opcional. Sem número, você escolhe o contato na hora">
                <span className="cfg-linha__valor">
                  <input
                    className="cfg-linha__campo"
                    type="tel"
                    inputMode="tel"
                    placeholder="(11) 99999-9999"
                    value={preferencias.whatsapp || ''}
                    disabled={!preferencias.resumoMensal}
                    onChange={(e) => mudar('whatsapp', e.target.value)}
                  />
                </span>
              </Linha>
            </label>
            <label className="cfg-linha">
              <Linha
                Icone={IconeEnviar}
                titulo="Lembrete semanal de atualizar"
                sub="Toda segunda, um aviso para importar o extrato do banco (OFX ou CSV) em Contas"
              >
                <Interruptor
                  rotulo="Lembrete semanal de atualizar"
                  ligado={Boolean(preferencias.lembreteSemanal)}
                  aoMudar={(v) => {
                    mudar('lembreteSemanal', v);
                    if (v) pedirPermissaoDeAviso();
                  }}
                />
              </Linha>
            </label>
          </Grupo>

          {/* ===== Seus dados ===== */}
          <Grupo titulo="Seus dados">
            <button type="button" className="cfg-linha" onClick={baixarBackup}>
              <Linha Icone={IconeBaixar} titulo="Baixar backup" sub="Uma cópia dos seus dados (os comprovantes ficam de fora)">
                <span className="cfg-linha__valor">
                  arquivo .json
                  <Seta />
                </span>
              </Linha>
            </button>
            <button type="button" className="cfg-linha" onClick={() => arquivoBackup.current?.click()}>
              <Linha Icone={IconeEnviar} titulo="Restaurar backup" sub="Substitui os dados da sua conta pelos do arquivo">
                <Seta />
              </Linha>
            </button>
            <input ref={arquivoBackup} type="file" accept=".json,application/json" hidden onChange={restaurarBackup} />
          </Grupo>

          {/* ===== Sobre ===== */}
          <Grupo titulo="Sobre">
            <Link to="/planos" className="cfg-linha">
              <Linha Icone={IconeEstrela} titulo="Plano">
                <span className="cfg-linha__valor">
                  {textoDoPlano().replace('Plano ', '')}
                  <Seta />
                </span>
              </Linha>
            </Link>
            <Link to="/termos" className="cfg-linha">
              <Linha Icone={IconeInfo} titulo="Termos de uso">
                <Seta />
              </Linha>
            </Link>
            <Link to="/privacidade" className="cfg-linha">
              <Linha Icone={IconeEscudo} titulo="Política de privacidade">
                <Seta />
              </Linha>
            </Link>
            <a href={`mailto:${EMAIL_CONTATO}`} className="cfg-linha">
              <Linha Icone={IconeSino} titulo="Fale conosco">
                <span className="cfg-linha__valor">
                  <span className="cfg-linha__email">{EMAIL_CONTATO}</span>
                  <Seta />
                </span>
              </Linha>
            </a>
          </Grupo>

          {/* ===== Cuidado ===== */}
          <Grupo titulo="Cuidado">
            <button type="button" className="cfg-linha" onClick={apagarTudo}>
              <Linha Icone={IconeLixeira} titulo="Apagar todos os dados" sub="Não tem volta. Baixe um backup antes." perigo />
            </button>
            {conta ? (
              <button type="button" className="cfg-linha" onClick={() => setJanela('excluir')}>
                <Linha Icone={IconeUsuario} titulo="Excluir minha conta" sub="Apaga a conta e todos os dados dela. Não tem volta." perigo />
              </button>
            ) : (
              <div className="cfg-linha cfg-linha--desligada">
                <Linha Icone={IconeUsuario} titulo="Excluir minha conta" sub="Entre de novo para poder excluir a conta" perigo />
              </div>
            )}
          </Grupo>

          <p className="cfg__versao">CIFRA · versão {VERSAO}</p>
        </div>

        {/* Mensagem rápida */}
        <p className={mensagem ? 'cfg-mensagem cfg-mensagem--visivel' : 'cfg-mensagem'} role="status" aria-live="polite">
          {mensagem}
        </p>

        {/* ===== Janela: editar perfil ===== */}
        {janela === 'perfil' && (
          <div className="cfg-fundo" onClick={() => setJanela(null)}>
            <form
              className="cfg-janela"
              role="dialog"
              aria-modal="true"
              aria-labelledby="cfg-perfil-titulo"
              onSubmit={salvarPerfil}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="cfg-janela__topo">
                <h2 id="cfg-perfil-titulo">Editar perfil</h2>
                <button type="button" className="cfg-janela__fechar" onClick={() => setJanela(null)} aria-label="Fechar">
                  ×
                </button>
              </div>
              <label className="cfg-campo">
                Nome
                <input autoFocus value={rascunho.nome} onChange={(e) => setRascunho({ ...rascunho, nome: e.target.value })} />
                <span>É o nome do “Boa tarde, …!” no painel.</span>
              </label>
              <label className="cfg-campo">
                E-mail (opcional)
                <input
                  type="email"
                  placeholder="voce@email.com"
                  value={rascunho.email}
                  onChange={(e) => setRascunho({ ...rascunho, email: e.target.value })}
                />
                <span>Usado nos lembretes e no resumo mensal.</span>
              </label>
              <div className="cfg-janela__acoes">
                <button type="submit" className="cfg-botao cfg-botao--principal">
                  Salvar
                </button>
                <button type="button" className="cfg-botao" onClick={() => setJanela(null)}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {janela === 'fundo' && (
          <EscolherFundo atual={preferencias.fundo || 'padrao'} aoEscolher={(id) => mudar('fundo', id)} aoFechar={() => setJanela(null)} />
        )}

        {/* ===== Janelas de Minha conta ===== */}
        {janela === 'dados' && conta && <EditarDados usuario={conta} aoSalvar={dadosSalvos} aoFechar={() => setJanela(null)} />}
        {janela === 'senha' && conta && (
          <TrocarSenha
            aoFechar={() => setJanela(null)}
            aoSalvar={() => {
              setJanela(null);
              setMensagem('Senha trocada.');
            }}
          />
        )}
        {janela === 'excluir' && conta && <ExcluirConta aoFechar={() => setJanela(null)} />}
        {janela === '2fa' && conta && (
          <SegundoFator
            aoFechar={() => setJanela(null)}
            aoMudar={(ativo) => {
              setConta((atual) => ({ ...atual, doisFatores: ativo }));
              setMensagem(ativo ? 'Verificação em duas etapas ativada.' : 'Verificação em duas etapas desativada.');
            }}
          />
        )}

        {janela === 'orcamento' && (
          <OrcamentoCategorias
            aoFechar={() => setJanela(null)}
            aoSalvar={(qtd) => {
              setQtdOrcamentos(qtd);
              setJanela(null);
              setMensagem(qtd ? 'Orçamento salvo.' : 'Orçamento sem limites.');
            }}
          />
        )}
        {janela === 'fixas' && (
          <ContasFixas
            aoFechar={() => setJanela(null)}
            aoMudar={() => setQtdFixas(listarFixas(carregar()).filter((f) => !f.encerradaEm).length)}
          />
        )}

        {/* ===== Janela: categorias ===== */}
        {janela === 'categorias' && (
          <div className="cfg-fundo" onClick={() => setJanela(null)}>
            <div
              className="cfg-janela"
              role="dialog"
              aria-modal="true"
              aria-labelledby="cfg-cat-titulo"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="cfg-janela__topo">
                <h2 id="cfg-cat-titulo">Categorias</h2>
                <button type="button" className="cfg-janela__fechar" onClick={() => setJanela(null)} aria-label="Fechar">
                  ×
                </button>
              </div>
              <ul className="cfg-categorias">
                {carregarCategorias().map((c) => (
                  <li key={c.nome}>
                    <span className="cfg-categorias__icone" style={{ background: c.cor }}>
                      {c.emoji}
                    </span>
                    <span className="cfg-categorias__nome">
                      {c.nome}
                      <small>{c.tipo === 'receita' ? 'Receita' : c.tipo === 'despesa' ? 'Despesa' : 'Receita ou despesa'}</small>
                    </span>
                    <span className="cfg-categorias__qtd">
                      {contagem.porCategoria[c.nome] || 0} {contagem.porCategoria[c.nome] === 1 ? 'lançamento' : 'lançamentos'}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="cfg-janela__nota">
                Para criar ou remover categorias, use os botões “Adicionar” e “Remover” na tela de{' '}
                <Link to="/painel/lancamentos">Lançamentos</Link>.
              </p>
              <button type="button" className="cfg-botao" onClick={() => setJanela(null)}>
                Fechar
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
