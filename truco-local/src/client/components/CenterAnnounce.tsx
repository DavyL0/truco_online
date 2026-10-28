import { useEffect, useRef, useState } from "react";
import type { GameState } from "@/types/game";
import { betLabel } from "@/types/game";

interface CenterAnnounceProps {
  state: GameState;
  mySeat: number;
}

interface Announce {
  id: number;
  title: string;
  sub: string;
  tone: "red" | "gold" | "green";
}

function teamName(players: GameState["players"], teamIndex: number): string {
  return (
    players
      .filter((_, index) => index % 2 === teamIndex)
      .map((player) => player.name)
      .join(" & ") || `Time ${teamIndex + 1}`
  );
}

const TONE_CLASS: Record<Announce["tone"], string> = {
  red: "text-[#ff5a45] [text-shadow:0_2px_0_#4d0f08,0_0_28px_rgba(255,60,30,0.55),0_6px_18px_#000]",
  gold: "text-[#ffd77a] [text-shadow:0_2px_0_#4d3208,0_0_28px_rgba(255,190,60,0.5),0_6px_18px_#000]",
  green: "text-[#8fd48a] [text-shadow:0_2px_0_#12350f,0_0_28px_rgba(90,220,110,0.45),0_6px_18px_#000]",
};

export function CenterAnnounce({ state, mySeat }: CenterAnnounceProps) {
  const [announce, setAnnounce] = useState<Announce | null>(null);

  // inicia com o estado atual para não reanunciar algo antigo ao montar
  const prev = useRef({
    pendTo: state.pend?.to ?? null,
    pendTeam: state.pend?.team ?? null,
    value: state.value,
    phase: state.phase,
  });

  useEffect(() => {
    const p = prev.current;
    const pendTo = state.pend?.to ?? null;
    const pendTeam = state.pend?.team ?? null;
    let next: Announce | null = null;

    if (state.phase === "over" && p.phase !== "over") {
      const mine = state.winner !== null && mySeat >= 0 && state.winner === mySeat % 2;
      next = {
        id: Date.now(),
        title: mine ? "VITÓRIA!" : "DERROTA!",
        sub:
          state.winner !== null
            ? `${teamName(state.players, state.winner)} venceu a partida`
            : "Fim de jogo",
        tone: mine ? "green" : "red",
      };
    } else if (pendTo !== null && pendTo !== p.pendTo && state.phase === "play") {
      const raised = p.pendTo !== null;
      next = {
        id: Date.now(),
        title: `${betLabel(pendTo)}!`,
        sub: raised
          ? `${teamName(state.players, pendTeam ?? 0)} aumentou — vale ${pendTo} pontos`
          : `${teamName(state.players, pendTeam ?? 0)} pediu — vale ${pendTo} pontos`,
        tone: "red",
      };
    } else if (p.pendTo !== null && pendTo === null) {
      // vale tanto para "aceitar" (fase play) quanto para "correr" (fase show)
      if (state.value === p.pendTo) {
        next = {
          id: Date.now(),
          title: "ACEITO!",
          sub: `A mão agora vale ${state.value} ponto${state.value > 1 ? "s" : ""}`,
          tone: "green",
        };
      } else {
        next = {
          id: Date.now(),
          title: "CORRERAM!",
          sub: `${teamName(state.players, 1 - (p.pendTeam ?? 0))} correu do desafio`,
          tone: "gold",
        };
      }
    }

    prev.current = { pendTo, pendTeam, value: state.value, phase: state.phase };
    if (next) setAnnounce(next);
  }, [state, mySeat]);

  useEffect(() => {
    if (!announce) return;
    const timer = setTimeout(() => setAnnounce(null), 2800);
    return () => clearTimeout(timer);
  }, [announce]);

  if (!announce) return null;

  return (
    <div
      key={announce.id}
      className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center"
    >
      <div className="animate-banner text-center">
        <div className={`font-western text-6xl leading-none md:text-8xl ${TONE_CLASS[announce.tone]}`}>
          {announce.title}
        </div>
        <div className="font-fell mt-3 text-xl text-[#f3ead6] [text-shadow:0_2px_6px_#000] md:text-2xl">
          {announce.sub}
        </div>
      </div>
    </div>
  );
}
