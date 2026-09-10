# Restaurant Flow System

![React](https://img.shields.io/badge/React-19-20232A?logo=react&logoColor=61DAFB)
![React Native](https://img.shields.io/badge/React_Native-0.81-20232A?logo=react&logoColor=61DAFB)
![Expo](https://img.shields.io/badge/Expo-54-000020?logo=expo&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-4-000000?logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?logo=mongodb&logoColor=white)
![Mongoose](https://img.shields.io/badge/Mongoose-8-880000?logo=mongoose&logoColor=white)

Simulação completa de um fluxo de atendimento em restaurante, com aplicativo para o cliente, painel da equipe e API compartilhada. O cliente escolhe a mesa, personaliza produtos, finaliza o pedido e acompanha cada etapa; administradores e funcionários operam a fila conforme as permissões de seus perfis.

> Projeto em desenvolvimento para demonstração e portfólio. Cardápio e pedidos são persistidos no MongoDB e sincronizados em tempo real. Autenticação e pagamentos são simulados, sem cobrança real.

## Visão do projeto

| Cardápio do cliente | Carrinho |
| :---: | :---: |
| <img src="media/cardapiomedia.png" alt="Cardápio do cliente com categorias e produtos" width="320" /> | <img src="media/carrinhomedia.png" alt="Carrinho do cliente com item, quantidade e total" width="320" /> |

### Dashboard da equipe

![Dashboard da equipe com indicadores e fila de pedidos](media/dashboardmedia.png)

## Funcionalidades

### Aplicativo do cliente

- Login e cadastro simulados, com credenciais de demonstração.
- Seleção de mesa e identificação do cliente no pedido.
- Cardápio com busca, categorias, faixa de preço e ordenação por preço.
- Produtos simples ou com acompanhamentos, sabores e tamanhos, incluindo opções obrigatórias e adicionais pagos.
- Carrinho com quantidades, observações, opções selecionadas, subtotais e total.
- Recuperação local da sessão de demonstração, mesa e carrinho ao reabrir o app, com conferência de preços, opções e disponibilidade.
- Checkout demonstrativo com PIX ou cartão e cópia do código PIX de exemplo.
- Acompanhamento dos pedidos em tempo real, com pedidos ativos em destaque e histórico recolhido.
- Histórico das etapas com data e horário de recebimento, início do preparo, pedido pronto e entrega, disponível nos detalhes do cliente e da equipe.
- Confirmação de recebimento ou registro de “Não recebi”, com exibição da solução registrada pela equipe.
- Cancelamento direto pelo cliente antes do preparo, sem justificativa. Durante o preparo, o cliente envia uma solicitação explicada para aprovação da equipe; pedidos prontos ou entregues não podem mais ser cancelados pelo cliente. A equipe sempre informa um motivo ao cancelar.
- Interface escura adaptada para dispositivos móveis, também acessível pela web.

### Painel da equipe

- Login simulado com perfis de administrador e funcionário.
- O administrador acessa a fila, o cardápio e o reset da demonstração. O funcionário acessa somente as funções da fila de pedidos.
- Fila de atendimento com indicadores por etapa e prioridade para ocorrências e solicitações de cancelamento.
- Avanço do pedido: recebido, em preparo, pronto e entregue.
- Visualizações de atendimento, ocorrências, histórico e pedidos manuais.
- Registro da solução de ocorrências, com descrição, atendente e data.
- Aprovação ou recusa de solicitações de cancelamento enviadas durante o preparo.
- Criação manual de pedidos com busca, categorias, acompanhamentos, quantidades, adicionais, observações por item e observação geral.
- Pedidos manuais ficam em uma aba própria e têm a entrega confirmada pela loja, sem depender do aplicativo do cliente.
- Cadastro, edição e remoção de produtos, com preço, desconto, categoria, imagem, disponibilidade e grupos de opções — disponíveis para administradores.
- Botão “Resetar Demo” para restaurar o cenário inicial — disponível para administradores.

### Backend

- API REST em Express, com persistência de cardápio e pedidos via Mongoose/MongoDB.
- Notificações por WebSocket para atualizar cliente e painel após alterações.
- Validação da sequência de status e das confirmações de entrega.
- Cancelamento direto, solicitação de cancelamento durante o preparo, decisão da equipe e registro de reembolso simulado.
- Proteção contra atualizações repetidas ou concorrentes de status, ocorrências e cancelamentos.
- Identificação explícita da origem dos pedidos para separar o fluxo do cliente dos pedidos manuais.
- Seed do cardápio e rota para reinicialização da demonstração.

## Fluxo do pedido

```mermaid
flowchart TD
    A[Cliente monta o carrinho] --> B[Pagamento simulado]
    B --> C[Pedido recebido]
    C -->|Cliente cancela sem justificativa| X[Cancelado e reembolso simulado]
    C --> D[Em preparo]
    D -->|Cliente explica o motivo| S[Solicitação de cancelamento]
    S --> R{Decisão da equipe}
    R -->|Aprovar| X
    R -->|Recusar| D
    D --> E[Pronto]
    E --> F[Entregue: aguarda confirmação]
    F --> G{Resposta do cliente}
    G -->|Recebi| H[Concluído no histórico]
    G -->|Não recebi| I[Ocorrência aberta]
    I --> J[Equipe registra a solução]
    J --> H
```

Marcar um pedido do aplicativo como entregue ainda o mantém em atendimento até a confirmação do cliente ou a resolução de uma ocorrência. Quando a equipe resolve um caso, o relato original de não recebimento é preservado junto da solução. Depois que o pedido fica pronto, o cliente não pode mais solicitar cancelamento.

Pedidos manuais começam em `recebido` e percorrem as mesmas etapas operacionais, mas permanecem separados nas visualizações do painel. Ao marcar a entrega, a própria loja assume a confirmação e encerra o pedido.

## Tecnologias e estrutura

| Camada | Tecnologias |
| --- | --- |
| Cliente | React Native 0.81, React 19, Expo SDK 54, Expo Router, TypeScript, Context API e AsyncStorage |
| Dashboard | React 19, Vite 7, TypeScript, React Router DOM e Lucide React |
| Backend | Node.js, Express 4, Mongoose 8, MongoDB, dotenv e CORS |
| Comunicação | HTTP/REST e WebSocket em `/ws` |
| Validação | Node.js Test Runner, TypeScript e ESLint no cliente |

```text
restaurant-system/
├── backend/
│   ├── models/       # Modelos do MongoDB
│   ├── routes/       # API de cardápio, pedidos e reset
│   ├── seed/         # Cardápio inicial
│   ├── tests/        # Testes do fluxo de pedidos
│   └── server.js     # Servidor HTTP e WebSocket
├── cliente/
│   ├── app/          # Telas e rotas do Expo Router
│   ├── components/   # Cards, filtros, checkout e acompanhamento
│   ├── contexts/     # Sessão e carrinho
│   └── services/     # Integração com a API e estado local
├── dashboard/
│   ├── src/          # Painel, perfis de acesso e integração com a API
│   └── tests/        # Testes de pedidos, personalização e permissões
└── README.md
```

## Executar localmente

### Pré-requisitos

- Node.js 24 e npm para executar os aplicativos e os testes com a mesma versão de runtime.
- MongoDB local ou uma conexão MongoDB Atlas acessível pelo backend.
- Para testar no celular: Expo Go compatível com o SDK do projeto ou uma build de desenvolvimento.

Execute os comandos a partir da raiz do repositório, usando um terminal separado para cada aplicação.

### 1. Backend

Crie `backend/.env` a partir de `backend/.env.example`. Se o arquivo já existir, ajuste a configuração existente. Exemplo para MongoDB local:

```dotenv
MONGODB_URI=mongodb://127.0.0.1:27017/restaurant-system
PORT=3333
```

Para Atlas, use a URI do seu banco em `MONGODB_URI`.

```bash
cd backend
npm install
npm run seed
npm run dev
```

O comando `npm run seed` substitui todos os itens do cardápio pelo catálogo inicial; use-o na preparação da demo. Ele não apaga os pedidos. Para iniciar sem recarregamento automático, use `npm start`.

A API fica disponível em `http://localhost:3333`, e o WebSocket em `ws://localhost:3333/ws`.

### 2. Dashboard

Crie `dashboard/.env` a partir de `dashboard/.env.example`:

```dotenv
VITE_API_URL=http://localhost:3333
```

```bash
cd dashboard
npm install
npm run dev
```

Abra o endereço informado pelo Vite no terminal, normalmente `http://localhost:5173`.

### 3. Cliente

Crie `cliente/.env` a partir de `cliente/.env.example`:

```dotenv
EXPO_PUBLIC_API_URL=http://localhost:3333
```

```bash
cd cliente
npm install
npm start
```

Use as opções do Expo no terminal para abrir o aplicativo. Para iniciar diretamente na web, execute `npm run web`.

No celular físico, configure `EXPO_PUBLIC_API_URL` com o IP do computador na rede, por exemplo `http://192.168.1.10:3333`, e mantenha os dispositivos na mesma rede. No emulador Android padrão, use `http://10.0.2.2:3333`. A porta da API precisa estar acessível ao dispositivo.

As URLs de configuração devem conter apenas a origem do backend, sem o sufixo `/api`. Reinicie o servidor do cliente ou do dashboard após alterar seu `.env`.

## Acessos de demonstração

| Perfil | E-mail | Senha |
| --- | --- | --- |
| Cliente | `email@email.com` | `123456` |
| Administrador | `admin@restaurante.com` | `admin123` |
| Funcionário | `funcionario@restaurante.com` | `func123` |

Para experimentar o fluxo principal, entre como cliente, selecione uma mesa, personalize um produto e finalize o pedido. No painel, avance as etapas até a entrega. Volte ao acompanhamento do cliente para confirmar o recebimento ou informar que não recebeu e, nesse caso, resolva a ocorrência pelo painel.

Para testar cancelamentos, cancele diretamente enquanto o pedido estiver em `recebido` ou avance para `em_preparo` e envie uma solicitação explicada pelo cliente. A solicitação aparecerá em **Ocorrências** para aprovação ou recusa. Entre como funcionário para conferir a fila sem os controles do cardápio; entre como administrador para testar também produtos e o reset da demonstração.

## Cardápio inicial com opções

Além dos produtos simples, o seed inclui:

| Produto | Opções | Acréscimo sobre o preço base |
| --- | --- | --- |
| Açaí | 300 ml (padrão) ou 500 ml | 300 ml: sem acréscimo; 500 ml: + R$ 6,00 |
| Refrigerante | Guaraná Antarctica ou Coca-Cola | Sem acréscimo |
| Suco | Maracujá, uva, morango ou laranja | Maracujá: sem acréscimo; uva: + R$ 4,00; morango: + R$ 3,00; laranja: + R$ 5,00 |
| Milkshake | Morango ou chocolate; 400 ml (padrão) ou 700 ml | Sabores e 400 ml: sem acréscimo; 700 ml: + R$ 8,00 |

## Verificações e build

Execute cada comando na pasta indicada:

| Pasta | Comando | Finalidade |
| --- | --- | --- |
| `backend` | `npm test` | Testar transições, entregas, ocorrências, cancelamentos, reembolsos e modelos |
| `dashboard` | `npm test` | Testar filas, pedidos manuais, acompanhamentos e permissões dos perfis |
| `dashboard` | `npm run build` | Verificar TypeScript e gerar a build web em `dist/` |
| `dashboard` | `npm run preview` | Visualizar a build web gerada |
| `cliente` | `npx tsc --noEmit` | Verificar os tipos |
| `cliente` | `npm run lint` | Executar o ESLint |
| `cliente` | `npm test` | Testar edição, recuperação e conferência do carrinho |

Os testes do backend usam persistência em memória e validação dos modelos, sem acessar o MongoDB da demo. Detalhes das rotas e dos testes estão em [backend/README.md](backend/README.md).

## Escopo da demonstração

- Login e cadastro usam estado de sessão local. A restrição entre administrador e funcionário é aplicada na interface da demonstração; não há autenticação real nem controle de acesso na API.
- O checkout simula a aprovação. Não há integração com operadoras de cartão ou provedores de PIX.
- Cardápio e pedidos são persistidos no backend; sessão de demonstração, mesa e carrinho são salvos no dispositivo via AsyncStorage. Senhas e dados de pagamento não são armazenados. Sair da sessão remove os dados locais dessa sessão; limpar ou finalizar o pedido apaga o carrinho salvo.
- Ao recuperar o carrinho, os preços válidos são atualizados com aviso. Produtos indisponíveis e opções alteradas são sinalizados para revisão; sem acesso à API, o carrinho é preservado e a finalização aguarda uma nova conferência.
- “Resetar Demo” apaga todos os pedidos e restaura o cardápio do seed, incluindo a substituição das edições feitas no painel.
- As opções “Mais pedidos” e “Novidades” aparecem nos filtros, mas ainda não possuem ordenação específica; a ordenação implementada é por preço.

## Próximas melhorias

- Adicionar testes de interface ponta a ponta para a jornada completa entre cliente e equipe.
- Refinar acessibilidade e comportamento em diferentes tamanhos de tela.
- Implementar critérios de popularidade e novidade para os filtros.
- Substituir a autenticação simulada por sessões e autorização no backend caso o projeto evolua para produção.

## Autor

**Ezequiel Borges**

- GitHub: [kiellzz](https://github.com/kiellzz)
- LinkedIn: [ezequielborgesdev](https://www.linkedin.com/in/ezequielborgesdev)
