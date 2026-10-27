import type { GameState } from "@/types/game";

interface ScoreBoardProps {
  state: GameState;
}

function teamName(players: GameState["players"], teamIndex: number): string {
  return players
    .filter((_, index) => index % 2 === teamIndex)
    .map((player) => player.name)
    .join(" & ");
}

export function ScoreBoard({ state }: ScoreBoardProps) {
  const statusText =
    state.phase === "over"
      ? ""
      : state.pend
        ? "Aguardando resposta ao pedido..."
        : `Vez de ${state.players[state.turn]?.name ?? "?"}`;

  return (
    <header className="pointer-events-none fixed inset-x-0 top-2 z-10 text-center text-white [text-shadow:0_1px_4px_#000]">
      <div className="flex flex-wrap items-center justify-center gap-3 text-sm font-bold md:text-base">
        <span>{teamName(state.players, 0)}</span>
        <span className="rounded-full bg-[#940000]/75 px-5 py-1.5 text-lg font-bold">
          {state.score[0]} × {state.score[1]}
        </span>
        <span>{teamName(state.players, 1)}</span>
      </div>
      <p className="mt-1 text-sm text-white/90">
        {state.msg}
        {statusText ? ` · ${statusText}` : ""}
        {state.phase !== "over" ? ` · Mão vale ${state.value}` : ""}
      </p>
    </header>
  );
}
