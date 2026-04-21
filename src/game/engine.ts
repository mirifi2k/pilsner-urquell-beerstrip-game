import {
  BASE_FALL_SPEED,
  BEER_RADIUS,
  BEER_SPAWN_MARGIN,
  CRATE_WIDTH,
  CRATE_Y,
  FALL_SPEED_PER_LEVEL,
  GAMEPLAY_WIDTH,
  LOGICAL_WIDTH,
  LEVEL_TARGET_BASE,
  LEVEL_TARGET_STEP,
  LOGICAL_HEIGHT,
  OUTFIT_STAGES,
  PICK_CARD_GAP,
  PICK_CARD_HEIGHT,
  PICK_CARD_TOP,
  PICK_CARD_WIDTH,
  SPAWN_PER_LEVEL,
  BASE_SPAWN_PER_SECOND,
  STARTING_LIVES,
} from "./constants";
import type { DifficultyState, FallingBeer, GameState } from "./types";

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(value, max));
const randomRange = (min: number, max: number) =>
  min + Math.random() * (max - min);
export const getLevelTarget = (level: number) => {
  if (level <= 1) return LEVEL_TARGET_BASE;
  if (level === 2) return LEVEL_TARGET_BASE + LEVEL_TARGET_STEP * 3;
  if (level === 3) return LEVEL_TARGET_BASE + LEVEL_TARGET_STEP * 4;
  return LEVEL_TARGET_BASE + LEVEL_TARGET_STEP * 4 + (level - 3) * (LEVEL_TARGET_STEP + 4);
};

export const createInitialState = (): GameState => ({
  phase: "pick",
  selectedGirl: null,
  hoveredGirl: null,
  levelFreezeRemaining: 0,
  crate: {
    x: GAMEPLAY_WIDTH / 2 - CRATE_WIDTH / 2,
    speed: 0,
  },
  beers: [],
  input: { left: false, right: false },
  level: 1,
  score: 0,
  caughtThisLevel: 0,
  lives: STARTING_LIVES,
  stageIndex: 0,
  totalCaught: 0,
  timeSinceSpawn: 0,
  nextBeerId: 1,
  isGameOver: false,
  message: "Move mouse to steer the crate.",
});

export const resetGame = (): GameState => createInitialState();

export const setCrateFromPointerX = (
  state: GameState,
  pointerX: number,
): GameState => {
  if (state.isGameOver || state.phase !== "play" || state.levelFreezeRemaining > 0) return state;
  const clampedX = clamp(
    pointerX - CRATE_WIDTH / 2,
    0,
    GAMEPLAY_WIDTH - CRATE_WIDTH,
  );
  if (clampedX === state.crate.x) return state;
  return { ...state, crate: { ...state.crate, x: clampedX } };
};

export const pickGirl = (state: GameState, girlId: 1 | 2 | 3): GameState => {
  if (state.phase === "play") return state;
  return {
    ...state,
    phase: "play",
    selectedGirl: girlId,
    hoveredGirl: null,
    message: "Move mouse to steer the crate.",
  };
};

export const setPickHoverFromPointer = (
  state: GameState,
  pointerX: number,
  pointerY: number,
): GameState => {
  if (state.phase !== "pick") return state;
  const totalWidth = PICK_CARD_WIDTH * 3 + PICK_CARD_GAP * 2;
  const startX = (LOGICAL_WIDTH - totalWidth) / 2;
  let hovered: 1 | 2 | 3 | null = null;
  if (pointerY >= PICK_CARD_TOP && pointerY <= PICK_CARD_TOP + PICK_CARD_HEIGHT) {
    for (let i = 0; i < 3; i += 1) {
      const x = startX + i * (PICK_CARD_WIDTH + PICK_CARD_GAP);
      if (pointerX >= x && pointerX <= x + PICK_CARD_WIDTH) {
        hovered = (i + 1) as 1 | 2 | 3;
        break;
      }
    }
  }
  if (hovered === state.hoveredGirl) return state;
  return { ...state, hoveredGirl: hovered };
};

export const pickGirlFromPointer = (
  state: GameState,
  pointerX: number,
  pointerY: number,
): GameState => {
  if (state.phase === "play") return state;
  const totalWidth = PICK_CARD_WIDTH * 3 + PICK_CARD_GAP * 2;
  const startX = (LOGICAL_WIDTH - totalWidth) / 2;
  if (pointerY < PICK_CARD_TOP || pointerY > PICK_CARD_TOP + PICK_CARD_HEIGHT) return state;
  for (let i = 0; i < 3; i += 1) {
    const x = startX + i * (PICK_CARD_WIDTH + PICK_CARD_GAP);
    if (pointerX >= x && pointerX <= x + PICK_CARD_WIDTH) {
      const girlId = (i + 1) as 1 | 2 | 3;
      if (girlId !== 1) return state;
      return pickGirl(state, girlId);
    }
  }
  return state;
};

