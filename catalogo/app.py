import sqlite3  # banco que ja vem no Python
from flask import Flask, request, jsonify  # Flask vira API, request le, jsonify devolve JSON

app = Flask(__name__)
BANCO = "banco.db"  # arquivo deste servico. O PHP tem o dele.


def conectar():
    banco = sqlite3.connect(BANCO)
    banco.row_factory = sqlite3.Row  # linha["estoque"] em vez de linha[2]
    return banco


def criar_tabela():
    banco = conectar()
    banco.execute(
        """
        CREATE TABLE IF NOT EXISTS eventos (
            id INTEGER PRIMARY KEY,
            nome TEXT NOT NULL,
            estoque INTEGER NOT NULL
        )
        """
    )
    tem_evento = banco.execute("SELECT COUNT(*) AS total FROM eventos").fetchone()
    if tem_evento["total"] == 0:  # so insere exemplos se estiver vazio
        banco.executemany(
            "INSERT INTO eventos (nome, estoque) VALUES (?, ?)",
            [
                ("Show do Silva", 50),
                ("Festival de Inverno", 20),
                ("Stand-up no Centro", 5),
            ],
        )
    banco.commit()
    banco.close()


@app.get("/eventos")
def listar_eventos():  # so leitura, nao mexe no estoque
    banco = conectar()
    linhas = banco.execute("SELECT id, nome, estoque FROM eventos").fetchall()
    banco.close()
    return jsonify([dict(linha) for linha in linhas])


@app.post("/reservar")
def reservar():  # baixa estoque. Nao grava pedido: pedido e no PHP
    dados = request.get_json(silent=True) or {}
    evento_id = dados.get("evento_id")
    quantidade = dados.get("quantidade")

    if not evento_id or not quantidade or quantidade < 1:
        return jsonify({"erro": "Informe evento_id e quantidade."}), 400

    banco = conectar()
    alterou = banco.execute(
        """
        UPDATE eventos
        SET estoque = estoque - ?
        WHERE id = ? AND estoque >= ?
        """,
        (quantidade, evento_id, quantidade),
    )  # uma query so: evita vender alem do estoque
    banco.commit()
    banco.close()

    if alterou.rowcount == 0:  # nenhuma linha mudou = nao tinha ingresso
        return jsonify({"erro": "Estoque insuficiente."}), 409

    return jsonify({"ok": True, "evento_id": evento_id, "quantidade": quantidade})


@app.after_request
def liberar_cors(resposta):
    resposta.headers["Access-Control-Allow-Origin"] = "*"
    resposta.headers["Access-Control-Allow-Headers"] = "Content-Type"
    resposta.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    return resposta


if __name__ == "__main__":  # so sobe o servidor se rodar: python app.py
    criar_tabela()
    app.run(host="0.0.0.0", port=5000, debug=True)
