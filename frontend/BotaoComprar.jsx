import { useState } from "react";

function reais(valor) {
  return Number(valor).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

const formas = [
  { id: "pix", nome: "PIX", detalhe: "Pagamento na hora" },
  { id: "boleto", nome: "Boleto", detalhe: "Compensa em até 1 dia útil" },
  { id: "cartao", nome: "Cartão de crédito", detalhe: "Aprovação na hora" },
];

function BotaoComprar({ eventoId, nome, preco, esgotado, onComprou }) {
  const [aberto, setAberto] = useState(false);
  const [pagamento, setPagamento] = useState("pix");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  function abrirAlerta() {
    setErro("");
    setPagamento("pix");
    setAberto(true);
  }

  function fechar() {
    if (carregando) {
      return;
    }
    setAberto(false);
    setErro("");
  }

  async function pagar() {
    setCarregando(true);
    setErro("");

    try {
      const resposta = await fetch("http://127.0.0.1:8000/index.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          evento_id: eventoId,
          quantidade: 1,
          pagamento,
        }),
      });

      const dados = await resposta.json();

      if (!resposta.ok) {
        setErro(dados.erro || "Não foi possível pagar.");
        return;
      }

      setAberto(false);
      onComprou?.({
        ...dados,
        nome: dados.nome || nome,
        total: Number(dados.total) > 0 ? dados.total : preco,
        pagamento_nome: dados.pagamento_nome,
      });
    } catch (e) {
      setErro("Não foi possível concluir o pagamento. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  }

  if (esgotado) {
    return (
      <button
        disabled
        className="mt-5 w-full rounded-xl bg-white/10 py-3 text-sm font-semibold text-white/40"
      >
        Esgotado
      </button>
    );
  }

  return (
    <div className="mt-5">
      <button
        onClick={abrirAlerta}
        className="w-full rounded-xl bg-amber-400 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-amber-300"
      >
        Comprar ingresso
      </button>

      {aberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-3xl border border-white/10 bg-zinc-900 p-6 text-white shadow-2xl"
          >
            <p className="text-xs font-medium tracking-widest text-amber-400 uppercase">
              Pagamento
            </p>
            <h3 className="mt-2 text-xl font-semibold">{nome}</h3>
            <p className="mt-1 text-2xl font-semibold text-amber-300">
              {reais(preco)}
            </p>
            <p className="mt-2 text-sm text-white/50">
              Escolha como pagar para confirmar a compra.
            </p>

            <div className="mt-5 space-y-2">
              {formas.map((forma) => (
                <label
                  key={forma.id}
                  className={`flex cursor-pointer items-center justify-between rounded-2xl border px-4 py-3 ${
                    pagamento === forma.id
                      ? "border-amber-400 bg-amber-400/10"
                      : "border-white/10 bg-white/5"
                  }`}
                >
                  <span>
                    <span className="block text-sm font-medium">{forma.nome}</span>
                    <span className="text-xs text-white/45">{forma.detalhe}</span>
                  </span>
                  <input
                    type="radio"
                    name={`pagamento-${eventoId}`}
                    value={forma.id}
                    checked={pagamento === forma.id}
                    onChange={() => setPagamento(forma.id)}
                    className="accent-amber-400"
                  />
                </label>
              ))}
            </div>

            {erro && <p className="mt-4 text-sm text-rose-300">{erro}</p>}

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={fechar}
                disabled={carregando}
                className="flex-1 rounded-xl border border-white/15 py-3 text-sm text-white/70"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={pagar}
                disabled={carregando}
                className="flex-1 rounded-xl bg-amber-400 py-3 text-sm font-semibold text-zinc-950 disabled:opacity-70"
              >
                {carregando ? "Processando..." : "Pagar agora"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export { reais };
export default BotaoComprar;
