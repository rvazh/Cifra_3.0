import { Link } from 'react-router-dom';
import Documento from '../components/Documento.jsx';
import { IconeCheck } from '../components/Icones.jsx';
import { EMAIL_CONTATO, EMPRESA, FORO, WHATSAPP_ATENDIMENTO } from '../config.js';
import { DIAS_DE_TESTE, PLANO_DO_TESTE } from '../dados/plano.js';

// Pontos principais, mostrados no quadro de resumo do topo
const resumo = [
  'A CIFRA é uma ferramenta para organizar as suas finanças. As decisões são sempre suas.',
  `Existe um Plano Gratuito e planos pagos. O ${PLANO_DO_TESTE} pode ser testado de graça por ${DIAS_DE_TESTE} dias.`,
  'Você pode cancelar quando quiser. Em até 15 dias da contratação, devolvemos o valor pago.',
  'Você cuida do seu e-mail e da sua senha. Nós cuidamos da plataforma.',
  'Cálculos, alertas e conteúdos da CIFRA são estimativas e informação, não consultoria financeira.',
];

// Linha com os dados da empresa (o CNPJ só aparece se estiver preenchido em config.js)
const dadosEmpresa = [EMPRESA.nome, EMPRESA.cnpj && `CNPJ ${EMPRESA.cnpj}`, EMPRESA.endereco]
  .filter(Boolean)
  .join(', ');

