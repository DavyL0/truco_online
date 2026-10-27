import type { GameAction, GameState } from "@/types/game";

interface RoomCredentials {
  code?: string;
  token?: string | null;
  error?: string;
}

export class TrucoApi {
  private async post<T>(url: string, body: unknown): Promise<T> {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    return response.json() as Promise<T>;
  }

  createRoom(userId: string, name: string) {
    return this.post<RoomCredentials>("/api/create", { id: userId, name });
  }

  joinRoom(userId: string, name: string, code: string) {
    return this.post<RoomCredentials>("/api/join", { id: userId, name, code });
  }

  sendAction(userId: string, code: string, token: string | null, action: GameAction) {
    return this.post<{ ok?: number; error?: string }>("/api/act", {
      ...action,
      code,
      id: userId,
      token,
    });
  }
}

export function openGameStream(
  code: string,
  userId: string,
  token: string | null,
  onState: (state: GameState) => void
): EventSource {
  const source = new EventSource(
    `/api/events?code=${encodeURIComponent(code)}&id=${encodeURIComponent(userId)}&token=${encodeURIComponent(token ?? "")}`
  );
  source.onmessage = (event) => onState(JSON.parse(event.data) as GameState);
  return source;
}
