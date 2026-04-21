import {
  BEER_RADIUS,
  CRATE_HEIGHT,
  CRATE_WIDTH,
  CRATE_Y,
  GAMEPLAY_WIDTH,
  LOGICAL_HEIGHT,
  LOGICAL_WIDTH,
  PICK_CARD_GAP,
  PICK_CARD_HEIGHT,
  PICK_CARD_TOP,
  PICK_CARD_WIDTH,
  STAGE_PANEL_WIDTH,
} from "./constants";
import {
  computeLandscapeLayout,
  computePortraitPickLayout,
  computePortraitPlayLayout,
  isPortraitScreen,
} from "./layout";
import type { GameState } from "./types";

const baseUrl = import.meta.env.BASE_URL;

const assets = {
  bg: `${baseUrl}sprites/bg.png`,
  bgStage: `${baseUrl}sprites/bg_stage.png`,
  beer: `${baseUrl}sprites/beer_bottle.png`,
  crate: `${baseUrl}sprites/crate.png`,
  cap: `${baseUrl}sprites/cap.png`,
  girl1: `${baseUrl}sprites/girls/1/girl_1_1.png`,
  girl2: `${baseUrl}sprites/girls/2/girl_2_1.png`,
  girl3: `${baseUrl}sprites/girls/3/girl_3_1.png`,
};

const imageCache = new Map<string, HTMLImageElement>();
const lastReadyGirlStageByGirl = new Map<1 | 2 | 3, HTMLImageElement>();
const lastReadyGlassByStage = new Map<number, HTMLImageElement>();

const getImage = (src: string): HTMLImageElement => {
  const cached = imageCache.get(src);
  if (cached) return cached;
  const img = new Image();
  img.src = src;
  imageCache.set(src, img);
  return img;
};

const isImageReady = (img: HTMLImageElement | null | undefined): img is HTMLImageElement =>
  Boolean(img && img.complete && img.naturalWidth > 0);

const getGirlStageImage = (
  selectedGirl: 1 | 2 | 3 | null,
  stageIndex: number,
): HTMLImageElement | null => {
  if (!selectedGirl) return null;
  const stageNumber = Math.max(1, Math.min(5, stageIndex + 1));
  const src = `${baseUrl}sprites/girls/${selectedGirl}/girl_${selectedGirl}_${stageNumber}.png`;
  return getImage(src);
};