const difficultyForLevel = (level: number): DifficultyState => {
  const levelMultiplier =
    level <= 1 ? 0.35 : level === 2 ? 2.0 : level === 3 ? 4.4 : 4.4 + (level - 3) * 1.5;
  const minFallSpeed = BASE_FALL_SPEED + levelMultiplier * FALL_SPEED_PER_LEVEL;
  const speedSpread = level <= 1 ? 280 : level === 2 ? 340 : level === 3 ? 470 : 560;
  return {
    spawnPerSecond:
      BASE_SPAWN_PER_SECOND +
      (level <= 1
        ? SPAWN_PER_LEVEL * 0.5
        : level === 2
          ? SPAWN_PER_LEVEL * 3.2
          : level === 3
            ? SPAWN_PER_LEVEL * 6.4
            : SPAWN_PER_LEVEL * (6.4 + (level - 3) * 1.6)),
    minFallSpeed,
    maxFallSpeed: minFallSpeed + speedSpread,
  };
};

const advanceProgression = (state: GameState): GameState => {
  if (state.caughtThisLevel < getLevelTarget(state.level)) return state;
  const nextStage = Math.min(state.stageIndex + 1, OUTFIT_STAGES.length - 1);
  const reachedFinalStage = nextStage === OUTFIT_STAGES.length - 1;
  return {
    ...state,
    level: state.level + 1,
    caughtThisLevel: 0,
    stageIndex: nextStage,
    levelFreezeRemaining: 2,
    message: reachedFinalStage
      ? "Final outfit stage reached. Keep surviving for score."
      : `Level up! Outfit stage: ${OUTFIT_STAGES[nextStage]}`,
  };
};

export const tick = (state: GameState, dt: number): GameState => {
  if (state.phase !== "play") return state;
  if (state.isGameOver) return state;
  if (state.levelFreezeRemaining > 0) {
    return {
      ...state,
      levelFreezeRemaining: Math.max(0, state.levelFreezeRemaining - dt),
    };
  }
  const crateX = state.crate.x;

  const difficulty = difficultyForLevel(state.level);
  const spawnInterval = 1 / difficulty.spawnPerSecond;
  let spawnClock = state.timeSinceSpawn + dt;
  const spawned: FallingBeer[] = [];
  let nextId = state.nextBeerId;

  while (spawnClock >= spawnInterval) {
    spawnClock -= spawnInterval;
    spawned.push({
      id: nextId,
      x: randomRange(BEER_SPAWN_MARGIN, GAMEPLAY_WIDTH - BEER_SPAWN_MARGIN),
      y: -BEER_RADIUS,
      vy: randomRange(difficulty.minFallSpeed, difficulty.maxFallSpeed),
    });
    nextId += 1;
  }

  const allBeers = [...state.beers, ...spawned];
  const crateCenterX = crateX + CRATE_WIDTH / 2;
  const crateHalfCatch = CRATE_WIDTH / 2 + BEER_RADIUS * 0.1;
  const catchLine = CRATE_Y + 20;

  let score = state.score;
  let lives = state.lives;
  let caught = state.caughtThisLevel;
  let totalCaught = state.totalCaught;

  const remainingBeers: FallingBeer[] = [];
  for (const beer of allBeers) {
    const nextY = beer.y + beer.vy * dt;
    const catchesBeer =
      Math.abs(beer.x - crateCenterX) <= crateHalfCatch &&
      nextY + BEER_RADIUS >= catchLine &&
      beer.y < catchLine;
    if (catchesBeer) {
      score += 100;
      caught += 1;
      totalCaught += 1;
      continue;
    }

    if (nextY - BEER_RADIUS > LOGICAL_HEIGHT) {
      lives -= 1;
      continue;
    }

    remainingBeers.push({ ...beer, y: nextY });
  }

  const gameOver = lives <= 0;
  let nextState: GameState = {
    ...state,
    crate: { ...state.crate, x: crateX },
    beers: remainingBeers,
    score,
    lives: Math.max(0, lives),
    caughtThisLevel: caught,
    totalCaught,
    timeSinceSpawn: spawnClock,
    nextBeerId: nextId,
    isGameOver: gameOver,
    message: gameOver ? "Game over. Use Restart button." : state.message,
  };

  if (!gameOver) {
    nextState = advanceProgression(nextState);
    if (nextState.message === state.message) {
      nextState = {
        ...nextState,
        message: `Catch target ${nextState.caughtThisLevel}/${getLevelTarget(nextState.level)} for next level`,
      };
    }
  }

  return nextState;
};