export default function Termos() {
  return (
    <Documento
      titulo="Termos de Uso"
      subtitulo="As regras para usar a CIFRA, em português claro."
      atualizado="20 de outubro de 2026"
    >
      <div className="doc__resumo">
        <h2 className="doc__resumo-titulo">Resumo rápido</h2>
        <ul className="doc__resumo-lista">
          {resumo.map((item) => (
            <li key={item} className="doc__resumo-item">
              <span className="doc__resumo-marca">
                <IconeCheck tamanho={12} cor="#EAAF5A" espessura={3} />
              </span>
              {item}
            </li>
          ))}
        </ul>
      </div>

      <section className="doc__secao">
        <h2>
          <span className="doc__numero">01</span> Sobre estes termos
        </h2>
        <p>
          Estes Termos de Uso valem para quem usa o site e o aplicativo da CIFRA, mantidos por{' '}
          {dadosEmpresa}.
        </p>
        <p>
          Ao criar uma conta ou usar a plataforma, você declara que leu e concorda com estes
          termos, que funcionam como um contrato de adesão. Se não concordar com alguma regra,
          não use a CIFRA.
        </p>
        <p>
          Estes termos andam junto com a nossa{' '}
          <Link to="/privacidade">Política de Privacidade</Link>, que explica como cuidamos dos
          seus dados.
        </p>
      </section>

      <section className="doc__secao">
        <h2>
          <span className="doc__numero">02</span> O que cada termo quer dizer
        </h2>
        <ul>
          <li>
            <strong>Plataforma:</strong> o site e o aplicativo da CIFRA, com todas as suas
            funções. Ela é de propriedade da {EMPRESA.nome}
          </li>
          <li>
            <strong>Usuário:</strong> você, a pessoa que usa a plataforma.
          </li>
          <li>
            <strong>Conteúdo:</strong> tudo o que você registra na CIFRA, como ganhos, gastos,
            contas, objetivos, datas e comprovantes. Esse conteúdo é seu.
          </li>
          <li>
            <strong>Planos:</strong> as opções de uso da CIFRA, gratuitas ou pagas, descritas na
            página <Link to="/planos">Planos</Link>.
          </li>
        </ul>
      </section>

      <section className="doc__secao">
        <h2>
          <span className="doc__numero">03</span> Sua conta
        </h2>
        <p>
          Para usar a CIFRA, você cria uma conta com o seu e-mail e uma senha, e confirma o e-mail
          pelo link que enviamos. A CIFRA é só para maiores de 18 anos, e as informações do
          cadastro precisam ser verdadeiras. O endereço é opcional enquanto não existir cobrança.
        </p>
        <p>
          Você pode ligar a verificação em duas etapas (código de um app autenticador) para
          proteger ainda mais a conta. Com ela ligada, o código também é pedido para trocar a senha
          e excluir a conta.
        </p>
        <p>
          Usamos o seu e-mail para mensagens do serviço, como confirmação de cadastro e troca de
          senha. Não enviamos propaganda sem a sua permissão.
        </p>
        <p>
          A CIFRA funciona no navegador (Google Chrome, Mozilla Firefox, Safari ou Microsoft Edge
          atualizados) e pode ser instalada como app no celular e no computador pelo próprio site.
          Por segurança, o login acaba quando você fecha a página ou o app, e a CIFRA pede e-mail e
          senha de novo na próxima vez. Se a internet cair com a CIFRA aberta, você continua usando, e
          o que lançar é enviado quando a conexão voltar.
        </p>
      </section>

      <section className="doc__secao">
        <h2>
          <span className="doc__numero">04</span> Planos e assinaturas
        </h2>
        <p>
          <strong>Versão de teste:</strong> enquanto a CIFRA estiver em teste, todos os recursos
          ficam liberados de graça.
        </p>
        <p>
          Depois disso, a CIFRA terá o Plano Gratuito e os planos pagos Base, Essencial e Combo. Cada
          plano tem funções e limites diferentes. Por exemplo, o acesso ao aplicativo
          “Distraction Block” faz parte apenas do Plano Combo. As funções de cada plano podem
          mudar, sempre para melhorar o serviço.
        </p>
        <ul>
          <li>
            <strong>Teste grátis:</strong> você pode testar o {PLANO_DO_TESTE} de graça por{' '}
            {DIAS_DE_TESTE} dias, uma vez por conta. Ao final, pode assinar ou continuar usando o Plano
            Gratuito, sem perder o que registrou.
          </li>
          <li>
            <strong>Uma assinatura por conta:</strong> a assinatura vale para a conta em que você
            estava conectado na hora da contratação. Se você tiver mais de uma conta, cada uma
            precisa da sua própria assinatura.
          </li>
          <li>
            <strong>Renovação automática:</strong> a assinatura é renovada ao fim de cada ciclo
            de pagamento. Se não for renovada, a conta volta para o Plano Gratuito.
          </li>
          <li>
            <strong>Preços:</strong> os valores podem mudar por causa de promoções e podem ser
            diferentes em cada plataforma. O preço sempre aparece de forma clara antes da compra.
          </li>
          <li>
            <strong>Promoções:</strong> a CIFRA pode oferecer cupons, períodos extras ou acesso
            temporário a funções. Essas ofertas valem apenas pelo tempo informado.
          </li>
          <li>
            <strong>Limites de uso:</strong> para manter a plataforma estável, cada conta pode guardar
            até 60 grupos de informações (cerca de 20 MB de dados), até 300 comprovantes (100 MB no
            total, 10 MB por arquivo) e enviar até 10 relatos de problema por dia.
          </li>
        </ul>
      </section>

      <section className="doc__secao">
        <h2>
          <span className="doc__numero">05</span> Cancelamento e reembolso
        </h2>
        <p>
          Você pode cancelar a sua assinatura quando quiser, mandando uma mensagem para{' '}
          <a href={`mailto:${EMAIL_CONTATO}`}>{EMAIL_CONTATO}</a>.
        </p>
        <ul>
          <li>
            Se o cancelamento for pedido em até 15 (quinze) dias depois da contratação, o valor
            pago é devolvido por inteiro.
          </li>
          <li>
            Depois desse prazo, o cancelamento interrompe as próximas cobranças, e você continua
            com acesso ao plano até o fim do período que já foi pago.
          </li>
        </ul>
        <p>
          Você também pode <strong>excluir a sua conta</strong> quando quiser, em Configurações →
          Cuidado → Excluir minha conta. Isso apaga o cadastro, tudo o que você registrou e os
          comprovantes, e não pode ser desfeito. Baixe um backup antes, se quiser guardar uma cópia.
        </p>
      </section>

      <section className="doc__secao">
        <h2>
          <span className="doc__numero">06</span> Responsabilidades da CIFRA
        </h2>
        <p>
          A CIFRA é uma ferramenta: ela organiza as informações que você registra, mas não
          garante resultados financeiros. As decisões sobre o seu dinheiro são sempre suas.
        </p>
        <p>
          Trabalhamos para que a plataforma funcione sem interrupções e sem erros, e para manter
          as informações protegidas. Ainda assim, nenhum sistema é perfeito, e a plataforma é
          oferecida no estado em que se encontra. Por isso, a CIFRA não se responsabiliza por:
        </p>
        <ul>
          <li>Casos fortuitos ou de força maior.</li>
          <li>Ações de terceiros que afetem a plataforma, como ataques de hackers.</li>
          <li>Informações erradas ou incompletas registradas pelos usuários.</li>
          <li>
            O conteúdo de sites e aplicativos de terceiros que tenham links na plataforma, como o
            site do Distraction Block.
          </li>
          <li>Interrupções dos serviços de internet, hospedagem e e-mail usados pela CIFRA.</li>
        </ul>
        <p>
          A CIFRA só compartilha informações com autoridades quando for obrigada por lei ou por
          decisão judicial.
        </p>
      </section>

      <section className="doc__secao">
        <h2>
          <span className="doc__numero">07</span> Cálculos, alertas e conteúdos
        </h2>
        <p>
          A Calculadora, o “Sobrará no mês”, os gráficos, os alertas, as datas sazonais, os Cursos e
          as Notícias ajudam você a se organizar, mas são <strong>estimativas e informação
          educativa</strong>: não são consultoria financeira, contábil ou de investimentos.
        </p>
        <p>
          Os resultados dependem dos números que você digita e de valores de referência (como
          alíquotas de impostos e médias de mercado) que podem mudar. Confira sempre os valores do
          seu caso antes de tomar uma decisão.
        </p>
      </section>

      <section className="doc__secao">
        <h2>
          <span className="doc__numero">08</span> Suas responsabilidades
        </h2>
        <ul>
          <li>
            Guardar o seu usuário e a sua senha em segredo. Tudo o que for feito na sua conta é
            de sua responsabilidade.
          </li>
          <li>Avisar a CIFRA na hora se perceber que alguém usou a sua conta sem permissão.</li>
          <li>
            Manter o seu celular ou computador seguro, com o sistema atualizado e, se possível,
            um antivírus.
          </li>
          <li>Usar a plataforma de acordo com a lei e com estes termos.</li>
          <li>
            Enviar como comprovante só documentos seus ou que você tem o direito de guardar, sem
            conteúdo ilegal. Se um arquivo tiver dados de outras pessoas, você é responsável por
            ter permissão para guardá-lo.
          </li>
        </ul>
      </section>

      <section className="doc__secao">
        <h2>
          <span className="doc__numero">09</span> Suspensão da conta
        </h2>
        <p>
          A CIFRA pode advertir, suspender ou cancelar uma conta, por um tempo ou de vez, em
          casos de:
        </p>
        <ul>
          <li>Suspeita de fraude ou de uso ilegal da plataforma.</li>
          <li>Informações falsas no cadastro.</li>
          <li>Atos que causem dano a outras pessoas ou à CIFRA.</li>
          <li>Descumprimento destes termos ou da Política de Privacidade.</li>
        </ul>
      </section>

      <section className="doc__secao">
        <h2>
          <span className="doc__numero">10</span> Mudanças nestes termos
        </h2>
        <p>
          Estes termos podem mudar conforme a CIFRA evolui. Quando isso acontecer, avisaremos na
          plataforma e a data de “Última atualização” no topo desta página será alterada.
        </p>
        <p>
          Se você continuar usando a CIFRA depois das mudanças, estará concordando com os novos
          termos. Se não concordar, pode cancelar a sua conta a qualquer momento.
        </p>
        <p>Se alguma regra destes termos for considerada inválida, as outras continuam valendo.</p>
      </section>

      <section className="doc__secao">
        <h2>
          <span className="doc__numero">11</span> Leis e foro
        </h2>
        <p>
          Estes termos seguem as leis do Brasil. Para resolver qualquer questão sobre eles, fica
          escolhido o foro da Comarca de {FORO}, sem prejuízo do direito do consumidor de entrar
          com uma ação na cidade onde mora.
        </p>
      </section>

      <section className="doc__secao">
        <h2>
          <span className="doc__numero">12</span> Fale com a gente
        </h2>
        <p>
          Dúvidas sobre estes termos ou sobre a plataforma? Escreva para{' '}
          <a href={`mailto:${EMAIL_CONTATO}`}>{EMAIL_CONTATO}</a>, fale pelo WhatsApp{' '}
          {WHATSAPP_ATENDIMENTO.texto} ou use o botão “Relatar problema” dentro do app. Quando
          precisarmos falar com você, faremos isso por e-mail ou dentro da própria plataforma.
        </p>
        <p>Obrigado por ler os nossos termos. Esperamos que a CIFRA ajude você a ir longe!</p>
      </section>
    </Documento>
  );
}
