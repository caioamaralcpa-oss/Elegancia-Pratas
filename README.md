# Elegância Pratas

Base inicial da loja online. O código fica no GitHub; catálogo, pedidos, imagens e pagamentos de produção serão conectados a serviços gerenciados na nuvem.

## Executar

```sh
python3 -m http.server 8000
```

Abra `http://localhost:8000`. O catálogo está em `catalogo.json`. Cadastre somente produtos reais, com preço, estoque, foto, peso e dimensões verificados.

## Próximas integrações

- Banco e armazenamento gerenciados para catálogo, imagens, estoque e pedidos.
- Cálculo de frete por CEP e geração de etiquetas.
- Checkout hospedado e webhooks de confirmação de pagamento.
- Painel administrativo com autenticação.

Não coloque chaves secretas no repositório nem considere um pedido pago antes da confirmação do provedor.