const paintPickLogical = (ctx: CanvasRenderingContext2D, state: GameState): void => {
  const bgImage = getImage(assets.bg);
  const girl1Image = getImage(assets.girl1);
  const girl2Image = getImage(assets.girl2);
  const girl3Image = getImage(assets.girl3);

  if (bgImage.complete && bgImage.naturalWidth > 0) {
    ctx.drawImage(bgImage, 0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
  }
  ctx.fillStyle = "#cdb84a";
  ctx.textAlign = "center";
  ctx.font = "700 110px Inter, Arial, sans-serif";
  ctx.fillText("Pick Your Girl", LOGICAL_WIDTH / 2, 210);
  ctx.fillStyle = "#ffffff";
  ctx.font = "600 52px Inter, Arial, sans-serif";
  ctx.fillText("Tap or click one card to start", LOGICAL_WIDTH / 2, 290);

  const cardTop = PICK_CARD_TOP;
  const cardWidth = PICK_CARD_WIDTH;
  const cardHeight = PICK_CARD_HEIGHT;
  const gap = PICK_CARD_GAP;
  const totalWidth = cardWidth * 3 + gap * 2;
  const startX = (LOGICAL_WIDTH - totalWidth) / 2;
  const girls = [girl1Image, girl2Image, girl3Image];
  for (let i = 0; i < girls.length; i += 1) {
    const x = startX + i * (cardWidth + gap);
    const img = girls[i];
    const isAvailable = i === 0;
    const isHovered = state.hoveredGirl === i + 1;
    const lift = isHovered ? 34 : 0;
    const drawY = cardTop - lift;
    const shadowAlpha = isHovered ? 0.42 : 0.22;
    ctx.fillStyle = `rgba(0, 0, 0, ${shadowAlpha})`;
    ctx.beginPath();
    ctx.roundRect(x + 14, drawY + 22, cardWidth, cardHeight, 28);
    ctx.fill();
    if (isAvailable && img.complete && img.naturalWidth > 0) {
      const fitScale = Math.min(
        cardWidth / img.naturalWidth,
        cardHeight / img.naturalHeight,
      );
      const drawW = img.naturalWidth * fitScale;
      const drawH = img.naturalHeight * fitScale;
      const drawX = x + (cardWidth - drawW) / 2;
      const drawImageY = drawY + (cardHeight - drawH) / 2;
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(x, drawY, cardWidth, cardHeight, 28);
      ctx.clip();
      ctx.drawImage(img, drawX, drawImageY, drawW, drawH);
      ctx.restore();
    } else if (!isAvailable) {
      const lockGradient = ctx.createLinearGradient(
        0,
        drawY,
        0,
        drawY + cardHeight,
      );
      lockGradient.addColorStop(0, "rgba(20, 20, 26, 0.9)");
      lockGradient.addColorStop(1, "rgba(8, 8, 12, 0.92)");
      ctx.fillStyle = lockGradient;
      ctx.beginPath();
      ctx.roundRect(x, drawY, cardWidth, cardHeight, 28);
      ctx.fill();
      ctx.fillStyle = "rgba(205, 184, 74, 0.95)";
      ctx.textAlign = "center";
      ctx.font = "700 88px Inter, Arial, sans-serif";
      ctx.fillText("LOCKED", x + cardWidth / 2, drawY + cardHeight / 2 - 24);
      ctx.font = "600 44px Inter, Arial, sans-serif";
      ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
      ctx.fillText(
        "Coming soon",
        x + cardWidth / 2,
        drawY + cardHeight / 2 + 56,
      );
    }
    ctx.strokeStyle = isAvailable ? "#cdb84a" : "rgba(150, 150, 160, 0.8)";
    ctx.lineWidth = isHovered ? 10 : 6;
    ctx.beginPath();
    ctx.roundRect(x, drawY, cardWidth, cardHeight, 28);
    ctx.stroke();
    ctx.fillStyle = isAvailable ? "#ffffff" : "rgba(220, 220, 220, 0.85)";
    ctx.font = "700 58px Inter, Arial, sans-serif";
    ctx.fillText(
      isAvailable ? `Girl ${i + 1}` : `Girl ${i + 1} (Locked)`,
      x + cardWidth / 2,
      drawY + cardHeight + 72,
    );
  }
};

const paintPortraitPick = (
  ctx: CanvasRenderingContext2D,
  pixelWidth: number,
  pixelHeight: number,
  state: GameState,
): void => {
  const layout = computePortraitPickLayout(pixelWidth, pixelHeight);
  const bgImage = getImage(assets.bg);
  if (bgImage.complete && bgImage.naturalWidth > 0) {
    const cover = Math.max(
      pixelWidth / bgImage.naturalWidth,
      pixelHeight / bgImage.naturalHeight,
    );
    const dw = bgImage.naturalWidth * cover;
    const dh = bgImage.naturalHeight * cover;
    const ox = (pixelWidth - dw) / 2;
    const oy = (pixelHeight - dh) / 2;
    ctx.save();
    ctx.globalAlpha = 0.4;
    ctx.drawImage(bgImage, ox, oy, dw, dh);
    ctx.restore();
  } else {
    const g = ctx.createLinearGradient(0, 0, 0, pixelHeight);
    g.addColorStop(0, "#0a2418");
    g.addColorStop(1, "#020d08");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, pixelWidth, pixelHeight);
  }

  const titleSize = Math.min(32, pixelWidth * 0.085);
  const subSize = Math.min(16, pixelWidth * 0.04);
  ctx.textAlign = "center";
  ctx.fillStyle = "#cdb84a";
  ctx.font = `700 ${titleSize}px Inter, Arial, sans-serif`;
  ctx.fillText(
    "Pick Your Girl",
    pixelWidth / 2,
    (layout.headerTop + layout.headerBottom) / 2 + titleSize * 0.35,
  );
  ctx.fillStyle = "#ffffff";
  ctx.font = `600 ${subSize}px Inter, Arial, sans-serif`;
  ctx.fillText("Tap a card to start", pixelWidth / 2, layout.headerBottom - 6);

  const girls = [getImage(assets.girl1), getImage(assets.girl2), getImage(assets.girl3)];
  for (let i = 0; i < 3; i += 1) {
    const r = layout.cards[i];
    const img = girls[i];
    const isAvailable = i === 0;
    const isHovered = state.hoveredGirl === (i + 1) as 1 | 2 | 3;
    const lift = isHovered ? Math.min(10, r.h * 0.04) : 0;
    const drawY = r.y - lift;
    const rad = Math.min(28, r.w * 0.06, r.h * 0.08);
    const shadowAlpha = isHovered ? 0.42 : 0.22;
    ctx.fillStyle = `rgba(0, 0, 0, ${shadowAlpha})`;
    ctx.beginPath();
    ctx.roundRect(r.x + 6, drawY + 8, r.w, r.h, rad);
    ctx.fill();

    if (isAvailable && img.complete && img.naturalWidth > 0) {
      const fitScale = Math.min(r.w / img.naturalWidth, r.h / img.naturalHeight);
      const drawW = img.naturalWidth * fitScale;
      const drawH = img.naturalHeight * fitScale;
      const drawX = r.x + (r.w - drawW) / 2;
      const drawImageY = drawY + (r.h - drawH) / 2;
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(r.x, drawY, r.w, r.h, rad);
      ctx.clip();
      ctx.drawImage(img, drawX, drawImageY, drawW, drawH);
      ctx.restore();
    } else if (!isAvailable) {
      const lockGradient = ctx.createLinearGradient(0, drawY, 0, drawY + r.h);
      lockGradient.addColorStop(0, "rgba(20, 20, 26, 0.9)");
      lockGradient.addColorStop(1, "rgba(8, 8, 12, 0.92)");
      ctx.fillStyle = lockGradient;
      ctx.beginPath();
      ctx.roundRect(r.x, drawY, r.w, r.h, rad);
      ctx.fill();
      const lockFont = Math.min(36, r.h * 0.22);
      ctx.fillStyle = "rgba(205, 184, 74, 0.95)";
      ctx.textAlign = "center";
      ctx.font = `700 ${lockFont}px Inter, Arial, sans-serif`;
      ctx.fillText("LOCKED", r.x + r.w / 2, drawY + r.h / 2 - lockFont * 0.2);
      ctx.font = `600 ${lockFont * 0.5}px Inter, Arial, sans-serif`;
      ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
      ctx.fillText("Coming soon", r.x + r.w / 2, drawY + r.h / 2 + lockFont * 0.55);
    }

    ctx.strokeStyle = isAvailable ? "#cdb84a" : "rgba(150, 150, 160, 0.8)";
    ctx.lineWidth = isHovered ? Math.max(3, r.w * 0.018) : Math.max(2, r.w * 0.012);
    ctx.beginPath();
    ctx.roundRect(r.x, drawY, r.w, r.h, rad);
    ctx.stroke();

    const label = isAvailable ? `Girl ${i + 1}` : `Girl ${i + 1} (Locked)`;
    const labelSize = Math.min(22, r.w * 0.065, r.h * 0.14);
    ctx.fillStyle = isAvailable ? "#ffffff" : "rgba(220, 220, 220, 0.9)";
    ctx.font = `700 ${labelSize}px Inter, Arial, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(label, r.x + r.w / 2, drawY + r.h - Math.max(10, labelSize * 0.9));
  }
};

const paintGameplayStrip = (ctx: CanvasRenderingContext2D, state: GameState): void => {
  const bgImage = getImage(assets.bg);
  const beerImage = getImage(assets.beer);
  const crateImage = getImage(assets.crate);
  const capImage = getImage(assets.cap);

  const gameAreaW = GAMEPLAY_WIDTH;
  const hudY = 122;

  const sky = ctx.createLinearGradient(0, 0, 0, LOGICAL_HEIGHT);
  sky.addColorStop(0, "#12293f");
  sky.addColorStop(1, "#1f1024");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

  if (bgImage.complete && bgImage.naturalWidth > 0) {
    ctx.drawImage(bgImage, 0, 0, gameAreaW, LOGICAL_HEIGHT);
  } else {
    ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
    ctx.fillRect(0, 0, gameAreaW, LOGICAL_HEIGHT);
  }

  ctx.fillStyle = "#101010";
  ctx.fillRect(
    0,
    CRATE_Y + CRATE_HEIGHT + 20,
    gameAreaW,
    LOGICAL_HEIGHT - (CRATE_Y + CRATE_HEIGHT + 20),
  );

  if (crateImage.complete && crateImage.naturalWidth > 0) {
    ctx.drawImage(
      crateImage,
      state.crate.x,
      CRATE_Y,
      CRATE_WIDTH,
      CRATE_HEIGHT,
    );
  } else {
    ctx.fillStyle = "#d6a541";
    ctx.fillRect(state.crate.x, CRATE_Y, CRATE_WIDTH, CRATE_HEIGHT);
    ctx.strokeStyle = "#6b4518";
    ctx.lineWidth = 14;
    ctx.strokeRect(state.crate.x, CRATE_Y, CRATE_WIDTH, CRATE_HEIGHT);
  }

  for (const beer of state.beers) {
    if (beerImage.complete && beerImage.naturalWidth > 0) {
      ctx.drawImage(
        beerImage,
        beer.x - BEER_RADIUS,
        beer.y - BEER_RADIUS,
        BEER_RADIUS * 2,
        BEER_RADIUS * 2,
      );
    } else {
      ctx.fillStyle = "#f4b616";
      ctx.beginPath();
      ctx.arc(beer.x, beer.y, BEER_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#7b4a00";
      ctx.lineWidth = 10;
      ctx.stroke();
    }
  }

  ctx.fillStyle = "#ffffff";
  ctx.font = "700 68px Inter, Arial, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(`Score: ${state.score}`, 80, hudY);

  const glassStage = Math.max(1, Math.min(5, state.level));
  const desiredGlassImage = getImage(`${baseUrl}sprites/glass_${glassStage}.png`);
  if (isImageReady(desiredGlassImage)) {
    lastReadyGlassByStage.set(glassStage, desiredGlassImage);
  }
  let glassImage: HTMLImageElement | null = isImageReady(desiredGlassImage)
    ? desiredGlassImage
    : lastReadyGlassByStage.get(glassStage) ?? null;
  if (!glassImage) {
    for (let stage = glassStage - 1; stage >= 1; stage -= 1) {
      const previous = lastReadyGlassByStage.get(stage);
      if (previous) {
        glassImage = previous;
        break;
      }
    }
  }
  const glassH = 360;
  const glassY = 148;
  let glassW = 150;
  if (isImageReady(glassImage) && glassImage.naturalHeight > 0) {
    glassW = (glassImage.naturalWidth / glassImage.naturalHeight) * glassH;
  }
  const glassX = 80 + (320 - glassW) / 2;
  if (isImageReady(glassImage)) {
    ctx.drawImage(glassImage, glassX, glassY, glassW, glassH);
  } else {
    ctx.fillStyle = "rgba(205, 184, 74, 0.45)";
    ctx.fillRect(glassX, glassY, glassW, glassH);
    ctx.strokeStyle = "rgba(205, 184, 74, 0.9)";
    ctx.lineWidth = 5;
    ctx.strokeRect(glassX, glassY, glassW, glassH);
  }

  const capSize = 92;
  const capGap = 14;
  const capsY = LOGICAL_HEIGHT - capSize - 84;
  const capsTotalW =
    state.lives * capSize + Math.max(0, state.lives - 1) * capGap;
  const capsStartX = gameAreaW - capsTotalW - 70;
  for (let i = 0; i < state.lives; i += 1) {
    const x = capsStartX + i * (capSize + capGap);
    if (capImage.complete && capImage.naturalWidth > 0) {
      ctx.drawImage(capImage, x, capsY, capSize, capSize);
    } else {
      ctx.fillStyle = "#cdb84a";
      ctx.fillRect(x, capsY, capSize, capSize);
      ctx.strokeStyle = "#103724";
      ctx.lineWidth = 6;
      ctx.strokeRect(x, capsY, capSize, capSize);
    }
  }

  if (state.isGameOver) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
    ctx.fillRect(0, 0, gameAreaW, LOGICAL_HEIGHT);
    ctx.fillStyle = "#ffdd77";
    ctx.textAlign = "center";
    ctx.font = "700 120px Inter, Arial, sans-serif";
    ctx.fillText("GAME OVER", gameAreaW / 2, LOGICAL_HEIGHT / 2 - 40);
    ctx.font = "700 64px Inter, Arial, sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.fillText("Use Restart button", gameAreaW / 2, LOGICAL_HEIGHT / 2 + 90);
  }
};

const paintStageStrip = (ctx: CanvasRenderingContext2D, state: GameState): void => {
  const bgStageImage = getImage(assets.bgStage);
  const stagePanelW = STAGE_PANEL_WIDTH;
  const gameAreaW = GAMEPLAY_WIDTH;

  if (bgStageImage.complete && bgStageImage.naturalWidth > 0) {
    const srcAspect = bgStageImage.naturalWidth / bgStageImage.naturalHeight;
    const dstAspect = stagePanelW / LOGICAL_HEIGHT;
    let sx = 0;
    let sy = 0;
    let sw = bgStageImage.naturalWidth;
    let sh = bgStageImage.naturalHeight;
    if (srcAspect > dstAspect) {
      sw = sh * dstAspect;
      sx = (bgStageImage.naturalWidth - sw) / 2;
    } else {
      sh = sw / dstAspect;
      sy = (bgStageImage.naturalHeight - sh) / 2;
    }
    ctx.drawImage(
      bgStageImage,
      sx,
      sy,
      sw,
      sh,
      gameAreaW,
      0,
      stagePanelW,
      LOGICAL_HEIGHT,
    );
    ctx.fillStyle = "rgba(10, 8, 18, 0.35)";
    ctx.fillRect(gameAreaW, 0, stagePanelW, LOGICAL_HEIGHT);
  } else {
    ctx.fillStyle = "rgba(10, 8, 18, 0.85)";
    ctx.fillRect(gameAreaW, 0, stagePanelW, LOGICAL_HEIGHT);
  }

  const panelX = gameAreaW + 8;
  const panelY = 8;
  const panelW = stagePanelW - 16;
  const panelH = LOGICAL_HEIGHT - 16;
  const panelRadius = 44;

  ctx.strokeStyle = "#cdb84a";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.roundRect(panelX, panelY, panelW, panelH, panelRadius);
  ctx.stroke();

  const girlRectX = gameAreaW + 72;
  const girlRectY = 72;
  const girlRectW = stagePanelW - 144;
  const girlRectH = LOGICAL_HEIGHT - 144;
  const desiredStageGirlImage = getGirlStageImage(
    state.selectedGirl,
    state.stageIndex,
  );
  if (state.selectedGirl && isImageReady(desiredStageGirlImage)) {
    lastReadyGirlStageByGirl.set(state.selectedGirl, desiredStageGirlImage);
  }
  const stageGirlImage =
    state.selectedGirl !== null
      ? (isImageReady(desiredStageGirlImage)
          ? desiredStageGirlImage
          : (lastReadyGirlStageByGirl.get(state.selectedGirl) ?? null))
      : null;
  if (isImageReady(stageGirlImage)) {
    const srcW = stageGirlImage.naturalWidth;
    const srcH = stageGirlImage.naturalHeight;
    const fitScale = Math.min(girlRectW / srcW, girlRectH / srcH);
    const drawW = srcW * fitScale;
    const drawH = srcH * fitScale;
    const drawX = girlRectX + (girlRectW - drawW) / 2;
    const drawY = girlRectY + (girlRectH - drawH) / 2;
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(girlRectX, girlRectY, girlRectW, girlRectH, 28);
    ctx.clip();
    ctx.drawImage(stageGirlImage, drawX, drawY, drawW, drawH);
    ctx.restore();
    ctx.fillStyle = "rgba(0, 0, 0, 0.08)";
  } else {
    const placeholderGradient = ctx.createLinearGradient(
      0,
      girlRectY,
      0,
      girlRectY + girlRectH,
    );
    placeholderGradient.addColorStop(0, "rgba(16, 55, 36, 0.45)");
    placeholderGradient.addColorStop(1, "rgba(177, 0, 15, 0.18)");
    ctx.fillStyle = placeholderGradient;
  }
  ctx.beginPath();
  ctx.roundRect(girlRectX, girlRectY, girlRectW, girlRectH, 28);
  ctx.fill();
  ctx.strokeStyle = "rgba(205, 184, 74, 0.92)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(girlRectX, girlRectY, girlRectW, girlRectH, 28);
  ctx.stroke();
  if (!isImageReady(stageGirlImage)) {
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.textAlign = "center";
    ctx.font = "700 54px Inter, Arial, sans-serif";
    ctx.fillText(
      "Loading stage artwork...",
      gameAreaW + stagePanelW / 2,
      girlRectY + girlRectH / 2,
    );
  }
};

export const setupCanvas = (
  canvas: HTMLCanvasElement,
): CanvasRenderingContext2D => {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D context missing");
  return ctx;
};

export const resizeCanvas = (canvas: HTMLCanvasElement): void => {
  const dpr = window.devicePixelRatio || 1;
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
};

export const draw = (
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  state: GameState,
): void => {
  const dpr = window.devicePixelRatio || 1;
  const pixelWidth = canvas.width / dpr;
  const pixelHeight = canvas.height / dpr;

  if (state.phase === "pick") {
    if (isPortraitScreen(pixelWidth, pixelHeight)) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, pixelWidth, pixelHeight);
      paintPortraitPick(ctx, pixelWidth, pixelHeight, state);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      return;
    }
    const layout = computeLandscapeLayout(pixelWidth, pixelHeight);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, pixelWidth, pixelHeight);
    ctx.fillStyle = "#051a11";
    ctx.fillRect(0, 0, pixelWidth, pixelHeight);
    ctx.translate(layout.offsetX, layout.offsetY);
    ctx.scale(layout.renderWidth / LOGICAL_WIDTH, layout.renderHeight / LOGICAL_HEIGHT);
    paintPickLogical(ctx, state);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    return;
  }

  if (isPortraitScreen(pixelWidth, pixelHeight)) {
    const pl = computePortraitPlayLayout(pixelWidth, pixelHeight);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, pixelWidth, pixelHeight);
    ctx.fillStyle = "#051a11";
    ctx.fillRect(0, 0, pixelWidth, pixelHeight);
    const { game, stage } = pl;
    ctx.save();
    ctx.beginPath();
    ctx.rect(game.x, game.y, game.w, game.h);
    ctx.clip();
    ctx.translate(game.x, game.y);
    ctx.scale(game.w / GAMEPLAY_WIDTH, game.h / LOGICAL_HEIGHT);
    paintGameplayStrip(ctx, state);
    ctx.restore();
    ctx.save();
    ctx.beginPath();
    ctx.rect(stage.x, stage.y, stage.w, stage.h);
    ctx.clip();
    ctx.translate(stage.x, stage.y);
    ctx.scale(stage.w / STAGE_PANEL_WIDTH, stage.h / LOGICAL_HEIGHT);
    ctx.translate(-GAMEPLAY_WIDTH, 0);
    paintStageStrip(ctx, state);
    ctx.restore();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    return;
  }

  const layout = computeLandscapeLayout(pixelWidth, pixelHeight);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, pixelWidth, pixelHeight);
  ctx.fillStyle = "#051a11";
  ctx.fillRect(0, 0, pixelWidth, pixelHeight);
  ctx.translate(layout.offsetX, layout.offsetY);
  ctx.scale(layout.renderWidth / LOGICAL_WIDTH, layout.renderHeight / LOGICAL_HEIGHT);
  paintGameplayStrip(ctx, state);
  paintStageStrip(ctx, state);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
};
