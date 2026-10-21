import { Link } from 'react-router-dom';
import Documento from '../components/Documento.jsx';
import { EMAIL_CONTATO, EMPRESA, FORO } from '../config.js';

// Linha com os dados de quem cuida dos dados (o CNPJ só aparece se estiver preenchido em config.js)
const controlador = [EMPRESA.nome, EMPRESA.cnpj && `CNPJ ${EMPRESA.cnpj}`, EMPRESA.endereco].filter(Boolean).join(', ');

const Email = () => <a href={`mailto:${EMAIL_CONTATO}`}>{EMAIL_CONTATO}</a>;

export default function Privacidade() {
  return (
    <Documento
      titulo="Política de Privacidade"
      subtitulo="Seus dados são seus. Sem letra miúda."
      atualizado="20 de outubro de 2026"
    >
      <section className="doc__secao">
        <h2>
          <span className="doc__numero">01</span> Quem cuida dos seus dados
        </h2>
        <p>
          A responsável pelos dados tratados na CIFRA (a “controladora”, nas palavras da Lei Geral de Proteção de
          Dados, Lei nº 13.709/2018) é {controlador}.
        </p>
        <p>
          Os seus dados não são vendidos, alugados nem usados para propaganda. Eles servem só para a CIFRA funcionar
          para você. Esta política segue a LGPD, o Marco Civil da Internet (Lei nº 12.965/2014) e o Decreto nº
          8.771/2016.
        </p>
        <p>
          <strong>Canal para assuntos de dados pessoais:</strong> <Email />. Como agente de tratamento de pequeno
          porte, a CIFRA não é obrigada a indicar um encarregado (Resolução CD/ANPD nº 2/2022), mas mantém este canal
          para atender você.
        </p>
      </section>

      <section className="doc__secao">
        <h2>
          <span className="doc__numero">02</span> Quais dados guardamos
        </h2>
        <ul>
          <li>
            <strong>Cadastro:</strong> nome, sobrenome, e-mail, idade e senha. O endereço é opcional. Não pedimos CPF,
            senhas de banco nem fotos de documentos.
          </li>
          <li>
            <strong>Senha:</strong> nunca é guardada como você digitou. Ela é salva embaralhada, de um jeito que não dá
            para desfazer.
          </li>
          <li>
            <strong>O que você registra no app:</strong> contas, lançamentos, categorias, orçamentos, objetivos, valores
            de “A receber” e “A pagar”, datas especiais do calendário, simulações da Calculadora e as suas preferências
            (como tema, foto de perfil, foto de fundo e, se você quiser, o número de WhatsApp para enviar o resumo do mês).
          </li>
          <li>
            <strong>Comprovantes:</strong> as fotos e os PDFs que você envia. Eles podem conter dados de outras pessoas
            (como o nome de quem recebeu um pagamento); envie só documentos que você tem o direito de guardar.
          </li>
          <li>
            <strong>Verificação em duas etapas (opcional):</strong> o vínculo com o seu app autenticador. Não temos
            acesso ao seu celular nem ao app.
          </li>
          <li>
            <strong>Relatos de problema:</strong> a mensagem que você escreve, a tela em que estava, o tipo de aparelho e
            navegador e, se você quiser, um contato.
          </li>
          <li>
            <strong>Registros técnicos:</strong> endereço IP, data e hora de acesso, gerados automaticamente pelos
            serviços que hospedam a CIFRA.
          </li>
        </ul>
        <p>
          A CIFRA não pede dados sensíveis (como saúde, religião ou opinião política). Se você escrever algo assim num
          lançamento, essa informação é usada só para mostrar os seus próprios registros.
        </p>
      </section>

      <section className="doc__secao">
        <h2>
          <span className="doc__numero">03</span> Para que usamos e com qual base legal
        </h2>
        <ul>
          <li>
            <strong>Criar e manter a sua conta, entrar com segurança e fazer o app funcionar</strong> (lançamentos,
            gráficos, calendário, alertas, comprovantes, sincronização entre aparelhos): execução do contrato com você
            (art. 7º, V, da LGPD).
          </li>
          <li>
            <strong>Enviar e-mails do serviço</strong> (confirmação de cadastro, troca de senha e de e-mail): execução do
            contrato.
          </li>
          <li>
            <strong>Conferir a idade</strong>: a CIFRA é só para maiores de 18 anos.
          </li>
          <li>
            <strong>Endereço (opcional)</strong>: só será usado para a cobrança de planos pagos, quando ela existir.
          </li>
          <li>
            <strong>Segurança, prevenção de fraudes, resposta aos relatos e melhorias no app</strong>: legítimo
            interesse (art. 7º, IX), sempre respeitando os seus direitos.
          </li>
          <li>
            <strong>Cumprir a lei ou ordem judicial</strong>, quando for o caso (art. 7º, II e VI).
          </li>
        </ul>
      </section>

      <section className="doc__secao">
        <h2>
          <span className="doc__numero">04</span> Onde ficam e com quem compartilhamos
        </h2>
        <p>A CIFRA usa estes serviços para funcionar. Eles só recebem o necessário para fazer a sua parte:</p>
        <ul>
          <li>
            <strong>Supabase</strong> (login, banco de dados e arquivos dos comprovantes): servidores nos Estados Unidos.
          </li>
          <li>
            <strong>Vercel</strong> (hospedagem do site): servidores nos Estados Unidos.
          </li>
          <li>
            <strong>Brevo</strong> (envio dos e-mails de confirmação e troca de senha): recebe o seu e-mail e o seu nome;
            servidores na Europa.
          </li>
          <li>
            <strong>ViaCEP</strong> (preenche o endereço pelo CEP no cadastro): recebe só o CEP digitado.
          </li>
          <li>
            <strong>Google Fonts</strong> (a fonte das letras do site): recebe o endereço IP de quem abre o site.
          </li>
        </ul>
        <p>
          Como alguns desses serviços ficam fora do Brasil, existe transferência internacional de dados. Ela é feita
          porque é necessária para cumprir o contrato com você (art. 33, IX, da LGPD), com fornecedores que adotam
          padrões de proteção de dados reconhecidos, como o europeu (GDPR).
        </p>
        <p>
          Não compartilhamos dados com mais ninguém, a não ser quando a lei ou uma decisão judicial obrigar.
        </p>
      </section>

      <section className="doc__secao">
        <h2>
          <span className="doc__numero">05</span> Cookies e armazenamento no aparelho
        </h2>
        <p>
          A CIFRA não usa cookies de propaganda nem ferramentas de rastreamento. Enquanto você está logado, ela guarda
          uma cópia dos seus dados no navegador, para ficar rápida e continuar funcionando se a internet cair. O login
          fica só na aba aberta e acaba quando você fecha a página ou o app; ao abrir de novo sem login, essa cópia é
          apagada (o que ainda não foi enviado para a nuvem fica guardado até você entrar de novo). O app instalado
          (PWA) também guarda os arquivos do site, como imagens e códigos, para abrir mais rápido.
        </p>
      </section>

      <section className="doc__secao">
        <h2>
          <span className="doc__numero">06</span> Por quanto tempo guardamos
        </h2>
        <ul>
          <li>Os seus dados ficam guardados enquanto a sua conta existir.</li>
          <li>
            Ao excluir a conta (em Configurações → Cuidado → Excluir minha conta), apagamos na hora o cadastro, tudo o que você registrou,
            os comprovantes e os relatos que você enviou. Isso não pode ser desfeito.
          </li>
          <li>
            Os registros técnicos e os registros de envio de e-mail ficam com os serviços da seção 04 pelo tempo que
            eles definem, e podemos guardá-los pelo prazo que a lei exigir.
          </li>
        </ul>
      </section>

      <section className="doc__secao">
        <h2>
          <span className="doc__numero">07</span> Como protegemos
        </h2>
        <ul>
          <li>Cada conta só consegue ler e alterar as próprias informações. Essa regra fica no banco de dados.</li>
          <li>Conexão sempre segura (HTTPS) e senhas guardadas embaralhadas.</li>
          <li>Verificação em duas etapas opcional, pedida também para trocar a senha e excluir a conta.</li>
          <li>Limites por conta para evitar abusos.</li>
        </ul>
        <p>
          Nenhum sistema é perfeito. Se acontecer um incidente de segurança que possa trazer risco ou dano a você,
          avisaremos você e a Autoridade Nacional de Proteção de Dados (ANPD), como manda o art. 48 da LGPD.
        </p>
      </section>

      <section className="doc__secao">
        <h2>
          <span className="doc__numero">08</span> Seus direitos
        </h2>
        <p>Pela LGPD (art. 18), você pode, a qualquer momento:</p>
        <ul>
          <li>Confirmar se tratamos os seus dados e ter acesso a eles.</li>
          <li>Corrigir dados incompletos, errados ou desatualizados.</li>
          <li>Pedir a anonimização, o bloqueio ou a eliminação de dados desnecessários.</li>
          <li>Levar os seus dados para outro serviço (portabilidade).</li>
          <li>Apagar os seus dados e saber com quem eles foram compartilhados.</li>
          <li>Revogar um consentimento e reclamar na ANPD.</li>
        </ul>
        <p>
          Muita coisa você faz sozinho no app: ver e corrigir o cadastro em <strong>Configurações → Minha conta → Meus dados</strong>,
          baixar uma cópia dos seus dados em <strong>Configurações → Seus dados → Baixar backup</strong> e excluir a conta em{' '}
          <strong>Configurações → Cuidado</strong>. Para o resto, escreva
          para <Email />. Respondemos em até 15 dias.
        </p>
      </section>

      <section className="doc__secao">
        <h2>
          <span className="doc__numero">09</span> Menores de idade
        </h2>
        <p>A CIFRA é só para maiores de 18 anos. O cadastro não aceita idade menor que essa.</p>
      </section>

      <section className="doc__secao">
        <h2>
          <span className="doc__numero">10</span> Mudanças nesta política
        </h2>
        <p>
          Esta política muda conforme a CIFRA evolui. Quando isso acontecer, a data de “Última atualização” no topo
          será alterada e, se a mudança for importante, avisaremos na plataforma.
        </p>
      </section>

      <section className="doc__secao">
        <h2>
          <span className="doc__numero">11</span> Leis e foro
        </h2>
        <p>
          Esta política segue as leis brasileiras. Qualquer questão sobre ela será resolvida no foro da Comarca de{' '}
          {FORO}, sem prejuízo do direito do consumidor de entrar com uma ação na cidade onde mora. Se algum item for
          considerado inválido, os outros continuam valendo.
        </p>
        <p>
          Esta política anda junto com os nossos <Link to="/termos">Termos de Uso</Link>.
        </p>
      </section>
    </Documento>
  );
}
