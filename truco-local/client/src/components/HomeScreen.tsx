import { useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface HomeScreenProps {
  defaultName: string;
  defaultCode: string;
  isConnecting: boolean;
  error: string;
  onConnect: (name: string, code: string, shouldCreate: boolean) => void;
}

export function HomeScreen({ defaultName, defaultCode, isConnecting, error, onConnect }: HomeScreenProps) {
  const [name, setName] = useState(defaultName);
  const [code, setCode] = useState(defaultCode);

  const submit = (shouldCreate: boolean) => (event: FormEvent) => {
    event.preventDefault();
    onConnect(name.trim() || "Jogador", code.trim().toUpperCase(), shouldCreate);
  };

  return (
    <div className="fixed inset-0 z-20 grid place-items-center bg-black/55 p-4">
      <Card className="w-full max-w-[390px] border-[#c9a24a] bg-[#1b2a22]/95 text-center text-[#f3ead6] shadow-2xl backdrop-blur">
        <CardHeader>
          <CardTitle className="text-2xl text-[#e8c46a]">Truco Mineiro</CardTitle>
          <CardDescription className="text-[#f3ead6]/70">
            Jogue com amigos em tempo real
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-3" onSubmit={submit(true)}>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={14}
              placeholder="Seu nome"
              className="border-[#557766] bg-[#0f1a14] text-center text-white"
            />
            <Button
              type="submit"
              disabled={isConnecting}
              className="w-full bg-[#c9a24a] font-bold text-[#1a1208] hover:bg-[#e0bf62]"
            >
              Criar sala
            </Button>
          </form>

          <div className="my-3 text-sm text-[#f3ead6]/65">ou entre com um código</div>
          <form className="space-y-3" onSubmit={submit(false)}>
            <Input
              value={code}
              onChange={(event) => setCode(event.target.value)}
              maxLength={6}
              placeholder="CÓDIGO"
              className="border-[#557766] bg-[#0f1a14] text-center uppercase text-white"
            />
            <Button
              type="submit"
              variant="secondary"
              disabled={isConnecting || !code.trim()}
              className="w-full bg-[#35493d] text-white hover:bg-[#435c4c]"
            >
              Entrar
            </Button>
          </form>
          {error ? <p className="mt-3 min-h-5 text-sm text-[#f08a7a]">{error}</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}
