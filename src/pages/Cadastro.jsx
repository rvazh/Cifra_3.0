import { useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import logoCifra from '../assets/cifra-logo.png';
import { IconeSeta, IconeCheck } from '../components/Icones.jsx';
import { iniciarSessao, irPara } from '../dados/acesso.js';
import { iniciarTeste, DIAS_DE_TESTE } from '../dados/plano.js';
import {
  ESTADOS,
  IDADE_MINIMA,
  buscarCEP,
  cpfJaUsado,
  cpfValido,
  criarUsuario,
  emailJaUsado,
  emailValido,
  mascaraCEP,
  mascaraCPF,
  regrasDaSenha,
  soNumeros,
} from '../dados/usuarios.js';
import './Entrar.css';
import './Cadastro.css';

const VAZIO = {
  nome: '',
  sobrenome: '',
  email: '',
  cpf: '',
  idade: '',
  cep: '',
  rua: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  uf: '',
  senha: '',
  confirmar: '',
  termos: false,
};

// Ordem em que os campos aparecem (para levar o cursor ao primeiro erro)
const ORDEM = ['nome', 'sobrenome', 'email', 'cpf', 'idade', 'cep', 'rua', 'numero', 'bairro', 'cidade', 'uf', 'senha', 'confirmar', 'termos'];

function IconeOlho({ aberto }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
      {!aberto && <path d="M3 3l18 18" />}
    </svg>
  );
}

// Confere tudo e devolve { campo: 'mensagem' } só com o que está errado
function conferir(f) {
  const erros = {};
  if (!f.nome.trim()) erros.nome = 'Digite o seu nome.';
  if (!f.sobrenome.trim()) erros.sobrenome = 'Digite o seu sobrenome.';
  if (!f.email.trim()) erros.email = 'Digite o seu e-mail.';
  else if (!emailValido(f.email)) erros.email = 'Este e-mail não parece certo. Ex.: nome@email.com';
  else if (emailJaUsado(f.email)) erros.email = 'Já existe uma conta com este e-mail.';
  if (!soNumeros(f.cpf)) erros.cpf = 'Digite o seu CPF.';
  else if (!cpfValido(f.cpf)) erros.cpf = 'CPF inválido. Confira os números.';
  else if (cpfJaUsado(f.cpf)) erros.cpf = 'Já existe uma conta com este CPF.';
  const idade = Number(f.idade);
  if (!f.idade) erros.idade = 'Digite a sua idade.';
  else if (!Number.isInteger(idade) || idade > 120) erros.idade = 'Idade inválida.';
  else if (idade < IDADE_MINIMA) erros.idade = `A CIFRA é para maiores de ${IDADE_MINIMA} anos.`;
  if (soNumeros(f.cep).length !== 8) erros.cep = 'O CEP tem 8 números.';
  if (!f.rua.trim()) erros.rua = 'Digite a rua.';
  if (!f.numero.trim()) erros.numero = 'Falta o número.';
  if (!f.bairro.trim()) erros.bairro = 'Digite o bairro.';
  if (!f.cidade.trim()) erros.cidade = 'Digite a cidade.';
  if (!f.uf) erros.uf = 'Escolha a UF.';
  if (!regrasDaSenha(f.senha).every((r) => r.ok)) erros.senha = 'A senha ainda não cumpre as regras abaixo.';
  if (!f.confirmar) erros.confirmar = 'Repita a senha.';
  else if (f.confirmar !== f.senha) erros.confirmar = 'As senhas não são iguais.';
  if (!f.termos) erros.termos = 'Para criar a conta, aceite os Termos de Uso e a Política de Privacidade.';
  return erros;
}

