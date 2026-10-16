import { Link } from 'react-router-dom';
import Documento from '../components/Documento.jsx';
import { EMAIL_CONTATO, EMPRESA, FORO } from '../config.js';

export default function Privacidade() {
  return (
    <Documento
      titulo="Política de Privacidade"
      subtitulo="Seus dados são seus. Sem letra miúda."
      atualizado="9 de outubro de 2026"
    >
      <section className="doc__secao">
        <h2>
          <span className="doc__numero">01</span> Política de Privacidade
        </h2>
        <p>
          Com este documento, garantimos que as informações dos nossos usuários não serão
          vendidas nem divulgadas em nenhuma circunstância. Seguimos as práticas de segurança
          recomendadas e fazemos tudo o que está ao nosso alcance para proteger esses dados.
        </p>
        <p>
          As suas informações são guardadas e usadas de acordo com a legislação brasileira,
          principalmente o Marco Civil da Internet (Lei nº 12.965/2014), o Decreto nº 8.771, de
          11 de maio de 2016, e a Lei Geral de Proteção de Dados (Lei nº 13.709/2018).
        </p>
        <p>
          Nesta versão, os seus lançamentos ficam salvos no seu próprio aparelho e não são
          enviados para servidores da CIFRA. Por isso, se você limpar os dados do navegador ou
          trocar de aparelho, as informações podem ser perdidas. Se um dia os dados passarem a ser
          guardados em servidores, esta política será atualizada para explicar onde e como eles
          ficam protegidos.
        </p>
        <p>
          Esta política pode mudar conforme a CIFRA evolui. Quando isso acontecer, a data de
          “Última atualização” no topo desta página será alterada e, se a mudança for importante,
          avisaremos na plataforma.
        </p>
        <p>
          Os elementos e as ferramentas do site e do aplicativo pertencem à {EMPRESA.nome} ou são
          licenciados por ela, nos termos da lei. Eles só podem ser usados fora da CIFRA com a
          nossa autorização por escrito.
        </p>
      </section>

      <section className="doc__secao">
        <h2>
          <span className="doc__numero">02</span> Disposições finais
        </h2>
        <p>
          Esta Política de Privacidade segue as leis brasileiras. Qualquer questão sobre ela ou
          sobre o uso do site será resolvida no foro da Comarca de {FORO}, sem prejuízo do direito
          do consumidor de entrar com uma ação na cidade onde mora.
        </p>
        <p>
          Se em algum momento não exigirmos o cumprimento de alguma regra, isso não significa que
          abrimos mão dela. E, se algum item desta política for considerado inválido, os outros
          continuam valendo.
        </p>
        <p>
          Esta política anda junto com os nossos <Link to="/termos">Termos de Uso</Link>.
        </p>
      </section>

      <section className="doc__secao">
        <h2>
          <span className="doc__numero">03</span> Sobre a Lei Geral de Proteção de Dados
        </h2>
        <p>
          A CIFRA valoriza a simplicidade, a transparência e a privacidade de quem usa a
          plataforma. Para criar a sua conta, pedimos: nome e sobrenome, e-mail, CPF, idade,
          endereço e uma senha. O e-mail ou o CPF servem para você entrar na conta; o CPF e a idade
          servem para confirmar que a conta é de uma pessoa real e maior de idade; o endereço é
          usado para a cobrança dos planos pagos. A sua senha nunca é guardada como você a digitou:
          ela é salva embaralhada, de um jeito que não dá para desfazer. Não pedimos senhas de
          banco nem fotos de documentos.
        </p>
        <p>
          As informações financeiras que você registra, como ganhos, gastos e outros lançamentos,
          servem apenas para que as funções do aplicativo funcionem e para que você acompanhe a
          sua vida financeira.
        </p>
        <p>
          Os dados usados pela CIFRA servem para manter a plataforma funcionando, cuidar da sua
          conta, prestar os serviços contratados e melhorar a sua experiência, sempre respeitando
          os seus direitos previstos na LGPD.
        </p>
        <p>
          Você pode, a qualquer momento, pedir para ver, corrigir ou apagar os seus dados, ou
          excluir a sua conta. É só escrever para{' '}
          <a href={`mailto:${EMAIL_CONTATO}`}>{EMAIL_CONTATO}</a>. Os dados serão apagados ou
          anonimizados, respeitando apenas o que a lei obriga a guardar.
        </p>
      </section>
    </Documento>
  );
}
