# Restaurant Flow System

Sistema em desenvolvimento para simular um fluxo digital de restaurante, com experiencia mobile para o cliente e painel web administrativo para a operacao.

> Status: em desenvolvimento. A versao atual usa dados locais/mockados e nao processa pagamentos reais.

## Visao Geral

O Restaurant Flow System nasceu como um app mobile-first para simular a jornada de pedido em um restaurante: o cliente acessa o cardapio, filtra itens, monta o carrinho e finaliza o pedido em um checkout demonstrativo.

A estrutura atual tambem inclui um dashboard administrativo web para acompanhar pedidos mockados e gerenciar itens do cardapio localmente.

## Estrutura do Projeto

```text
restaurant-system/
|-- cliente/      # App mobile Expo/React Native
`-- dashboard/    # Painel administrativo React/Vite
```

## Funcionalidades Atuais

### Cliente Mobile

- Login e cadastro simulados.
- Credenciais de teste com preenchimento automatico.
- Botao de autenticacao com Google preparado para integracao futura.
- Cardapio com categorias, busca por texto e filtros.
- Ordenacao por popularidade ou preco.
- Carrinho global com controle de quantidade, subtotal e total.
- Tela de carrinho vazio e retorno ao cardapio.
- Checkout simulado com PIX e cartao.
- Copia de codigo PIX demonstrativo.
- Tema visual escuro com imagens locais dos produtos.

### Dashboard Administrativo

- Login administrativo simulado.
- Fila de pedidos mockados.
- Avanco de status dos pedidos: novo, em preparo e pronto.
- Lista de itens do cardapio.
- Criacao, edicao e remocao local de itens.
- Cadastro de preco, categoria, descricao, imagem e desconto.

## Tecnologias

### Cliente

- React Native
- Expo
- Expo Router
- TypeScript
- React Context API
- React Native SVG

### Dashboard

- React
- Vite
- TypeScript
- React Router DOM
- Lucide React

## Como Rodar

### Cliente Mobile

```bash
cd cliente
npm install
npm run start
```

Depois, use o Expo para abrir no Android, iOS ou Web.

Comandos uteis:

```bash
npm run android
npm run ios
npm run web
npm run lint
```

### Dashboard Web

```bash
cd dashboard
npm install
npm run dev
```

Para gerar build de producao:

```bash
npm run build
```

## Credenciais de Teste

### Cliente

```text
E-mail: email@email.com
Senha: 123456
```

### Admin

```text
E-mail: admin@restaurante.com
Senha: admin123
```

## Observacoes Importantes

- Autenticacao, pedidos, cardapio e pagamentos ainda sao simulados.
- O checkout nao envia dados reais e nao processa pagamentos reais.
- O dashboard usa estado local no navegador durante a sessao.
- Ainda nao ha backend, banco de dados ou sincronizacao real entre cliente e admin.

## Roadmap

- Integrar backend e banco de dados.
- Sincronizar pedidos entre app mobile e dashboard.
- Persistir usuarios, cardapio e carrinho.
- Adicionar acompanhamento real de status do pedido.
- Implementar autenticacao real.
- Integrar pagamento real.
- Criar testes automatizados.
- Refinar responsividade e acessibilidade.

## Autor

**Ezequiel Borges**

- GitHub: [kiellzz](https://github.com/kiellzz)
- LinkedIn: [ezequielborgesdev](https://www.linkedin.com/in/ezequielborgesdev)
