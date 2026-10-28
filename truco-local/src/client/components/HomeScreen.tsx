import { useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface HomeScreenProps {
  defaultName: string;
  defaultCode: string;
  isConnecting: boolean;
  error: string;
  onConnect: (name: string, code: string, shouldCreate: boolean) => void;
}

const INPUT_CLASS =
  "font-fell border-[#5a3a1e] bg-[#120b03] text-center text-[#f3ead6] placeholder:text-[#8a6a3a] focus-visible:border-[#c9a227] focus-visible:ring-[#c9a227]/40";

export function HomeScreen({ defaultName, defaultCode, isConnecting, error, onConnect }: HomeScreenProps) {
  const [name, setName] = useState(defaultName);
  const [code, setCode] = useState(defaultCode);

  const submit = (shouldCreate: boolean) => (event: FormEvent) => {
    event.preventDefault();
    onConnect(name.trim() || "Jogador", code.trim().toUpperCase(), shouldCreate);
  };

  return (
    <div className="fixed inset-0 z-20 grid place-items-center bg-black/60 p-4">
      <div className="w-full max-w-[420px] rounded-xl border-2 border-[#5a3a1e] bg-gradient-to-b from-[#33200e] to-[#1d1106] p-1.5 shadow-[0_20px_60px_rgba(0,0,0,0.9)]">
        <div className="rounded-lg border border-[#c9a227]/50 px-6 py-7 text-center">
          <h1 className="font-western text-4xl leading-tight text-[#ffd77a] [text-shadow:0_2px_0_#4d3208,0_4px_14px_#000] md:text-5xl">
            Truco Mineiro
          </h1>
          <p className="font-fell mt-1.5 text-sm text-[#cbb27f]">
            Saloon de cartas — jogue com amigos em tempo real
          </p>

          <form className="mt-5 space-y-3" onSubmit={submit(true)}>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={14}
              placeholder="Seu nome"
              className={INPUT_CLASS}
            />
            <Button
              type="submit"
              disabled={isConnecting}
              className="font-western h-11 w-full border-2 border-[#c9a227] bg-[#8f6b1d] text-base tracking-wide text-[#ffe9c9] shadow-[0_3px_10px_#000] hover:brightness-110"
            >
              Criar sala
            </Button>
          </form>

          <div className="font-fell my-4 flex items-center gap-3 text-xs text-[#8a6a3a]">
            <span className="h-px flex-1 bg-[#5a3a1e]" />
            ou entre com um código
            <span className="h-px flex-1 bg-[#5a3a1e]" />
          </div>

          <form className="space-y-3" onSubmit={submit(false)}>
            <Input
              value={code}
              onChange={(event) => setCode(event.target.value)}
              maxLength={6}
              placeholder="CÓDIGO"
              className={`${INPUT_CLASS} font-western uppercase tracking-[0.3em]`}
            />
            <Button
              type="submit"
              disabled={isConnecting || !code.trim()}
              className="font-western h-11 w-full border-2 border-[#c9a227] bg-[#3f2c14] text-base tracking-wide text-[#e8d5ae] shadow-[0_3px_10px_#000] hover:brightness-125"
            >
              Entrar
            </Button>
          </form>

          {error ? (
            <p className="font-fell mt-3 min-h-5 text-sm text-[#f08a7a]">{error}</p>
          ) : (
            <p className="font-fell mt-3 min-h-5 text-xs text-[#6e5330]">
              2 a 4 jogadores · valendo 12 pontos
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
