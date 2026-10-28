import * as THREE from "three";
import { MANILHAS, SUIT_SYMBOLS } from "@/types/game";

function drawRoundedCardBase(context: CanvasRenderingContext2D) {
  context.fillStyle = "#fbf6e8";
  context.beginPath();
  context.roundRect(0, 0, 200, 280, 16);
  context.fill();
  context.strokeStyle = "#bbb";
  context.lineWidth = 3;
  context.strokeRect(0, 0, 200, 280);
}

function drawCardBack(context: CanvasRenderingContext2D) {
  context.fillStyle = "#8c1f2b";
  context.fillRect(10, 10, 180, 260);
  context.strokeStyle = "#e8c46a";
  context.lineWidth = 4;
  context.strokeRect(22, 22, 156, 236);
  context.fillStyle = "#e8c46a";
  context.font = "80px serif";
  context.textAlign = "center";
  context.fillText("♠", 100, 160);
}

function drawCardFace(context: CanvasRenderingContext2D, card: string) {
  const isRed = "HD".includes(card.charAt(1));
  context.fillStyle = isRed ? "#c0212f" : "#111";
  context.textAlign = "center";
  context.font = "bold 54px Georgia";
  context.fillText(card.charAt(0), 36, 64);
  context.font = "44px serif";
  context.fillText(SUIT_SYMBOLS[card.charAt(1)], 36, 112);
  context.font = "110px serif";
  context.fillText(SUIT_SYMBOLS[card.charAt(1)], 100, 172);

  context.save();
  context.translate(200, 280);
  context.rotate(Math.PI);
  context.font = "bold 54px Georgia";
  context.fillText(card.charAt(0), 36, 64);
  context.restore();

  if (MANILHAS[card]) {
    context.font = "bold 18px Georgia";
    context.fillStyle = "#b8860b";
    context.fillText("MANILHA", 100, 262);
  }
}

export function createCardTexture(card: string): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 200;
  canvas.height = 280;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D indisponível.");

  drawRoundedCardBase(context);
  if (card === "back") {
    drawCardBack(context);
  } else {
    drawCardFace(context, card);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 4;
  return texture;
}
