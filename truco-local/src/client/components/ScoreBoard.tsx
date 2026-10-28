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
    <header className="pointer-events-none fixed inset-x-0 top-0 z-20 flex justify-center">
      <div className="rounded-b-xl border-2 border-t-0 border-[#5a3a1e] bg-gradient-to-b from-[#3a2410] to-[#221304] px-6 pb-2.5 pt-1.5 shadow-[0_6px_18px_rgba(0,0,0,0.75)]">
        <div className="font-fell flex flex-wrap items-center justify-center gap-3 text-sm font-bold text-[#e8d5ae] md:text-base">
          <span className="max-w-[38vw] truncate">{teamName(state.players, 0)}</span>
          <span className="font-western rounded-md border border-[#c9a227] bg-[#120b03] px-4 py-0.5 text-lg text-[#ffd77a] shadow-[inset_0_1px_3px_#000]">
            {state.score[0]} × {state.score[1]}
          </span>
          <span className="max-w-[38vw] truncate">{teamName(state.players, 1)}</span>
        </div>
        <p className="font-fell mt-1 text-center text-xs text-[#cbb27f] [text-shadow:0_1px_3px_#000] md:text-sm">
          {state.msg}
          {statusText ? ` · ${statusText}` : ""}
          {state.phase !== "over" ? ` · Mão vale ${state.value}` : ""}
        </p>
      </div>
    </header>
  );
}
