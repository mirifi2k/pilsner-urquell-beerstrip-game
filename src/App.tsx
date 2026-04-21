import { useEffect, useRef, useState } from "react";
import {
  clientToLogicalPickLandscape,
  clientToLogicalPlay,
  hitTestPortraitPickCard,
  isPortraitScreen,
} from "./game/layout";
import {
  createInitialState,
  pickGirl,
  pickGirlFromPointer,
  resetGame,
  setPickHoverFromPointer,
  setPickHoverGirl,
  setCrateFromPointerX,
  tick,
} from "./game/engine";
import { draw, resizeCanvas, setupCanvas } from "./game/renderer";
import type { GameState } from "./game/types";

const App = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef<GameState>(createInitialState());
  const [phase, setPhase] = useState<GameState["phase"]>(stateRef.current.phase);
  const phaseRef = useRef<GameState["phase"]>(stateRef.current.phase);
  const lastTotalCaughtRef = useRef<number>(stateRef.current.totalCaught);
  const lastGlassStageRef = useRef<number>(
    Math.max(1, Math.min(5, stateRef.current.level)),
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = setupCanvas(canvas);
    const baseUrl = import.meta.env.BASE_URL;
    const catchSound = new Audio(`${baseUrl}sounds/catch.mp3`);
    const fillSound = new Audio(`${baseUrl}sounds/fill.mp3`);
    catchSound.preload = "auto";
    fillSound.preload = "auto";
    const playSound = (audio: HTMLAudioElement) => {
      audio.currentTime = 0;
      void audio.play().catch(() => {
        // Ignore autoplay/user-gesture related rejections.
      });
    };

    const onResize = () => resizeCanvas(canvas);
    const getPixelSize = () => {
      const dpr = window.devicePixelRatio || 1;
      return { pw: canvas.width / dpr, ph: canvas.height / dpr };
    };
    const moveFromClientX = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const { pw, ph } = getPixelSize();
      if (stateRef.current.phase !== "play") {
        if (isPortraitScreen(pw, ph)) {
          const card = hitTestPortraitPickCard(clientX, clientY, rect, pw, ph);
          stateRef.current = setPickHoverGirl(stateRef.current, card);
          return;
        }
        const point = clientToLogicalPickLandscape(clientX, clientY, rect, pw, ph);
        if (!point) {
          stateRef.current = setPickHoverGirl(stateRef.current, null);
          return;
        }
        stateRef.current = setPickHoverFromPointer(
          stateRef.current,
          point.logicalX,
          point.logicalY,
        );
        return;
      }
      const point = clientToLogicalPlay(clientX, clientY, rect, pw, ph);
      if (!point) return;
      stateRef.current = setCrateFromPointerX(stateRef.current, point.gameplayX);
    };
    const pickFromClient = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const { pw, ph } = getPixelSize();
      if (isPortraitScreen(pw, ph)) {
        const card = hitTestPortraitPickCard(clientX, clientY, rect, pw, ph);
        if (card === 1) {
          stateRef.current = pickGirl(stateRef.current, 1);
        }
        if (stateRef.current.phase !== phaseRef.current) {
          phaseRef.current = stateRef.current.phase;
          setPhase(stateRef.current.phase);
        }
        return;
      }
      const point = clientToLogicalPickLandscape(clientX, clientY, rect, pw, ph);
      if (!point) return;
      stateRef.current = pickGirlFromPointer(
        stateRef.current,
        point.logicalX,
        point.logicalY,
      );
      if (stateRef.current.phase !== phaseRef.current) {
        phaseRef.current = stateRef.current.phase;
        setPhase(stateRef.current.phase);
      }
    };
    const onMouseMove = (e: MouseEvent) => moveFromClientX(e.clientX, e.clientY);
    const onMouseDown = (e: MouseEvent) => pickFromClient(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length < 1) return;
      e.preventDefault();
      moveFromClientX(e.touches[0].clientX, e.touches[0].clientY);
    };
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length < 1) return;
      e.preventDefault();
      pickFromClient(e.touches[0].clientX, e.touches[0].clientY);
    };

    resizeCanvas(canvas);
    window.addEventListener("resize", onResize);
    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mousedown", onMouseDown);
    canvas.addEventListener("touchmove", onTouchMove, { passive: false });
    canvas.addEventListener("touchstart", onTouchStart, { passive: false });

    let running = true;
    let prev = performance.now();
    const frame = (now: number) => {
      if (!running) return;
      const dt = Math.min((now - prev) / 1000, 0.033);
      prev = now;
      stateRef.current = tick(stateRef.current, dt);
      if (stateRef.current.totalCaught > lastTotalCaughtRef.current) {
        playSound(catchSound);
      }
      lastTotalCaughtRef.current = stateRef.current.totalCaught;
      const currentGlassStage = Math.max(1, Math.min(5, stateRef.current.level));
      if (currentGlassStage > lastGlassStageRef.current) {
        playSound(fillSound);
      }
      lastGlassStageRef.current = currentGlassStage;
      if (stateRef.current.phase !== phaseRef.current) {
        phaseRef.current = stateRef.current.phase;
        setPhase(stateRef.current.phase);
      }
      draw(ctx, canvas, stateRef.current);
      requestAnimationFrame(frame);
    };

    requestAnimationFrame(frame);

    return () => {
      running = false;
      window.removeEventListener("resize", onResize);
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("mousedown", onMouseDown);
      canvas.removeEventListener("touchmove", onTouchMove);
      canvas.removeEventListener("touchstart", onTouchStart);
    };
  }, []);

  return (
    <div className="app-shell">
      <canvas ref={canvasRef} />
      {phase === "play" && (
        <div className="hud">
          <button
            onClick={() => {
              stateRef.current = resetGame();
              lastTotalCaughtRef.current = stateRef.current.totalCaught;
              lastGlassStageRef.current = Math.max(
                1,
                Math.min(5, stateRef.current.level),
              );
              phaseRef.current = "pick";
              setPhase("pick");
            }}
          >
            Restart
          </button>
        </div>
      )}
    </div>
  );
};

export default App;
