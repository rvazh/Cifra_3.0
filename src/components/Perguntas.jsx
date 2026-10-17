import { useState } from 'react';
import { Link } from 'react-router-dom';
import { IconeMais } from './Icones.jsx';
import { EMAIL_CONTATO } from '../config.js';
import fotoPerguntas from '../assets/perguntas-foto.webp';
import './Perguntas.css';

const perguntas = [
  {
    pergunta: 'O que é a CIFRA?',
    resposta:
      'A CIFRA é um app de gestão financeira pessoal. Com ela você registra receitas e despesas, acompanha o saldo das suas contas e cartões e entende para onde vai o seu dinheiro.',
  },
  {
    pergunta: 'Posso usar a CIFRA no celular e no computador?',
    resposta:
      'Sim. A CIFRA funciona direto no navegador, tanto no celular quanto no computador, sem precisar instalar nada. O app para celular está a caminho.',
  },
  {
    pergunta: 'Meus dados estão seguros?',
    resposta:
      'Seus dados ficam guardados no próprio aparelho que você usa e não são enviados para servidores da CIFRA. Por isso, se você limpar os dados do navegador ou trocar de aparelho, o histórico pode ser perdido.',
  },
  {
    pergunta: 'A CIFRA coleta dados financeiros para vender?',
    resposta:
      'Não. Suas informações financeiras são suas e não são vendidas nem compartilhadas com ninguém.',
  },
  {
    pergunta: 'Quanto custa a CIFRA?',
    resposta:
      'Durante a versão de teste, a CIFRA é gratuita e todos os recursos ficam liberados. Depois, você poderá continuar no Plano Gratuito ou escolher um plano pago na página Planos.',
  },
  {
    pergunta: 'A CIFRA se conecta com o meu banco?',
    resposta:
      'Não. Você registra os seus lançamentos no app, sem precisar informar senhas ou dados de acesso do seu banco.',
  },
  {
    pergunta: 'Como entro em contato com a equipe da CIFRA?',
    resposta: `Mande um e-mail para ${EMAIL_CONTATO}. Respondemos o mais rápido possível.`,
  },
];

export default function Perguntas() {
  // Guarda qual pergunta está aberta (null = todas fechadas)
  const [aberta, setAberta] = useState(null);

  function alternar(indice) {
    setAberta(aberta === indice ? null : indice);
  }

  return (
    <section className="faq">
      <div className="container faq__conteudo">
        <div className="faq__cabecalho">
          <span className="faq__rotulo">Dúvidas</span>
          <h2 className="faq__titulo">Perguntas frequentes</h2>
        </div>

        <div className="faq__corpo">
          <div className="faq__coluna">
        <div className="faq__lista">
          {perguntas.map((item, indice) => {
            const estaAberta = aberta === indice;
            return (
              <div key={item.pergunta} className={estaAberta ? 'faq-item faq-item--aberta' : 'faq-item'}>
                <button
                  type="button"
                  className="faq-item__pergunta"
                  aria-expanded={estaAberta}
                  aria-controls={`resposta-${indice}`}
                  onClick={() => alternar(indice)}
                >
                  {item.pergunta}
                  <span className="faq-item__icone">
                    <IconeMais tamanho={18} cor="currentColor" espessura={2.2} />
                  </span>
                </button>
                {estaAberta && (
                  <p id={`resposta-${indice}`} className="faq-item__resposta">
                    {item.resposta}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <div className="faq__ajuda">
          <div className="faq__ajuda-textos">
            <h3 className="faq__ajuda-titulo">Ainda com dúvidas?</h3>
            <p className="faq__ajuda-texto">
              Se restou alguma dúvida, entre em contato pelos nossos canais de comunicação. A CIFRA
              vai te ajudar ao máximo com o seu planejamento!
            </p>
          </div>
          <Link to="/quem-somos" className="faq__ajuda-botao">
            Fale conosco
          </Link>
        </div>
          </div>

          {/* Foto ao lado direito das perguntas */}
          <figure className="faq__foto">
            <img src={fotoPerguntas} alt="Mulher sorrindo enquanto usa o celular" width="736" height="1308" loading="lazy" />
          </figure>
        </div>
      </div>
    </section>
  );
}
