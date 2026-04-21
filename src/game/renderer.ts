import {
  BEER_RADIUS,
  CRATE_HEIGHT,
  CRATE_WIDTH,
  CRATE_Y,
  GAMEPLAY_WIDTH,
  LOGICAL_HEIGHT,
  LOGICAL_WIDTH,
  OUTFIT_STAGES,
  PICK_CARD_GAP,
  PICK_CARD_HEIGHT,
  PICK_CARD_TOP,
  PICK_CARD_WIDTH,
  STAGE_PANEL_WIDTH,
} from "./constants";
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

const getImage = (src: string): HTMLImageElement => {
  const cached = imageCache.get(src);
  if (cached) return cached;
  const img = new Image();
  img.src = src;
  imageCache.set(src, img);
  return img;
};

const getGirlStageImage = (
  selectedGirl: 1 | 2 | 3 | null,
  stageIndex: number,
): HTMLImageElement | null => {
  if (!selectedGirl) return null;
  const stageNumber = Math.max(1, Math.min(5, stageIndex + 1));
  const src = `${baseUrl}sprites/girls/${selectedGirl}/girl_${selectedGirl}_${stageNumber}.png`;
  return getImage(src);
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
  const width = canvas.width / dpr;
  const height = canvas.height / dpr;
  const scaleX = width / LOGICAL_WIDTH;
  const scaleY = height / LOGICAL_HEIGHT;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);

  ctx.fillStyle = "#051a11";
  ctx.fillRect(0, 0, width, height);

  ctx.scale(scaleX, scaleY);

  const bgImage = getImage(assets.bg);
  const bgStageImage = getImage(assets.bgStage);
  const girl1Image = getImage(assets.girl1);
  const girl2Image = getImage(assets.girl2);
  const girl3Image = getImage(assets.girl3);
  const beerImage = getImage(assets.beer);
  const crateImage = getImage(assets.crate);
  const capImage = getImage(assets.cap);

  const stagePanelW = STAGE_PANEL_WIDTH;
  const gameAreaW = GAMEPLAY_WIDTH;
  const hudY = 122;

  if (state.phase === "pick") {
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
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    return;
  }

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
  const glassImage = getImage(`${baseUrl}sprites/glass_${glassStage}.png`);
  const glassH = 360;
  const glassY = 148;
  let glassW = 150;
  if (glassImage.complete && glassImage.naturalWidth > 0 && glassImage.naturalHeight > 0) {
    glassW = (glassImage.naturalWidth / glassImage.naturalHeight) * glassH;
  }
  const glassX = 80 + (320 - glassW) / 2;
  if (glassImage.complete && glassImage.naturalWidth > 0) {
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
  const stageGirlImage = getGirlStageImage(
    state.selectedGirl,
    state.stageIndex,
  );
  if (
    stageGirlImage &&
    stageGirlImage.complete &&
    stageGirlImage.naturalWidth > 0
  ) {
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
  if (
    !stageGirlImage ||
    !stageGirlImage.complete ||
    stageGirlImage.naturalWidth <= 0
  ) {
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.textAlign = "center";
    ctx.font = "700 54px Inter, Arial, sans-serif";
    ctx.fillText(
      "Loading stage artwork...",
      gameAreaW + stagePanelW / 2,
      girlRectY + girlRectH / 2,
    );
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

  ctx.setTransform(1, 0, 0, 1, 0, 0);
};
