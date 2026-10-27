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

export function ActionBar({ state, mySeat, isHost, canAskTruco, onAction }: ActionBarProps) {
  if (state.phase === "over") {
    return isHost ? (
      <div className="fixed inset-x-0 bottom-3 z-10 text-center">
        <Button onClick={() => onAction("again")}>Nova partida</Button>
      </div>
    ) : null;
  }

  if (state.phase !== "play" || mySeat < 0) return null;

  if (state.pend && mySeat % 2 !== state.pend.team) {
    return (
      <div className="fixed inset-x-0 bottom-3 z-10 flex flex-wrap justify-center gap-2 px-3">
        <Button className="bg-[#3f8f57] text-white hover:bg-[#4aa367]" onClick={() => onAction("accept")}>
          Aceitar
        </Button>
        <Button variant="destructive" onClick={() => onAction("run")}>
          Correr
        </Button>
        {state.pend.to < 12 ? (
          <Button
            variant="secondary"
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
        <Button variant="destructive" onClick={() => onAction("truco")}>
          {betLabel(nextValue)}!
        </Button>
      </div>
    );
  }

  return null;
}
