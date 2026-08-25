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
            estoque INTEGER NOT NULL,
            preco REAL NOT NULL DEFAULT 0
        )
        """
    )
    colunas = [linha["name"] for linha in banco.execute("PRAGMA table_info(eventos)")]
    if "preco" not in colunas:
        banco.execute("ALTER TABLE eventos ADD COLUMN preco REAL NOT NULL DEFAULT 0")
        banco.execute("UPDATE eventos SET preco = 180 WHERE id = 1")
        banco.execute("UPDATE eventos SET preco = 90 WHERE id = 2")
        banco.execute("UPDATE eventos SET preco = 45 WHERE id = 3")
    tem_evento = banco.execute("SELECT COUNT(*) AS total FROM eventos").fetchone()
    if tem_evento["total"] == 0:  # so insere exemplos se estiver vazio
        banco.executemany(
            "INSERT INTO eventos (nome, estoque, preco) VALUES (?, ?, ?)",
            [
                ("Show do Silva", 50, 180),
                ("Festival de Inverno", 20, 90),
                ("Stand-up no Centro", 5, 45),
            ],
        )
    banco.commit()
    banco.close()


@app.get("/eventos")
def listar_eventos():  # so leitura, nao mexe no estoque
    banco = conectar()
    linhas = banco.execute("SELECT id, nome, estoque, preco FROM eventos").fetchall()
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
    if alterou.rowcount == 0:
        banco.close()
        return jsonify({"erro": "Estoque insuficiente."}), 409

    evento = banco.execute(
        "SELECT nome, preco FROM eventos WHERE id = ?",
        (evento_id,),
    ).fetchone()
    banco.commit()
    banco.close()

    preco = float(evento["preco"] or 0)
    total = round(preco * int(quantidade), 2)
    return jsonify(
        {
            "ok": True,
            "evento_id": evento_id,
            "nome": evento["nome"],
            "quantidade": quantidade,
            "preco": preco,
            "total": total,
        }
    )


@app.after_request
def liberar_cors(resposta):
    resposta.headers["Access-Control-Allow-Origin"] = "*"
    resposta.headers["Access-Control-Allow-Headers"] = "Content-Type"
    resposta.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    return resposta


if __name__ == "__main__":  # so sobe o servidor se rodar: python app.py
    criar_tabela()
    app.run(host="0.0.0.0", port=5000, debug=True)