export default function Cadastro() {
  const [f, setF] = useState(VAZIO);
  const [erros, setErros] = useState({});
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [cep, setCep] = useState({ estado: 'parado', texto: '' }); // parado | buscando | achou | nao-achou
  const [enviando, setEnviando] = useState(false);
  const [erroGeral, setErroGeral] = useState('');
  const local = useLocation();
  const form = useRef(null);
  const ultimoCep = useRef('');

  function mudar(campo, valor) {
    setF((atual) => ({ ...atual, [campo]: valor }));
    if (erros[campo]) setErros((atual) => ({ ...atual, [campo]: undefined }));
    setErroGeral('');
  }

  // Com os 8 números do CEP, tenta preencher rua, bairro, cidade e estado
  async function mudarCEP(texto) {
    const valor = mascaraCEP(texto);
    mudar('cep', valor);
    const n = soNumeros(valor);
    if (n.length !== 8 || n === ultimoCep.current) return;
    ultimoCep.current = n;
    setCep({ estado: 'buscando', texto: 'Buscando o endereço…' });
    const achado = await buscarCEP(n);
    if (ultimoCep.current !== n) return; // a pessoa já mudou o CEP
    if (!achado || achado.naoExiste) {
      setCep({
        estado: 'nao-achou',
        texto: achado ? 'Não achamos este CEP. Confira os números ou preencha o endereço abaixo.' : 'Não deu para buscar o endereço agora. Preencha abaixo.',
      });
      return;
    }
    setF((atual) => ({
      ...atual,
      rua: achado.rua || atual.rua,
      bairro: achado.bairro || atual.bairro,
      cidade: achado.cidade || atual.cidade,
      uf: achado.uf || atual.uf,
    }));
    setErros((atual) => ({ ...atual, rua: undefined, bairro: undefined, cidade: undefined, uf: undefined }));
    setCep({ estado: 'achou', texto: 'Endereço encontrado. Falta só o número.' });
    form.current?.querySelector('#cad-numero')?.focus();
  }

  async function enviar(evento) {
    evento.preventDefault();
    const encontrados = conferir(f);
    setErros(encontrados);
    const primeiro = ORDEM.find((c) => encontrados[c]);
    if (primeiro) {
      form.current?.querySelector(`#cad-${primeiro}`)?.focus();
      return;
    }
    setEnviando(true);
    try {
      const pessoa = await criarUsuario({
        nome: f.nome,
        sobrenome: f.sobrenome,
        email: f.email,
        cpf: f.cpf,
        idade: f.idade,
        senha: f.senha,
        endereco: { cep: f.cep, rua: f.rua, numero: f.numero, complemento: f.complemento, bairro: f.bairro, cidade: f.cidade, uf: f.uf },
      });
      iniciarSessao(pessoa.id);
      if (local.state?.teste) iniciarTeste(); // veio do "Teste grátis"
      irPara('/painel');
    } catch (e) {
      setEnviando(false);
      setErroGeral(
        e.message === 'sem-crypto'
          ? 'Não foi possível criar a conta neste navegador. Abra o site pelo endereço com https.'
          : e.message || 'Não foi possível criar a conta. Tente de novo.'
      );
    }
  }

  // Liga o campo à sua mensagem de erro (para leitores de tela)
  const ligar = (campo) => ({
    id: `cad-${campo}`,
    'aria-invalid': erros[campo] ? 'true' : undefined,
    'aria-describedby': erros[campo] ? `cad-${campo}-erro` : undefined,
  });

  const Erro = ({ campo }) =>
    erros[campo] ? (
      <span id={`cad-${campo}-erro`} className="cad__erro">
        {erros[campo]}
      </span>
    ) : null;

  const regras = regrasDaSenha(f.senha);
  const senhasIguais = f.confirmar && f.confirmar === f.senha;

  return (
    <div className="cad">
      <header className="cad__topo">
        <Link to="/" className="entrar__voltar">
          <span className="entrar__voltar-seta">
            <IconeSeta tamanho={18} cor="#141414" espessura={2.2} />
          </span>
          Voltar para o site
        </Link>
        <p className="cad__ja">
          Já tem conta?{' '}
          <Link to="/entrar" state={local.state} className="entrar__link-forte">
            Entrar
          </Link>
        </p>
      </header>

      <form ref={form} className="cad__form" onSubmit={enviar} noValidate>
        <div className="cad__cabeca">
          <img className="cad__logo" src={logoCifra} alt="CIFRA" />
          <div>
            <h1 className="cad__titulo">Crie sua conta</h1>
            <p className="cad__sub">Leva uns 2 minutos. Depois é só entrar com o seu e-mail ou CPF.</p>
          </div>
        </div>

        {local.state?.teste && (
          <p className="entrar__teste">
            <b>Teste grátis:</b> seus {DIAS_DE_TESTE} dias do Plano Essencial começam assim que a conta for criada.
          </p>
        )}

        {/* ===== 01 Seus dados ===== */}
        <fieldset className="cad__bloco">
          <legend className="cad__legenda">
            <span className="cad__numero">01</span> Seus dados
          </legend>
          <div className="cad__grade">
            <label className="cad__campo">
              <span className="cad__rotulo">Nome</span>
              <input {...ligar('nome')} className="entrar__input" autoComplete="given-name" value={f.nome} onChange={(e) => mudar('nome', e.target.value)} />
              <Erro campo="nome" />
            </label>
            <label className="cad__campo">
              <span className="cad__rotulo">Sobrenome</span>
              <input {...ligar('sobrenome')} className="entrar__input" autoComplete="family-name" value={f.sobrenome} onChange={(e) => mudar('sobrenome', e.target.value)} />
              <Erro campo="sobrenome" />
            </label>
            <label className="cad__campo cad__campo--inteiro">
              <span className="cad__rotulo">E-mail</span>
              <input {...ligar('email')} className="entrar__input" type="email" inputMode="email" autoComplete="email" placeholder="nome@email.com" value={f.email} onChange={(e) => mudar('email', e.target.value)} />
              <Erro campo="email" />
            </label>
            <label className="cad__campo">
              <span className="cad__rotulo">CPF</span>
              <input {...ligar('cpf')} className="entrar__input" inputMode="numeric" placeholder="000.000.000-00" value={f.cpf} onChange={(e) => mudar('cpf', mascaraCPF(e.target.value))} />
              <Erro campo="cpf" />
            </label>
            <label className="cad__campo">
              <span className="cad__rotulo">Idade</span>
              <input {...ligar('idade')} className="entrar__input" inputMode="numeric" placeholder="Ex.: 28" value={f.idade} onChange={(e) => mudar('idade', soNumeros(e.target.value).slice(0, 3))} />
              <Erro campo="idade" />
            </label>
          </div>
        </fieldset>

        {/* ===== 02 Endereço ===== */}
        <fieldset className="cad__bloco">
          <legend className="cad__legenda">
            <span className="cad__numero">02</span> Endereço
          </legend>
          <div className="cad__grade cad__grade--endereco">
            <label className="cad__campo cad__campo--cep">
              <span className="cad__rotulo">CEP</span>
              <input {...ligar('cep')} className="entrar__input" inputMode="numeric" autoComplete="postal-code" placeholder="00000-000" value={f.cep} onChange={(e) => mudarCEP(e.target.value)} />
              <Erro campo="cep" />
              {!erros.cep && cep.texto && (
                <span className={`cad__dica cad__dica--${cep.estado}`} role="status">
                  {cep.texto}
                </span>
              )}
            </label>
            <label className="cad__campo cad__campo--rua">
              <span className="cad__rotulo">Rua</span>
              <input {...ligar('rua')} className="entrar__input" autoComplete="address-line1" value={f.rua} onChange={(e) => mudar('rua', e.target.value)} />
              <Erro campo="rua" />
            </label>
            <label className="cad__campo cad__campo--numero">
              <span className="cad__rotulo">Número</span>
              <input {...ligar('numero')} className="entrar__input" value={f.numero} onChange={(e) => mudar('numero', e.target.value)} />
              <Erro campo="numero" />
            </label>
            <label className="cad__campo cad__campo--dobro">
              <span className="cad__rotulo">
                Complemento <small>(opcional)</small>
              </span>
              <input id="cad-complemento" className="entrar__input" autoComplete="address-line2" placeholder="Apto, bloco, casa…" value={f.complemento} onChange={(e) => mudar('complemento', e.target.value)} />
            </label>
            <label className="cad__campo cad__campo--bairro">
              <span className="cad__rotulo">Bairro</span>
              <input {...ligar('bairro')} className="entrar__input" value={f.bairro} onChange={(e) => mudar('bairro', e.target.value)} />
              <Erro campo="bairro" />
            </label>
            <label className="cad__campo cad__campo--cidade">
              <span className="cad__rotulo">Cidade</span>
              <input {...ligar('cidade')} className="entrar__input" autoComplete="address-level2" value={f.cidade} onChange={(e) => mudar('cidade', e.target.value)} />
              <Erro campo="cidade" />
            </label>
            <label className="cad__campo cad__campo--uf">
              <span className="cad__rotulo">UF</span>
              <select {...ligar('uf')} className="entrar__input cad__select" autoComplete="address-level1" value={f.uf} onChange={(e) => mudar('uf', e.target.value)}>
                <option value="">UF</option>
                {ESTADOS.map((uf) => (
                  <option key={uf} value={uf}>
                    {uf}
                  </option>
                ))}
              </select>
              <Erro campo="uf" />
            </label>
          </div>
        </fieldset>

        {/* ===== 03 Acesso ===== */}
        <fieldset className="cad__bloco">
          <legend className="cad__legenda">
            <span className="cad__numero">03</span> Senha de acesso
          </legend>
          <div className="cad__grade">
            <label className="cad__campo">
              <span className="cad__rotulo">Criar senha</span>
              <span className="entrar__senha">
                <input
                  {...ligar('senha')}
                  className="entrar__input"
                  type={mostrarSenha ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={f.senha}
                  onChange={(e) => mudar('senha', e.target.value)}
                />
                <button
                  type="button"
                  className="entrar__olho"
                  aria-label={mostrarSenha ? 'Esconder senhas' : 'Mostrar senhas'}
                  aria-pressed={mostrarSenha}
                  onClick={() => setMostrarSenha(!mostrarSenha)}
                >
                  <IconeOlho aberto={mostrarSenha} />
                </button>
              </span>
              <Erro campo="senha" />
            </label>
            <label className="cad__campo">
              <span className="cad__rotulo">Confirmar senha</span>
              <input
                {...ligar('confirmar')}
                className="entrar__input"
                type={mostrarSenha ? 'text' : 'password'}
                autoComplete="new-password"
                value={f.confirmar}
                onChange={(e) => mudar('confirmar', e.target.value)}
              />
              <Erro campo="confirmar" />
              {!erros.confirmar && senhasIguais && <span className="cad__dica cad__dica--achou">As senhas são iguais.</span>}
            </label>
          </div>
          <ul className="cad__regras" aria-label="Regras da senha">
            {regras.map((r) => (
              <li key={r.texto} className={r.ok ? 'cad__regra cad__regra--ok' : 'cad__regra'}>
                <span className="cad__regra-bola" aria-hidden="true">
                  {r.ok && <IconeCheck tamanho={12} cor="#ffffff" espessura={3} />}
                </span>
                {r.texto}
                <span className="sr-only">{r.ok ? ' (ok)' : ' (falta)'}</span>
              </li>
            ))}
          </ul>
        </fieldset>

        <div className="cad__final">
          <label className="cad__aceite">
            <input
              id="cad-termos"
              type="checkbox"
              checked={f.termos}
              onChange={(e) => mudar('termos', e.target.checked)}
              aria-invalid={erros.termos ? 'true' : undefined}
              aria-describedby={erros.termos ? 'cad-termos-erro' : undefined}
            />
            <span>
              Li e aceito os{' '}
              <Link to="/termos" target="_blank" className="entrar__link-forte">
                Termos de Uso
              </Link>{' '}
              e a{' '}
              <Link to="/privacidade" target="_blank" className="entrar__link-forte">
                Política de Privacidade
              </Link>
              .
            </span>
          </label>
          <Erro campo="termos" />

          {erroGeral && (
            <p className="entrar__erro" role="alert">
              {erroGeral}
            </p>
          )}

          <button type="submit" className="entrar__botao cad__botao" disabled={enviando}>
            {enviando ? 'Criando a conta…' : 'Criar minha conta'}
            <IconeSeta tamanho={20} cor="#141414" espessura={2.2} />
          </button>
          <p className="cad__aviso">A sua senha é salva embaralhada (em código que não dá para desfazer) — nem a CIFRA consegue lê-la.</p>
        </div>
      </form>

      <p className="entrar__rodape cad__rodape">© 2026 CIFRA Tech Ltda.</p>
    </div>
  );
}
