import { useEffect, useRef } from "react";
import { ActionBar } from "@/components/ActionBar";
import { HomeScreen } from "@/components/HomeScreen";
import { LobbyScreen } from "@/components/LobbyScreen";
import { ScoreBoard } from "@/components/ScoreBoard";
import { useTrucoGame } from "@/hooks/useTrucoGame";
import { GameScene } from "@/three/GameScene";

export default function GamePage() {
  const game = useTrucoGame();
  const sceneHostRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<GameScene | null>(null);
  const sendRef = useRef(game.send);

  useEffect(() => {
    sendRef.current = game.send;
  }, [game.send]);

  useEffect(() => {
    const host = sceneHostRef.current;
    if (!host) return;

    const scene = new GameScene(host, {
      onPick: (card) => {
        void sendRef.current({ type: "play", c: card });
      },
    });
    sceneRef.current = scene;

    return () => {
      scene.dispose();
      sceneRef.current = null;
    };
  }, []);

  useEffect(() => {
    sceneRef.current?.sync(game.state, game.mySeat);
  }, [game.state, game.mySeat]);

  useEffect(() => {
    sceneRef.current?.setInteractionEnabled(game.canPlay);
  }, [game.canPlay]);

  return (
    <main className="h-screen w-screen overflow-hidden bg-[#0d1512] text-[#f3ead6]">
      <div ref={sceneHostRef} className="absolute inset-0 [&>canvas]:h-full [&>canvas]:w-full" />

      {!game.state || !game.code ? (
        <HomeScreen
          defaultName={game.savedName}
          defaultCode={game.roomCodeFromUrl}
          isConnecting={game.isConnecting}
          error={game.error}
          onConnect={game.connect}
        />
      ) : null}

      {game.state && game.code && game.state.phase === "lobby" ? (
        <LobbyScreen
          code={game.code}
          userId={game.userId}
          state={game.state}
          isHost={game.isHost}
          onAction={(type) => void game.send({ type })}
        />
      ) : null}

      {game.state && game.state.phase !== "lobby" ? (
        <>
          <ScoreBoard state={game.state} />
          <ActionBar
            state={game.state}
            mySeat={game.mySeat}
            isHost={game.isHost}
            canAskTruco={game.canAskTruco}
            onAction={(type) => void game.send({ type })}
          />
        </>
      ) : null}
    </main>
  );
}
