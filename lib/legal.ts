// RASCUNHOS JURÍDICOS: exigem revisão de advogado antes da publicação.
export type LegalSection = { title: string; paragraphs: string[] };
export type LegalDocument = { title: string; updated: string; sections: LegalSection[] };

export const legalDocuments: Record<string, LegalDocument> = {
  privacidade: {
    title: 'Política de Privacidade', updated: '[DATA DA ÚLTIMA REVISÃO]', sections: [
      { title: 'Quem trata seus dados', paragraphs: ['A loja [RAZÃO SOCIAL], CNPJ [CNPJ], com sede em [ENDEREÇO COMPLETO], é responsável pelo tratamento dos dados descritos nesta política. Contato do encarregado: [E-MAIL DO ENCARREGADO].'] },
      { title: 'Dados, finalidades e bases legais', paragraphs: ['Coletamos nome, e-mail, telefone e endereço para processar a compra, entregar os produtos e prestar atendimento. A base legal aplicável à execução do contrato e às obrigações legais deve ser confirmada na revisão jurídica. CPF somente será solicitado quando necessário para emissão fiscal ou prevenção a fraude, conforme avaliação documentada.', 'Dados de navegação para analytics e marketing só serão tratados após consentimento específico, quando essas ferramentas forem ativadas. O consentimento poderá ser revogado.'] },
      { title: 'Compartilhamento', paragraphs: ['Os dados necessários à compra e entrega poderão ser compartilhados com Mercado Pago, Melhor Envio, transportadoras e [PROVEDOR DE E-MAIL]. Cada compartilhamento deverá ser limitado à sua finalidade.'] },
      { title: 'Guarda, segurança e seus direitos', paragraphs: ['Conservaremos dados pelo período necessário às finalidades informadas e às obrigações legais, conforme a tabela de retenção [PRAZOS A DEFINIR]. Você pode solicitar acesso, correção, portabilidade quando aplicável, informação sobre compartilhamento, revogação de consentimento e exclusão quando cabível pelo canal [E-MAIL DE PRIVACIDADE]. Confirmaremos sua identidade antes de atender solicitações sensíveis.'] },
    ],
  },
  termos: {
    title: 'Termos e Condições de Venda', updated: '[DATA DA ÚLTIMA REVISÃO]', sections: [
      { title: 'Identificação da loja', paragraphs: ['[RAZÃO SOCIAL], CNPJ [CNPJ], [ENDEREÇO COMPLETO], contato [E-MAIL DE ATENDIMENTO] e [TELEFONE/WHATSAPP].'] },
      { title: 'Produtos e pedido', paragraphs: ['Antes de concluir a compra, o site deverá informar material, medidas, preço, frete, prazo e condições de pagamento. A confirmação do pedido e o pagamento serão comunicados por e-mail. Características de pedras e metais devem corresponder à descrição comprovável de cada peça.'] },
      { title: 'Entrega e atendimento', paragraphs: ['O prazo estimado de entrega será informado antes do pagamento, incluindo [PRAZO DE MANUSEIO]. Dúvidas e problemas podem ser comunicados por [CANAL DE ATENDIMENTO], com resposta em [PRAZO DE RESPOSTA].'] },
      { title: 'Direitos do consumidor', paragraphs: ['Estes termos não excluem direitos assegurados pelo Código de Defesa do Consumidor. O tratamento de peças personalizadas, ajustes e garantias específicas depende de revisão jurídica.'] },
    ],
  },
  trocas: {
    title: 'Trocas, Devoluções e Arrependimento', updated: '[DATA DA ÚLTIMA REVISÃO]', sections: [
      { title: 'Arrependimento', paragraphs: ['Em compras realizadas fora do estabelecimento, o consumidor pode exercer o direito de arrependimento no prazo de 7 dias, observado o Código de Defesa do Consumidor. Solicite pelo canal [E-MAIL DE ATENDIMENTO] ou pelo fluxo online [LINK A IMPLEMENTAR]. Informaremos as instruções de devolução e estorno.'] },
      { title: 'Defeito e troca', paragraphs: ['Se a peça apresentar defeito, entre em contato por [CANAL DE ATENDIMENTO] com o número do pedido e uma descrição do problema. A análise e solução respeitarão os direitos legais do consumidor. Os prazos e procedimentos específicos devem ser revisados por advogado.'] },
      { title: 'Peças personalizadas', paragraphs: ['As condições para peças sob encomenda, personalizadas ou ajustadas serão informadas na página do produto e revisadas juridicamente antes da venda.'] },
    ],
  },
  cuidados: {
    title: 'Cuidados com as Joias', updated: '[DATA DA ÚLTIMA REVISÃO]', sections: [
      { title: 'Conservação', paragraphs: ['Guarde cada peça separadamente, em local seco. Evite contato com produtos químicos e impactos. As recomendações específicas de limpeza e manutenção dependem do material e das pedras de cada produto.'] },
      { title: 'Materiais e garantia', paragraphs: ['Cada produto deverá indicar se é prata 925, ouro 18k, folheado ou outro material, bem como se a pedra é natural ou sintética. Não faça alegações de teor, procedência ou garantia sem documentação de suporte. A política de garantia será publicada após definição de [PRAZO E CONDIÇÕES DE GARANTIA].'] },
    ],
  },
  contato: {
    title: 'Contato e Atendimento', updated: '[DATA DA ÚLTIMA REVISÃO]', sections: [
      { title: 'Fale com a loja', paragraphs: ['E-mail: [E-MAIL DE ATENDIMENTO]. WhatsApp/telefone: [NÚMERO]. Endereço: [ENDEREÇO COMPLETO]. Horário de atendimento: [HORÁRIO]. Prazo de resposta: [PRAZO DE RESPOSTA].'] },
      { title: 'Privacidade', paragraphs: ['Para exercer direitos sobre seus dados pessoais, escreva para [E-MAIL DE PRIVACIDADE]. Não envie senhas ou números completos de cartão.'] },
    ],
  },
  sobre: {
    title: 'Quem Somos', updated: '[DATA DA ÚLTIMA REVISÃO]', sections: [
      { title: 'Elegância Pratas', paragraphs: ['[TEXTO REAL SOBRE A MARCA, SUA HISTÓRIA E ORIGEM DAS PEÇAS]. Razão social: [RAZÃO SOCIAL]. CNPJ: [CNPJ]. Endereço físico: [ENDEREÇO COMPLETO]. Endereço eletrônico: [E-MAIL DE ATENDIMENTO].'] },
    ],
  },
};
