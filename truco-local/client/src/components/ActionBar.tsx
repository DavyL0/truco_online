import { Button } from "@/components/ui/button";
import type { GameState } from "@/types/game";
import { betLabel, nextBetValue } from "@/types/game";

interface ActionBarProps {
  state: GameState;
  mySeat: number;
  isHost: boolean;
  canAskTruco: boolean;
  onAction: (type: "again" | "truco" | "accept" | "run" | "raise") => void;
}

const SALOON_BTN =
  "font-western border-2 border-[#c9a227] text-base tracking-wide shadow-[0_3px_10px_#000] hover:brightness-110";

export function ActionBar({ state, mySeat, isHost, canAskTruco, onAction }: ActionBarProps) {
  if (state.phase === "over") {
    return isHost ? (
      <div className="fixed inset-x-0 bottom-3 z-10 text-center">
        <Button
          className={`${SALOON_BTN} bg-[#2f6b3f] px-6 text-white`}
          onClick={() => onAction("again")}
        >
          Nova partida
        </Button>
      </div>
    ) : null;
  }

  if (state.phase !== "play" || mySeat < 0) return null;

  if (state.pend && mySeat % 2 !== state.pend.team) {
    return (
      <div className="fixed inset-x-0 bottom-3 z-10 flex flex-wrap justify-center gap-2 px-3">
        <Button
          className={`${SALOON_BTN} bg-[#2f6b3f] px-5 text-white`}
          onClick={() => onAction("accept")}
        >
          Aceitar
        </Button>
        <Button
          className={`${SALOON_BTN} bg-[#6e1f14] px-5 text-white`}
          onClick={() => onAction("run")}
        >
          Correr
        </Button>
        {state.pend.to < 12 ? (
          <Button
            className={`${SALOON_BTN} bg-[#7a5a1e] px-5 text-white`}
            onClick={() => onAction("raise")}
          >{`Aumentar p/ ${nextBetValue(state.pend.to)}`}</Button>
        ) : null}
      </div>
    );
  }

  if (canAskTruco) {
    const nextValue = nextBetValue(state.value);
    return (
      <div className="fixed inset-x-0 bottom-3 z-10 text-center">
        <Button
          className={`${SALOON_BTN} h-12 bg-[#8f1d1d] px-8 text-xl text-[#ffe9c9] hover:bg-[#8f1d1d]`}
          onClick={() => onAction("truco")}
        >
          {`${betLabel(nextValue)}!`}
        </Button>
      </div>
    );
  }

  return null;
}
