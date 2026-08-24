<?php

class VendaController
{
    private $catalogoUrl = "http://127.0.0.1:5000/reservar"; // URL interna do estoque
    private $bancoArquivo = "vendas.json"; // nesta maquina o PHP nao tem SQLite; JSON cumpre o "banco local"

    public function comprar($eventoId, $quantidade) // React chama o PHP, nao o Python
    {
        if (!$eventoId || !$quantidade || $quantidade < 1) {
            return ["ok" => false, "erro" => "Informe evento_id e quantidade.", "status" => 400];
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

        $caminho = __DIR__ . "/" . $this->bancoArquivo; // so grava DEPOIS da reserva
        $lista = file_exists($caminho) ? (json_decode(file_get_contents($caminho), true) ?: []) : [];
        $vendaId = count($lista) + 1;
        $lista[] = [
            "id" => $vendaId,
            "evento_id" => (int) $eventoId,
            "quantidade" => (int) $quantidade,
            "criado_em" => date("c"),
        ];
        file_put_contents($caminho, json_encode($lista, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

        return [
            "ok" => true,
            "venda_id" => $vendaId,
            "evento_id" => (int) $eventoId,
            "quantidade" => (int) $quantidade,
            "status" => 201, // criado
        ];
    }
}
