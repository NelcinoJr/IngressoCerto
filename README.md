# IngressoCerto

Venda simples de ingressos. Três serviços separados, como o desafio pediu:

| Pasta | Stack | Papel |
| --- | --- | --- |
| `frontend/` | React + Vite + Tailwind | Tela: lista os shows e o botão comprar |
| `vendas/` | PHP | Caixa: recebe a compra, reserva no catálogo, grava o pedido |
| `catalogo/` | Python (Flask) | Estoque: eventos e quantidade disponível |

A compra **não** fala com o Catálogo direto. O React chama o PHP. O PHP chama o Python. Só grava venda se a reserva der certo.

## Diagrama

[Abrir no Excalidraw](https://excalidraw.com/#json=ojOmlmuhs7Ehk73BnMhAW,WuXzVFgwFLqSmQqf9lYxqw)


---

## Como rodar

Três terminais. Ordem: Catálogo → Vendas → tela.

**Catálogo** (porta 5000)

```bash
cd catalogo
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

**Vendas** (porta 8000)

```bash
cd vendas
php -S 127.0.0.1:8000
```

**Frontend** (porta 5173)

```bash
cd frontend
npm install
npm run dev
```

Abre [http://127.0.0.1:5173](http://127.0.0.1:5173).

Documentação das APIs (Swagger): [http://127.0.0.1:5000/docs](http://127.0.0.1:5000/docs).

O PHP desta máquina não tinha `pdo_sqlite`, então o pedido vai para `vendas/vendas.json`. O estoque continua no SQLite do Catálogo (`catalogo/banco.db`).

---

## Arquitetura

Dois bancos. Estoque no Python. Pedido no PHP.

```
                 GET /eventos
Pessoa → React ──────────────────────────► Catálogo (Python)
            │                                    │
            │ POST compra                        │
            ▼                                    ▼
      Vendas (PHP) ── POST /reservar ──►    banco.db
            │                               (estoque)
            ▼
     vendas.json
      (pedidos)
```

```mermaid
flowchart LR
  Pessoa --> React
  React -->|"GET /eventos"| Catalogo
  React -->|"POST compra"| Vendas
  Vendas -->|"POST /reservar"| Catalogo
  Vendas --> Pedidos[(vendas.json)]
  Catalogo --> Estoque[(banco.db)]
```

- `GET /eventos` lista show, estoque e **preço**. Só leitura.
- `POST /reservar` baixa ingresso com um `UPDATE ... WHERE estoque >= 1`. Dois cliques no último lugar: um passa, o outro toma 409.
- O React nunca chama `/reservar`.
- A compra só segue depois do alerta de pagamento: PIX, boleto ou cartão.

---

## Fluxo da compra (explicação simples)

A pessoa está na tela. Ela precisa saber **agora** se o lugar é dela. Por isso a compra é **síncrona**: o PHP chama o Python e espera.

1. Clica em **Comprar**. Ainda **não** vende. Abre o alerta: PIX, boleto ou cartão, com o preço.
2. Clica em **Pagar agora**. O React manda um POST **só para o PHP** (evento, quantidade 1, forma de pagamento).
3. O PHP chama o Python em `/reservar` e espera.
4. O Python baixa o estoque numa query só (`estoque >= 1`). Dois cliques no último ingresso: um passa, o outro toma 409.
5. Se deu certo, o PHP grava o pedido com **valor** e **forma**. Se acabou o estoque, **não** grava.
6. A tela mostra o alerta verde (show, valor real, PIX/boleto/cartão, número do pedido) e o estoque no card desce.

Clicar não vende. Pagar vende. Quem confirma estoque é o Python. Quem grava o negócio é o PHP.

```mermaid
sequenceDiagram
  actor Usuario
  participant React
  participant PHP as Vendas PHP
  participant Python as Catálogo
  participant DB as banco.db

  Usuario->>React: Comprar
  React->>Usuario: alerta PIX / boleto / cartão
  Usuario->>React: Pagar agora
  React->>PHP: POST evento, qtd, pagamento
  PHP->>Python: POST /reservar
  Python->>DB: UPDATE estoque WHERE estoque >= 1
  alt tinha ingresso
    Python-->>PHP: 200 + nome + preço
    PHP->>PHP: grava pedido e valor
    PHP-->>React: 201
    React-->>Usuario: alerta de sucesso
  else acabou
    Python-->>PHP: 409
    PHP-->>React: erro (sem pedido)
  end
```

**Síncrono:** simples, resposta na hora, só confirma se o estoque baixou.  
**Contra:** se o Python atrasar, o usuário espera. Fila eu usaria para e-mail, não para confirmar ingresso.

---

## APIs

O frontend **só precisa** da lista de eventos e da compra. Reservar estoque é interno (PHP → Python).

### GET `http://127.0.0.1:5000/eventos`

Lista os shows. Sem corpo.

Resposta `200`:

```json
[
  { "id": 1, "nome": "Show do Silva", "estoque": 50, "preco": 180 }
]
```

| Campo | Tipo | O que é |
| --- | --- | --- |
| `id` | número | ID do evento |
| `nome` | texto | Nome do show |
| `estoque` | número | Quantos ainda tem |
| `preco` | número | Valor de 1 ingresso (R$) |

### POST `http://127.0.0.1:8000/index.php`

Compra. O React manda JSON.

Enviar:

```json
{
  "evento_id": 1,
  "quantidade": 1,
  "pagamento": "pix"
}
```

| Campo | Tipo | Obrigatório | Valores |
| --- | --- | --- | --- |
| `evento_id` | número | sim | ID que veio do GET |
| `quantidade` | número | sim | 1 ou mais |
| `pagamento` | texto | sim | `pix`, `boleto` ou `cartao` |

Resposta `201` (deu certo):

```json
{
  "ok": true,
  "venda_id": 19,
  "evento_id": 1,
  "nome": "Show do Silva",
  "quantidade": 1,
  "preco": 180,
  "total": 180,
  "pagamento": "pix",
  "pagamento_nome": "PIX"
}
```

Erros:

| HTTP | Quando |
| --- | --- |
| 400 | Faltou campo ou pagamento inválido |
| 409 | Estoque insuficiente |
| 503 | Catálogo fora do ar (não grava venda) |

`POST /reservar` no Python **não** é API de frontend. Só o PHP chama.

---

## Perguntas do desafio

### Documentação

Sendo do time de backend, o frontend precisa de um contrato, não de um recado no Slack.

Esse contrato está no Swagger: [http://127.0.0.1:5000/docs](http://127.0.0.1:5000/docs). Lá o time de tela vê a URL, o método, cada campo, o tipo, um exemplo e o que cada erro significa.

Sem isso, um manda `"1"` em texto, outro manda `1` em número, outro manda `PIX` em maiúsculo. A API quebra e cada um culpa o outro.

O React usa duas rotas:

- `GET /eventos` — `id`, `nome`, `estoque`, `preco`
- `POST` no PHP — `evento_id`, `quantidade`, `pagamento` (`pix`, `boleto` ou `cartao`)

`400` faltou dado. `409` acabou o estoque. `503` o Catálogo está fora.

`POST /reservar` no Python aparece no Swagger como **interno**. O frontend não chama essa rota.

---

### Segurança

Reservar estoque sem pagamento não pode. Se `/reservar` ficar na internet, qualquer um baixa ingresso no Postman, o show some e a empresa não recebeu nada.

Por isso a tela nunca chama o Python para reservar. Ela chama só o PHP, e só depois do alerta de PIX, boleto ou cartão. Sem forma de pagamento válida, o PHP nem chega no Catálogo.

Os dados ficam separados por camada:

- React — o que a pessoa vê
- PHP — pedido, valor, forma de pagamento
- Python — estoque e preço

Número de cartão de verdade não entra neste projeto. A demo só registra a escolha. Em produção, o Catálogo fica em rede interna e o PHP se identifica com uma chave de serviço.

Quem baixa estoque é o caixa, que também registra o pagamento. Estoque num banco, pedido no outro.

---

### Escalabilidade

Se amanhã um evento tiver milhares de acessos no mesmo segundo, o serviço mais impactado é o **Catálogo**. Todo mundo disputa o mesmo número de estoque. O último ingresso é um ponto só. Posso ter vinte caixas; não posso ter vinte verdades de quantidade.

O PHP é o segundo a sentir: cada clique vira um pedido. A vitrine (React) é a mais fácil de aguentar — cache e CDN na página do show.

O que eu faria:

- vários PHP atrás de um load balancer
- o `UPDATE` atômico continua no Catálogo; estoque na hora da venda **não** vai para cache
- cache só para ler nome e preço na vitrine
- limite de clique repetido

Quem chegar depois do último lugar recebe `409`. Isso não é falha. É o sistema não superlotar o show.

---

### Extra

Se uma função do backend parecer lenta e eu já tiver uma ideia, o primeiro passo não é aplicar a ideia. É medir.

O travamento pode ser query, índice, lock, chamada HTTP, loop. Colocar Redis no escuro pode mascarar o problema ou gastar tempo no lugar errado.

Eu olho o tempo (log, APM, `EXPLAIN`, profiler), acho a causa e só então mudo: índice, cache de leitura, pool, menos ida e volta.

Se o gargalo for o `UPDATE` do último ingresso, isso não é bug. Duas pessoas não levam o mesmo lugar. Aí a melhoria é fila na entrada da página, não vender sem olhar o estoque. Eu não tiro essa trava só para “ficar mais rápido” e lotar o show além da cadeira.

---

## Se o Catálogo cair

No enunciado aparece “catálogo (PHP)”. O estoque é **Python**. Se ele estiver fora:

- o PHP não grava venda
- responde **503**
- o React mostra para tentar de novo

Não vendo “na confiança”. Sem estoque confirmado, não existe pedido.

```mermaid
sequenceDiagram
  actor Usuario
  participant React
  participant PHP as Vendas PHP
  participant Python as Catálogo

  Usuario->>React: Comprar
  React->>PHP: POST
  PHP->>Python: POST /reservar
  Python--xPHP: timeout / recusa
  Note over PHP: não grava pedido
  PHP-->>React: 503
```

---

## Pastas

```
catalogo/    API Flask + banco.db
vendas/      API PHP + vendas.json
frontend/    React
```
