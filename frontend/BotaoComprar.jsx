import { useState } from "react";

function BotaoComprar({ eventoId, esgotado, onComprou }) {
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState(false);

  async function comprar() {
    setCarregando(true);
    setErro("");
    setSucesso(false);

    try {
      const resposta = await fetch("http://127.0.0.1:8000/index.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ evento_id: eventoId, quantidade: 1 }),
      });

      const dados = await resposta.json();

      if (!resposta.ok) {
        setErro(dados.erro || "Não foi possível comprar.");
        return;
      }

      setSucesso(true);
      onComprou?.();
    } catch (e) {
      setErro("Não foi possível concluir a compra agora. Tente novamente.");
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
        onClick={comprar}
        disabled={carregando}
        className="w-full rounded-xl bg-amber-400 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-amber-300 disabled:cursor-wait disabled:opacity-70"
      >
        {carregando ? "Reservando..." : "Comprar ingresso"}
      </button>
      {erro && <p className="mt-3 text-sm text-rose-300">{erro}</p>}
      {sucesso && (
        <p className="mt-3 text-sm font-medium text-emerald-300">
          Ingresso confirmado.
        </p>
      )}
    </div>
  );
}

export default BotaoComprar;
