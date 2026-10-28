import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { openGameStream, TrucoApi } from "@/services/TrucoApi";
import type { GameAction, GameState } from "@/types/game";
import { canAskTruco } from "@/types/game";

const USER_ID_KEY = "trucoId";
const USER_NAME_KEY = "trucoNome";

function createUserId(): string {
  return `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

function readStoredValue(key: string): string {
  try {
    return localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

function writeStoredValue(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // O jogo continua funcionando sem persistência local.
  }
}

export function useTrucoGame() {
  const api = useMemo(() => new TrucoApi(), []);
  const userId = useMemo(() => {
    const storedId = readStoredValue(USER_ID_KEY);
    if (storedId) return storedId;
    const newId = createUserId();
    writeStoredValue(USER_ID_KEY, newId);
    return newId;
  }, []);

  const [savedName, setSavedName] = useState(() => readStoredValue(USER_NAME_KEY));
  const [roomCodeFromUrl] = useState(
    () => new URLSearchParams(window.location.search).get("sala")?.toUpperCase() ?? ""
  );
  const [code, setCode] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [state, setState] = useState<GameState | null>(null);
  const [error, setError] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const streamRef = useRef<EventSource | null>(null);

  const closeStream = useCallback(() => {
    streamRef.current?.close();
    streamRef.current = null;
  }, []);

  const connect = useCallback(
    async (name: string, roomCode: string, shouldCreate: boolean) => {
      setError("");
      setIsConnecting(true);

      try {
        const credentials = shouldCreate
          ? await api.createRoom(userId, name)
          : await api.joinRoom(userId, name, roomCode.toUpperCase());

        if (credentials.error) {
          throw new Error(credentials.error);
        }
        if (!credentials.code) {
          throw new Error("O servidor não retornou um código de sala.");
        }

        closeStream();
        setCode(credentials.code);
        setToken(credentials.token ?? null);
        writeStoredValue(USER_NAME_KEY, name);
        setSavedName(name);
        window.history.replaceState(null, "", `?sala=${credentials.code}`);
        streamRef.current = openGameStream(credentials.code, userId, credentials.token ?? null, setState);
      } catch (connectionError) {
        setError(connectionError instanceof Error ? connectionError.message : "Não foi possível entrar na sala.");
      } finally {
        setIsConnecting(false);
      }
    },
    [api, closeStream, userId]
  );

  const send = useCallback(
    async (action: GameAction) => {
      if (!code) return;
      const response = await api.sendAction(userId, code, token, action);
      if (response.error) setError(response.error);
    },
    [api, code, token, userId]
  );

  useEffect(() => closeStream, [closeStream]);

  const mySeat = state?.players.findIndex((player) => player.id === userId) ?? -1;
  const isHost = Boolean(state && state.host === userId);
  const isMyTurn = Boolean(
    state && state.phase === "play" && !state.pend && state.turn === mySeat && mySeat >= 0
  );
  const canPlay = isMyTurn;

  return {
    userId,
    savedName,
    roomCodeFromUrl,
    code,
    state,
    error,
    isConnecting,
    mySeat,
    isHost,
    canPlay,
    canAskTruco: canAskTruco(state, mySeat),
    connect,
    send,
  };
}
