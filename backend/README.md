# restaurant-backend

Backend (Node + Express + MongoDB) do restaurant-system - versão de teste/demo para portfólio.

## Como rodar

1. Instalar dependências:
   ```
   npm install
   ```

2. Copiar `.env.example` para `.env` e colar a connection string do cluster criado no Atlas (projeto `restaurant-system`, cluster free):
   ```
   MONGODB_URI=mongodb+srv://usuario:senha@cluster0.xxxxx.mongodb.net/restaurant-system?retryWrites=true&w=majority
   PORT=3333
   ```

3. Popular o banco com o cardápio inicial:
   ```
   npm run seed
   ```

4. Rodar o servidor:
   ```
   npm run dev
   ```
   (ou `npm start` sem hot-reload)

## Rotas

- `GET  /api/menu` — lista o cardápio (tela de cliente)
- `POST /api/menu` — cria item novo (dashboard)
- `PUT  /api/menu/:id` — edita item: preço, desconto, disponibilidade (dashboard)
- `DELETE /api/menu/:id` — remove item (dashboard)
- `POST /api/orders` — cliente finaliza pedido (CheckoutModal)
- `GET  /api/orders` — fila de pedidos (dashboard)
- `PATCH /api/orders/:id/status` — avança status do pedido (dashboard)
- `PATCH /api/orders/:id/delivery-confirmation` — cliente confirma recebimento ou informa que não recebeu
- `PATCH /api/orders/:id/delivery-resolution` — registra a solução da ocorrência com `descricao` e `atendente`; o servidor grava `resolvidoEm`
- `PATCH /api/orders/:id/cancellation` — cancela o pedido com motivo e origem. O cliente pode cancelar em `recebido`; a equipe também pode cancelar em `em_preparo` e `pronto`
- `POST /api/reset` — apaga pedidos e restaura o cardápio original (botão "Resetar Demo" / cron externo)

## Atendimento e ocorrências

- `historicoEtapas` registra `{ status, registradoEm }` com horários gerados pelo servidor. A criação inicia em `recebido`; cada avanço grava o evento atomicamente com a atualização do status. Tentativas repetidas não geram eventos duplicados.
- Pedidos anteriores à funcionalidade mantêm seus dados: a criação é usada como recebimento e horários ausentes das demais etapas aparecem como não registrados, sem estimativas retroativas.

- A fila ativa inclui pedidos em preparo, aguardando confirmação e ocorrências abertas.
- O cliente pode confirmar o recebimento ou informar que não recebeu somente depois da entrega, uma única vez.
- O painel destaca as ocorrências abertas e permite registrar a solução (obrigatória, até 500 caracteres).
- Pedidos com recebimento confirmado ou ocorrência resolvida ficam no histórico. O relato original, a solução, o atendente e a data são preservados; a solução também aparece no app do cliente.
- As alterações são propagadas em tempo real. Uma resolução concorrente ou repetida retorna `409`, sem sobrescrever o registro.
- A identificação do atendente continua sendo a da sessão simulada; esta versão não adiciona autenticação real.
- Em `recebido`, o cliente cancela diretamente sem justificativa. Em `em_preparo`, ele envia uma solicitação com motivo por `PATCH /api/orders/:id/cancellation-request`; a equipe aprova ou recusa por `PATCH /api/orders/:id/cancellation-review`. A aprovação efetiva o cancelamento e o reembolso. Em `pronto` ou `entregue`, o cliente não pode solicitar. Cancelamentos iniciados pela equipe exigem motivo em qualquer etapa permitida.
- `origemPedido` distingue pedidos `cliente` e `manual`; pedidos antigos sem origem e sem pagamento são tratados como manuais.
- Ao avançar um pedido manual para `entregue`, o backend define `confirmacaoEntrega` como `confirmado`. Somente pedidos originados pelo aplicativo aguardam confirmação do cliente.

## Testes

Com Node.js 24, execute `npm test` nesta pasta e em `dashboard/`.
Os testes de API usam persistência em memória isolada e validação do modelo Mongoose, sem acessar o banco configurado na demo.
Em ambientes que restringem subprocessos, use `node --test --test-isolation=none` no backend e `node --test --test-isolation=none tests/orderWorkflow.test.mjs` no dashboard.

## Ajustar antes de usar

- `seed/menuSeed.js` tem preços e nomes de imagem placeholder — troca pelos valores reais do cardápio do cliente.
- Ao subir em Render/Railway, lembrar de liberar `0.0.0.0/0` em Network Access no Atlas (o "automate security setup" só libera seu IP local).
