<?php

class VendaController
{
    private $catalogoUrl = "http://127.0.0.1:5000/reservar"; // URL interna do estoque
    private $bancoArquivo = "vendas.json"; // nesta maquina o PHP nao tem SQLite; JSON cumpre o "banco local"

    public function comprar($eventoId, $quantidade, $pagamento)
    {
        $formas = [
            "pix" => "PIX",
            "boleto" => "Boleto",
            "cartao" => "Cartão de crédito",
        ];

        if (!$eventoId || !$quantidade || $quantidade < 1) {
            return ["ok" => false, "erro" => "Informe evento_id e quantidade.", "status" => 400];
        }

        if (!isset($formas[$pagamento])) {
            return ["ok" => false, "erro" => "Escolha PIX, boleto ou cartão de crédito.", "status" => 400];
        }

        $payload = json_encode([
            "evento_id" => $eventoId,
            "quantidade" => $quantidade,
        ]);

        $ch = curl_init($this->catalogoUrl); // liga no Catálogo
        curl_setopt($ch, CURLOPT_POST, true); // POST, porque muda estoque
        curl_setopt($ch, CURLOPT_HTTPHEADER, ["Content-Type: application/json"]);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true); // resposta vem pra variavel
        curl_setopt($ch, CURLOPT_TIMEOUT, 5); // se o Python travar, nao espera pra sempre

        $resposta = curl_exec($ch);
        $http = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $falhou = curl_errno($ch);
        curl_close($ch);

        if ($falhou || $resposta === false) { // Catálogo fora: nao grava venda
            return ["ok" => false, "erro" => "Não foi possível concluir a compra agora. Tente novamente.", "status" => 503];
        }

        if ($http !== 200) { // estoque insuficiente ou dado errado
            $corpo = json_decode($resposta, true);
            $erro = $corpo["erro"] ?? "Não foi possível reservar o ingresso.";
            return ["ok" => false, "erro" => $erro, "status" => $http];
        }

        $reserva = json_decode($resposta, true) ?: [];
        $preco = (float) ($reserva["preco"] ?? 0);
        $total = (float) ($reserva["total"] ?? 0);
        $nome = $reserva["nome"] ?? "";

        if ($preco <= 0 || $nome === "") {
            $chEventos = curl_init("http://127.0.0.1:5000/eventos");
            curl_setopt($chEventos, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($chEventos, CURLOPT_TIMEOUT, 5);
            $listaEventos = json_decode(curl_exec($chEventos), true) ?: [];
            curl_close($chEventos);
            foreach ($listaEventos as $evento) {
                if ((int) ($evento["id"] ?? 0) !== (int) $eventoId) {
                    continue;
                }
                $nome = $nome !== "" ? $nome : ($evento["nome"] ?? "");
                $preco = $preco > 0 ? $preco : (float) ($evento["preco"] ?? 0);
                break;
            }
        }

        $total = $total > 0 ? $total : $preco * (int) $quantidade;

        $caminho = __DIR__ . "/" . $this->bancoArquivo;
        $lista = file_exists($caminho) ? (json_decode(file_get_contents($caminho), true) ?: []) : [];
        $vendaId = count($lista) + 1;
        $lista[] = [
            "id" => $vendaId,
            "evento_id" => (int) $eventoId,
            "nome" => $nome,
            "quantidade" => (int) $quantidade,
            "preco" => $preco,
            "total" => $total,
            "pagamento" => $pagamento,
            "pagamento_nome" => $formas[$pagamento],
            "criado_em" => date("c"),
        ];
        file_put_contents($caminho, json_encode($lista, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

        return [
            "ok" => true,
            "venda_id" => $vendaId,
            "evento_id" => (int) $eventoId,
            "nome" => $nome,
            "quantidade" => (int) $quantidade,
            "preco" => $preco,
            "total" => $total,
            "pagamento" => $pagamento,
            "pagamento_nome" => $formas[$pagamento],
            "status" => 201,
        ];
    }
}
