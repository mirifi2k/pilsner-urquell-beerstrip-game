import {
  GAMEPLAY_WIDTH,
  LOGICAL_HEIGHT,
  LOGICAL_WIDTH,
  STAGE_PANEL_WIDTH,
} from "./constants";

export type LayoutKind = "landscape" | "portrait";

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface LandscapeLayout {
  kind: "landscape";
  offsetX: number;
  offsetY: number;
  renderWidth: number;
  renderHeight: number;
}

export interface PortraitPlayLayout {
  kind: "portrait";
  game: Rect;
  stage: Rect;
  gap: number;
}

export interface PortraitPickLayout {
  kind: "portrait";
  cards: [Rect, Rect, Rect];
  headerTop: number;
  headerBottom: number;
}

export type PlayLayout = LandscapeLayout | PortraitPlayLayout;
export type PickLayout = LandscapeLayout | PortraitPickLayout;

const logicalAspect = LOGICAL_WIDTH / LOGICAL_HEIGHT;

export const isPortraitScreen = (pixelWidth: number, pixelHeight: number): boolean =>
  pixelHeight > pixelWidth;

export const computeLandscapeLayout = (
  pixelWidth: number,
  pixelHeight: number,
): LandscapeLayout => {
  const rectAspect = pixelWidth / pixelHeight || logicalAspect;
  let renderWidth = pixelWidth;
  let renderHeight = pixelHeight;
  if (rectAspect > logicalAspect) {
    renderHeight = pixelHeight;
    renderWidth = renderHeight * logicalAspect;
  } else {
    renderWidth = pixelWidth;
    renderHeight = renderWidth / logicalAspect;
  }
  const offsetX = (pixelWidth - renderWidth) / 2;
  const offsetY = (pixelHeight - renderHeight) / 2;
  return { kind: "landscape", offsetX, offsetY, renderWidth, renderHeight };
};

export const computePortraitPlayLayout = (
  pixelWidth: number,
  pixelHeight: number,
): PortraitPlayLayout => {
  const gap = Math.max(6, Math.min(14, pixelHeight * 0.012));
  const hGameNatural = (pixelWidth * LOGICAL_HEIGHT) / GAMEPLAY_WIDTH;
  const hStageNatural = (pixelWidth * LOGICAL_HEIGHT) / STAGE_PANEL_WIDTH;
  const totalNatural = hGameNatural + hStageNatural + gap;
  const k = totalNatural > pixelHeight ? pixelHeight / totalNatural : 1;
  const w = pixelWidth * k;
  const x = (pixelWidth - w) / 2;
  const hg = hGameNatural * k;
  const hs = hStageNatural * k;
  const stackH = hg + hs + gap * k;
  const y0 = (pixelHeight - stackH) / 2;
  return {
    kind: "portrait",
    game: { x, y: y0, w, h: hg },
    stage: { x, y: y0 + hg + gap * k, w, h: hs },
    gap: gap * k,
  };
};

export const computePortraitPickLayout = (
  pixelWidth: number,
  pixelHeight: number,
): PortraitPickLayout => {
  const pad = Math.max(12, Math.min(28, pixelWidth * 0.045));
  const headerTop = pad;
  const headerBottom = headerTop + Math.min(110, pixelHeight * 0.14);
  const top = headerBottom + pad * 0.5;
  const bottomPad = pad + Math.min(28, pixelHeight * 0.04);
  const availH = Math.max(pixelHeight * 0.55, pixelHeight - top - bottomPad);
  const cardGap = Math.max(8, Math.min(16, pixelWidth * 0.025));
  const cardW = pixelWidth - pad * 2;
  const cardH = (availH - cardGap * 2) / 3;
  const x = pad;
  const cards: [Rect, Rect, Rect] = [
    { x, y: top, w: cardW, h: cardH },
    { x, y: top + cardH + cardGap, w: cardW, h: cardH },
    { x, y: top + (cardH + cardGap) * 2, w: cardW, h: cardH },
  ];
  return { kind: "portrait", cards, headerTop, headerBottom };
};

export interface LogicalPoint {
  logicalX: number;
  logicalY: number;
  gameplayX: number;
}

/** Map client coords to logical space; returns null if outside the active play area. */
export const clientToLogicalPlay = (
  clientX: number,
  clientY: number,
  canvasRect: DOMRect,
  pixelWidth: number,
  pixelHeight: number,
): LogicalPoint | null => {
  const px = clientX - canvasRect.left;
  const py = clientY - canvasRect.top;
  if (px < 0 || py < 0 || px > pixelWidth || py > pixelHeight) return null;

  if (isPortraitScreen(pixelWidth, pixelHeight)) {
    const { game } = computePortraitPlayLayout(pixelWidth, pixelHeight);
    if (
      px < game.x ||
      py < game.y ||
      px > game.x + game.w ||
      py > game.y + game.h
    ) {
      return null;
    }
    const nx = (px - game.x) / game.w;
    const ny = (py - game.y) / game.h;
    const logicalX = nx * GAMEPLAY_WIDTH;
    const logicalY = ny * LOGICAL_HEIGHT;
    return {
      logicalX,
      logicalY,
      gameplayX: Math.max(0, Math.min(GAMEPLAY_WIDTH, logicalX)),
    };
  }

  const layout = computeLandscapeLayout(pixelWidth, pixelHeight);
  const xIn = px - layout.offsetX;
  const yIn = py - layout.offsetY;
  if (
    xIn < 0 ||
    yIn < 0 ||
    xIn > layout.renderWidth ||
    yIn > layout.renderHeight
  ) {
    return null;
  }
  const nx = xIn / layout.renderWidth;
  const ny = yIn / layout.renderHeight;
  const logicalX = nx * LOGICAL_WIDTH;
  const logicalY = ny * LOGICAL_HEIGHT;
  return {
    logicalX,
    logicalY,
    gameplayX: Math.max(0, Math.min(GAMEPLAY_WIDTH, logicalX)),
  };
};

/** Which girl card (1–3) is under the pointer in portrait pick layout; null if none. */
export const hitTestPortraitPickCard = (
  clientX: number,
  clientY: number,
  canvasRect: DOMRect,
  pixelWidth: number,
  pixelHeight: number,
): 1 | 2 | 3 | null => {
  const px = clientX - canvasRect.left;
  const py = clientY - canvasRect.top;
  const { cards } = computePortraitPickLayout(pixelWidth, pixelHeight);
  for (let i = 0; i < 3; i += 1) {
    const r = cards[i];
    if (px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) {
      return (i + 1) as 1 | 2 | 3;
    }
  }
  return null;
};

/** Map client to logical pick screen (landscape letterbox only). */
export const clientToLogicalPickLandscape = (
  clientX: number,
  clientY: number,
  canvasRect: DOMRect,
  pixelWidth: number,
  pixelHeight: number,
): LogicalPoint | null => {
  const layout = computeLandscapeLayout(pixelWidth, pixelHeight);
  const px = clientX - canvasRect.left - layout.offsetX;
  const py = clientY - canvasRect.top - layout.offsetY;
  if (
    px < 0 ||
    py < 0 ||
    px > layout.renderWidth ||
    py > layout.renderHeight
  ) {
    return null;
  }
  const nx = px / layout.renderWidth;
  const ny = py / layout.renderHeight;
  return {
    logicalX: nx * LOGICAL_WIDTH,
    logicalY: ny * LOGICAL_HEIGHT,
    gameplayX: Math.max(0, Math.min(GAMEPLAY_WIDTH, nx * LOGICAL_WIDTH)),
  };
};
