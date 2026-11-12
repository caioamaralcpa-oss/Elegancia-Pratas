# Correção de enquadramento da gestão

A barra lateral agora usa 248 px expandida e 76 px recolhida. Ícones, rótulos, títulos dos grupos e controle de recolher acompanham o estado; em telas menores há menu com nomes legíveis. Foram preservadas as cores existentes.

Joias identifica cada coluna por data-column: Situação conserva largura mínima e quebra apenas entre palavras, mesmo após ordenar/ocultar colunas. Valores monetários não quebram; nome e código aparecem em linhas próprias. A rolagem fica restrita à tabela em desktop; abaixo de 1100 px a apresentação usa os cartões existentes. Espaçamentos e limites do conteúdo são compartilhados entre as páginas.

Validação: 30/30 cenários de layout em fixture HTML com os CSS reais e dados sintéticos, em 1900/1440/1100/768/390 px, menu expandido/recolhido e três configurações de colunas. Nenhum transbordamento da página; menor largura medida do badge de situação 143,33 px, altura máxima 33,27 px. Isso não equivale a uma sessão autenticada de produção.

Instalação limpa na nuvem: npm ci --ignore-scripts e 28/28 testes aprovados, zero falhas. Prévia Vercel READY, build em 30 s com verificação de tipos/lint; os avisos existentes de imagens públicas não foram alterados. Sem alterações de dependências, dados, fórmulas, funções de gravação/validação ou diretórios protegidos. Nenhum código foi gravado na máquina do usuário.

Para validar: abrir Joias, expandir/recolher o menu, reordenar e ocultar colunas, alternar densidade e testar a tela no celular. Não é necessário enviar formulários. Os cenários sintéticos não incluem todos os dados possíveis; conferir também com a conta do usuário.

[Evidência](quality/layout-fix.json).
