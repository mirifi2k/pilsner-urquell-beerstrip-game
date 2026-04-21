import { useEffect, useRef, useState } from "react";
import { GAMEPLAY_WIDTH, LOGICAL_HEIGHT, LOGICAL_WIDTH } from "./game/constants";
import {
  createInitialState,
  pickGirlFromPointer,
  resetGame,
  setPickHoverFromPointer,
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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = setupCanvas(canvas);

    const onResize = () => resizeCanvas(canvas);
    const getLogicalPoint = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return null;
      const normalizedX = (clientX - rect.left) / rect.width;
      const normalizedY = (clientY - rect.top) / rect.height;
      const logicalX = normalizedX * LOGICAL_WIDTH;
      const logicalY = normalizedY * LOGICAL_HEIGHT;
      const gameplayX = Math.max(0, Math.min(GAMEPLAY_WIDTH, logicalX));
      return { gameplayX, logicalY, logicalX };
    };
    const moveFromClientX = (clientX: number, clientY: number) => {
      const point = getLogicalPoint(clientX, clientY);
      if (!point) return;
      if (stateRef.current.phase !== "play") {
        stateRef.current = setPickHoverFromPointer(
          stateRef.current,
          point.logicalX,
          point.logicalY,
        );
        return;
      }
      stateRef.current = setCrateFromPointerX(stateRef.current, point.gameplayX);
    };
    const pickFromClient = (clientX: number, clientY: number) => {
      const point = getLogicalPoint(clientX, clientY);
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
      moveFromClientX(e.touches[0].clientX, e.touches[0].clientY);
    };
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length < 1) return;
      pickFromClient(e.touches[0].clientX, e.touches[0].clientY);
    };

    resizeCanvas(canvas);
    window.addEventListener("resize", onResize);
    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mousedown", onMouseDown);
    canvas.addEventListener("touchmove", onTouchMove, { passive: true });
    canvas.addEventListener("touchstart", onTouchStart, { passive: true });

    let running = true;
    let prev = performance.now();
    const frame = (now: number) => {
      if (!running) return;
      const dt = Math.min((now - prev) / 1000, 0.033);
      prev = now;
      stateRef.current = tick(stateRef.current, dt);
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
