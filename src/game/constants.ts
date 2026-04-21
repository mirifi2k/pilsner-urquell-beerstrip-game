export const LOGICAL_WIDTH = 3840;
export const LOGICAL_HEIGHT = 2160;
export const STAGE_PANEL_WIDTH = 980;
export const GAMEPLAY_WIDTH = LOGICAL_WIDTH - STAGE_PANEL_WIDTH;

export const CRATE_WIDTH = 500;
export const CRATE_HEIGHT = 380;
export const CRATE_Y = LOGICAL_HEIGHT - 460;
export const CRATE_SPEED = 2200;

export const BEER_RADIUS = 184;
export const BEER_SPAWN_MARGIN = 360;

export const STARTING_LIVES = 3;
export const BASE_SPAWN_PER_SECOND = 0.8;
export const SPAWN_PER_LEVEL = 0.35;
export const BASE_FALL_SPEED = 520;
export const FALL_SPEED_PER_LEVEL = 140;
export const LEVEL_TARGET_BASE = 14;
export const LEVEL_TARGET_STEP = 5;

export const OUTFIT_STAGES = [
  "Full outfit",
  "Jacket removed",
  "Top removed",
  "Skirt removed",
  "Lingerie",
] as const;

export const PICK_CARD_TOP = 460;
export const PICK_CARD_WIDTH = 820;
export const PICK_CARD_HEIGHT = 1160;
export const PICK_CARD_GAP = 140;
