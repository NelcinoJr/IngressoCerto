import { useEffect, useState } from "react";
import BotaoComprar from "./BotaoComprar.jsx";

const artes = [
  {
    faixa: "from-violet-500 to-fuchsia-500",
    lugar: "Allianz Parque · São Paulo",
    quando: "12 set · 21h",
  },
  {
    faixa: "from-sky-500 to-cyan-400",
    lugar: "Parque da Cidade · Curitiba",
    quando: "28 set · 16h",
  },
  {
    faixa: "from-orange-500 to-amber-300",
    lugar: "Teatro do Centro · Recife",
    quando: "3 out · 20h",
  },
];

function App() {
  const [eventos, setEventos] = useState([]); // lista que veio do Catálogo
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  async function carregarEventos() {
    try {
      const resposta = await fetch("http://127.0.0.1:5000/eventos"); // GET no Python, so lista
      const dados = await resposta.json();
      setEventos(dados);
      setErro("");
    } catch (e) {
      setErro("Não foi possível carregar os eventos.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarEventos();
  }, []);

  function baixarEstoque(eventoId) { // a tela acompanha o estoque sem recarregar
    setEventos((lista) =>
      lista.map((evento) =>
        evento.id === eventoId
          ? { ...evento, estoque: Math.max(0, evento.estoque - 1) }
          : evento
      )
    );
  }

  return (
    <div
      className="min-h-screen bg-zinc-950 text-white"
      style={{ fontFamily: "Outfit, sans-serif" }}
    >
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(251,191,36,0.12),_transparent_55%)]" />

      <main className="relative mx-auto max-w-5xl px-6 py-16">
        <p className="text-sm font-medium tracking-widest text-amber-400 uppercase">
          IngressoCerto
        </p>
        <h1 className="mt-3 max-w-xl text-4xl font-bold tracking-tight sm:text-5xl">
          Escolha o show.
          <span className="block text-white/55">Garanta seu lugar.</span>
        </h1>
        <p className="mt-4 max-w-lg text-white/55">
          O estoque é do Catálogo. A compra passa pelo caixa. Cada ingresso
          vendido some da lista na hora.
        </p>

        {carregando && (
          <p className="mt-16 text-white/50">Carregando eventos...</p>
        )}

        {erro && <p className="mt-16 text-rose-300">{erro}</p>}

        <section className="mt-12 grid gap-6 md:grid-cols-3">
          {eventos.map((evento, indice) => {
            const arte = artes[indice % artes.length];
            const esgotado = evento.estoque < 1;
            const pouco = evento.estoque > 0 && evento.estoque <= 5;

            return (
              <article
                key={evento.id}
                className="overflow-hidden rounded-3xl border border-white/10 bg-white/5"
              >
                <div className={`h-28 bg-gradient-to-r ${arte.faixa}`} />
                <div className="p-6">
                  <p className="text-xs text-white/45">{arte.quando}</p>
                  <h2 className="mt-2 text-xl font-semibold">{evento.nome}</h2>
                  <p className="mt-1 text-sm text-white/50">{arte.lugar}</p>

                  <div className="mt-4 flex items-center justify-between">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        esgotado
                          ? "bg-white/10 text-white/40"
                          : pouco
                            ? "bg-amber-400/20 text-amber-200"
                            : "bg-emerald-400/15 text-emerald-300"
                      }`}
                    >
                      {esgotado
                        ? "Sem ingressos"
                        : `${evento.estoque} disponível${evento.estoque === 1 ? "" : "is"}`}
                    </span>
                    <span className="text-sm text-white/40">1 ingresso</span>
                  </div>

                  <BotaoComprar
                    eventoId={evento.id}
                    esgotado={esgotado}
                    onComprou={() => baixarEstoque(evento.id)}
                  />
                </div>
              </article>
            );
          })}
        </section>
      </main>
    </div>
  );
}

export default App;
