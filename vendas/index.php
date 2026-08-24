<?php
header("Content-Type: application/json"); // resposta em JSON, nao HTML
header("Access-Control-Allow-Origin: *"); // React em outra porta: o navegador exige CORS
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: POST, OPTIONS");

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") { // preflight do navegador, nao e compra
    http_response_code(204);
    exit;
}

if ($_SERVER["REQUEST_METHOD"] !== "POST") { // compra so no POST
    http_response_code(405);
    echo json_encode(["erro" => "Use POST."]);
    exit;
}

require __DIR__ . "/VendaController.php"; // carrega o caixa

$dados = json_decode(file_get_contents("php://input"), true) ?: []; // JSON que o React mandou
$controller = new VendaController();
$resultado = $controller->comprar(
    $dados["evento_id"] ?? null,
    $dados["quantidade"] ?? null
);

http_response_code($resultado["status"]); // 201, 400, 409 ou 503
unset($resultado["status"]); // status vai no cabecalho, nao no JSON
echo json_encode($resultado);
