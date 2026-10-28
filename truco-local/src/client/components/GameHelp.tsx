import type { ReactNode } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const BET_SEQUENCE = [
  { label: "1", name: "Mão normal" },
  { label: "3", name: "TRUCO" },
  { label: "6", name: "SEIS" },
  { label: "9", name: "NOVE" },
  { label: "12", name: "DOZE" },
];

const MANILHAS = ["4♣", "7♥", "A♠", "7♦"];

const ORDINARY = ["3", "2", "A", "K", "J", "Q", "7", "6", "5", "4"];

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="font-western mt-5 text-base tracking-wide text-[#ffd77a] first:mt-0">
      {children}
    </h3>
  );
}

export function GameHelp() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label="Regras do jogo"
          className="font-western fixed right-3 top-3 z-30 flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#c9a227] bg-[#241505]/90 text-xl text-[#ffd77a] shadow-[0_2px_10px_#000] transition-colors hover:bg-[#3a2410]"
        >
          ?
        </button>
      </DialogTrigger>
      <DialogContent className="font-fell max-h-[85vh] overflow-y-auto border-2 border-[#5a3a1e] bg-[#1d1207] text-[#f3ead6] shadow-[0_10px_40px_#000]">
        <DialogHeader>
          <DialogTitle className="font-western text-2xl text-[#ffd77a]">
            Regras do Truco Mineiro
          </DialogTitle>
        </DialogHeader>

        <div className="text-sm leading-relaxed">
          <SectionTitle>Sequência das apostas</SectionTitle>
          <p>
            Em qualquer momento da sua vez, você pode pedir para aumentar o valor da mão.
            O adversário pode <strong className="text-[#ffd77a]">aceitar</strong>,{" "}
            <strong className="text-[#ffd77a]">correr</strong> (perde os pontos atuais) ou{" "}
            <strong className="text-[#ffd77a]">aumentar ainda mais</strong>:
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {BET_SEQUENCE.map((step, index) => (
              <span key={step.label} className="flex items-center gap-1.5">
                <span className="rounded-md border border-[#c9a227] bg-[#140c04] px-2.5 py-1 text-[#ffd77a]">
                  {step.label} · {step.name}
                </span>
                {index < BET_SEQUENCE.length - 1 ? (
                  <span className="text-[#8a6a3a]">→</span>
                ) : null}
              </span>
            ))}
          </div>

          <SectionTitle>Manilhas (as mais fortes)</SectionTitle>
          <p>Na ordem, do mais forte para o mais fraco:</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {MANILHAS.map((card) => (
              <span
                key={card}
                className="rounded-md border border-[#8a6a3a] bg-[#241505] px-3 py-1 text-base text-[#ffd77a]"
              >
                {card}
              </span>
            ))}
          </div>

          <SectionTitle>Demais cartas (maior → menor)</SectionTitle>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {ORDINARY.map((card) => (
              <span
                key={card}
                className="rounded border border-[#5a3a1e] bg-[#140c04] px-2 py-0.5 text-[#e8d5ae]"
              >
                {card}
              </span>
            ))}
          </div>

          <SectionTitle>Como funciona a mão</SectionTitle>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            <li>Cada jogador recebe 3 cartas e valem 3 vazas (rodadas) por mão.</li>
            <li>Vence a mão quem fizer 2 vazas primeiro.</li>
            <li>Se a primeira vaza empatar, a segunda decide.</li>
            <li>Se a segunda também empatar, decide a terceira; persistindo o empate, vence quem foi o primeiro a jogar na mão.</li>
          </ul>

          <SectionTitle>A partida</SectionTitle>
          <p>
            A partida vale <strong className="text-[#ffd77a]">12 pontos</strong>. Jogue com 2 ou 4
            jogadores (em duplas, sentados alternadamente). Na <strong className="text-[#ffd77a]">mão de 10</strong>{" "}
            (ou 11), não é permitido pedir truco.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
