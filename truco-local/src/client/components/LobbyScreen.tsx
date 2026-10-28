import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { GameState } from "@/types/game";

interface LobbyScreenProps {
  code: string;
  userId: string;
  state: GameState;
  isHost: boolean;
  onAction: (type: "addBot" | "removeBot" | "start") => void;
}

export function LobbyScreen({ code, userId, state, isHost, onAction }: LobbyScreenProps) {
  const [copied, setCopied] = useState(false);
  const playerCount = state.players.length;
  const canStart = playerCount === 2 || playerCount === 4;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/?sala=${code}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="fixed inset-0 z-20 grid place-items-center bg-black/55 p-4">
      <Card className="w-full max-w-[430px] border-[#c9a24a] bg-[#1b2a22]/95 text-[#f3ead6] shadow-2xl backdrop-blur">
        <CardHeader>
          <CardTitle className="text-2xl text-[#e8c46a]">Sala {code}</CardTitle>
          <CardDescription className="text-[#f3ead6]/70">
            Convide amigos com o link ou o código
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            variant="secondary"
            onClick={copyLink}
            className="w-full bg-[#35493d] text-white hover:bg-[#435c4c]"
          >
            {copied ? "Link copiado!" : "Copiar link"}
          </Button>

          <div className="divide-y divide-[#2f4538] rounded-md border border-[#2f4538]">
            {state.players.map((player, index) => (
              <div key={player.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <span>
                  {index + 1}. {player.name}
                  {player.id === state.host ? " (anfitrião)" : ""}
                  {player.id === userId ? " — você" : ""}
                </span>
                <Badge variant="outline" className="border-[#557766] text-[#f3ead6]">
                  Time {index % 2 + 1}
                  {player.isBot ? " · bot" : ""}
                </Badge>
              </div>
            ))}
          </div>

          <p className="text-sm text-[#f3ead6]/70">
            {playerCount === 1
              ? "Aguardando jogadores..."
              : playerCount === 3
                ? "Truco se joga em 2 ou 4 pessoas. Aguardando mais um..."
                : "Em 4 jogadores, os parceiros são 1º+3º e 2º+4º."}
          </p>

          {isHost ? (
            <div className="flex flex-wrap gap-2">
              {playerCount < 4 ? (
                <Button variant="secondary" onClick={() => onAction("addBot")}>
                  Adicionar bot
                </Button>
              ) : null}
              {state.players.some((player) => player.isBot) ? (
                <Button variant="secondary" onClick={() => onAction("removeBot")}>
                  Remover bot
                </Button>
              ) : null}
              {canStart ? <Button onClick={() => onAction("start")}>Começar partida</Button> : null}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
