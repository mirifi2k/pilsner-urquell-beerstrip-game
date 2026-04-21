export interface FallingBeer {
  id: number;
  x: number;
  y: number;
  vy: number;
}

export interface CrateState {
  x: number;
  speed: number;
}

export interface InputState {
  left: boolean;
  right: boolean;
}

export interface DifficultyState {
  spawnPerSecond: number;
  minFallSpeed: number;
  maxFallSpeed: number;
}

export interface GameState {
  phase: "pick" | "play";
  selectedGirl: 1 | 2 | 3 | null;
  hoveredGirl: 1 | 2 | 3 | null;
  levelFreezeRemaining: number;
  crate: CrateState;
  beers: FallingBeer[];
  input: InputState;
  level: number;
  score: number;
  caughtThisLevel: number;
  lives: number;
  stageIndex: number;
  totalCaught: number;
  timeSinceSpawn: number;
  nextBeerId: number;
  isGameOver: boolean;
  message: string;
}
