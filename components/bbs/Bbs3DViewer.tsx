"use client";

import { Canvas, useThree } from "@react-three/fiber";
import { Line, OrbitControls } from "@react-three/drei";
import type { MutableRefObject } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

type Bbs3DViewerProps = {
  column: {
    id: string;
    section: string;
    height: string;
    mainBars: string;
    stirrups: string;
    cover: string;
    concrete: string;
    steel: string;
    location: string;
    type: string;
  };
  totalBars: number;
  totalWeight: number;
};

type SceneProps = Bbs3DViewerProps & {
  mode: "3d" | "2d";
  autoRotate: boolean;
  resetSignal: number;
  zoomSignal: number;
};

function parseMainBars(value: string) {
  const match = value.match(/(\d+)\s*-\s*(\d+)/);
  return {
    count: match ? Math.max(4, Number(match[1])) : 8,
    diameter: match ? Number(match[2]) : 16,
  };
}

function getPerimeterPositions(count: number) {
  const w = 1.28;
  const d = 1.28;
  const positions: Array<[number, number]> = [];
  const edges: Array<[[number, number], [number, number]]> = [
    [[-w / 2, -d / 2], [w / 2, -d / 2]],
    [[w / 2, -d / 2], [w / 2, d / 2]],
    [[w / 2, d / 2], [-w / 2, d / 2]],
    [[-w / 2, d / 2], [-w / 2, -d / 2]],
  ];

  const perEdge = Math.max(1, Math.ceil(count / 4));

  for (const [[x1, z1], [x2, z2]] of edges) {
    for (let i = 0; i < perEdge; i += 1) {
      const t = perEdge === 1 ? 0 : i / perEdge;
      positions.push([x1 + (x2 - x1) * t, z1 + (z2 - z1) * t]);
      if (positions.length >= count) return positions;
    }
  }

  return positions.slice(0, count);
}

function CameraController({
  mode,
  resetSignal,
  zoomSignal,
  controlsRef,
}: {
  mode: "3d" | "2d";
  resetSignal: number;
  zoomSignal: number;
  controlsRef: MutableRefObject<any>;
}) {
  const { camera } = useThree();

  useEffect(() => {
    if (mode === "2d") {
      camera.position.set(4.2, 3.2, 5.2);
      camera.lookAt(0, 1.8, 0);
    } else {
      camera.position.set(4.2, 3.2, 5.2);
      camera.lookAt(0, 1.8, 0);
    }

    camera.updateProjectionMatrix();
    controlsRef.current?.target?.set(0, 1.8, 0);
    controlsRef.current?.update?.();
    controlsRef.current?.saveState?.();
  }, [camera, controlsRef, mode, resetSignal]);

  useEffect(() => {
    if (!zoomSignal) return;
    const direction = zoomSignal > 0 ? 0.86 : 1.16;
    camera.position.multiplyScalar(direction);
    camera.updateProjectionMatrix();
    controlsRef.current?.update?.();
  }, [camera, controlsRef, zoomSignal]);

  return null;
}

function BbsColumnScene(props: SceneProps) {
  const controlsRef = useRef<any>(null);
  const { count, diameter } = useMemo(() => parseMainBars(props.column.mainBars), [props.column.mainBars]);
  const barPositions = useMemo(() => getPerimeterPositions(count), [count]);

  const barRadius = Math.max(0.028, Math.min(0.06, diameter / 420));
  const columnHeight = 3.35;
  const baseY = 0.22;
  const stirrupLevels = Array.from({ length: 11 }, (_, index) => baseY + 0.18 + index * 0.28);

  const loopPoints = (y: number): Array<[number, number, number]> => [
    [-0.76, y, -0.76],
    [0.76, y, -0.76],
    [0.76, y, 0.76],
    [-0.76, y, 0.76],
    [-0.76, y, -0.76],
  ];

  return (
    <>
      <CameraController
        mode={props.mode}
        resetSignal={props.resetSignal}
        zoomSignal={props.zoomSignal}
        controlsRef={controlsRef}
      />

      <ambientLight intensity={0.9} />
      <directionalLight position={[5, 7, 5]} intensity={1.3} />
      <directionalLight position={[-4, 4, -3]} intensity={0.35} />

      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.08}
        enablePan={false}
        enableZoom
        autoRotate={props.autoRotate}
        autoRotateSpeed={1.7}
        minDistance={2.6}
        maxDistance={8.2}
      />

      <mesh position={[0, -0.12, 0]} receiveShadow>
        <boxGeometry args={[2.9, 0.28, 2.9]} />
        <meshStandardMaterial color="#bdb7b0" roughness={0.72} metalness={0.04} />
      </mesh>

      <mesh position={[0, 0.08, 0]} receiveShadow>
        <boxGeometry args={[2.05, 0.2, 2.05]} />
        <meshStandardMaterial color="#c9c4bd" roughness={0.76} metalness={0.03} />
      </mesh>

      <mesh position={[0, columnHeight / 2 + baseY, 0]}>
        <boxGeometry args={[1.48, columnHeight, 1.48]} />
        <meshStandardMaterial color="#ebe8f0" transparent opacity={0.16} roughness={0.5} />
      </mesh>

      {barPositions.map(([x, z], index) => (
        <mesh key={`main-bar-${index}`} position={[x, columnHeight / 2 + baseY, z]}>
          <cylinderGeometry args={[barRadius, barRadius, columnHeight, 20]} />
          <meshStandardMaterial color="#6d35ff" roughness={0.26} metalness={0.38} />
        </mesh>
      ))}

      {stirrupLevels.map((y, index) => (
        <Line
          key={`stirrup-${index}`}
          points={loopPoints(y)}
          color="#2c195e"
          lineWidth={2.4}
          dashed={false}
        />
      ))}

      {stirrupLevels.slice(1, -1).map((y, index) => (
        <Line
          key={`tie-cross-${index}`}
          points={[
            [-0.76, y, -0.76],
            [0.76, y, 0.76],
          ]}
          color="#7d43ff"
          lineWidth={1.2}
          transparent
          opacity={0.38}
        />
      ))}

      <gridHelper args={[4.2, 12, "#ded8ea", "#f1edf8"]} position={[0, -0.26, 0]} />
    </>
  );
}

export default function Bbs3DViewer({ column, totalBars, totalWeight }: Bbs3DViewerProps) {
  const [mode, setMode] = useState<"3d" | "2d">("3d");
  const [autoRotate, setAutoRotate] = useState(true);
  const [resetSignal, setResetSignal] = useState(0);
  const [zoomSignal, setZoomSignal] = useState(0);

  return (
    <div className="overflow-hidden rounded-[22px] border border-[#eee8fb] bg-[#fbfaff]">
      <div className="flex items-center justify-between gap-3 border-b border-[#eee8fb] bg-white/80 px-3 py-2">
        <div>
          <p className="text-[10px] font-black text-[#21133f]">Live 3D Reinforcement Viewer</p>
          <p className="text-[9px] font-semibold text-[#817397]">Drag to rotate 360° • Scroll to zoom</p>
        </div>
        <span className="rounded-full bg-[#f3edff] px-3 py-1 text-[10px] font-black text-[#6d35ff]">
          {column.id}
        </span>
      </div>

      <div className="relative h-[380px] overflow-hidden">
        <Canvas
          shadows
          camera={{ position: [4.2, 3.2, 5.2], fov: 39, near: 0.1, far: 100 }}
          gl={{ antialias: true, alpha: true }}
          onCreated={({ gl }) => {
            gl.setClearColor(new THREE.Color("#fbfaff"), 1);
          }}
        >
          <BbsColumnScene
            column={column}
            totalBars={totalBars}
            totalWeight={totalWeight}
            mode={mode}
            autoRotate={autoRotate}
            resetSignal={resetSignal}
            zoomSignal={zoomSignal}
          />
        </Canvas>

        <div className="absolute left-3 top-3 flex flex-col gap-2">
          {(["3d", "2d"] as const).map((nextMode) => (
            <button
              key={nextMode}
              onClick={() => setMode(nextMode)}
              className={`h-9 rounded-xl border px-3 text-[11px] font-black shadow-sm ${
                mode === nextMode
                  ? "border-[#6d35ff] bg-[#f4efff] text-[#6d35ff]"
                  : "border-[#ece8f8] bg-white text-[#5f5471]"
              }`}
            >
              {nextMode.toUpperCase()}
            </button>
          ))}

          <button
            onClick={() => setAutoRotate((value) => !value)}
            className={`h-9 rounded-xl border px-3 text-[11px] font-black shadow-sm ${
              autoRotate
                ? "border-[#6d35ff] bg-[#f4efff] text-[#6d35ff]"
                : "border-[#ece8f8] bg-white text-[#5f5471]"
            }`}
          >
            360°
          </button>
        </div>

        <div className="absolute right-3 top-3 flex flex-col gap-2">
          <button
            onClick={() => setZoomSignal((value) => value + 1)}
            className="h-9 w-10 rounded-xl border border-[#ece8f8] bg-white text-[13px] font-black text-[#5f5471] shadow-sm hover:border-[#cbbcff] hover:bg-[#f8f5ff]"
          >
            +
          </button>
          <button
            onClick={() => setZoomSignal((value) => value - 1)}
            className="h-9 w-10 rounded-xl border border-[#ece8f8] bg-white text-[13px] font-black text-[#5f5471] shadow-sm hover:border-[#cbbcff] hover:bg-[#f8f5ff]"
          >
            −
          </button>
          <button
            onClick={() => setResetSignal((value) => value + 1)}
            className="h-9 w-10 rounded-xl border border-[#ece8f8] bg-white text-[10px] font-black text-[#5f5471] shadow-sm hover:border-[#cbbcff] hover:bg-[#f8f5ff]"
          >
            Fit
          </button>
        </div>

        <div className="absolute bottom-5 left-4 right-4 rounded-2xl border border-[#eee8fb] bg-white/95 px-4 py-2.5 shadow-[0_10px_24px_rgba(33,19,63,0.10)] backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[10px] font-black text-[#21133f]">
              {column.type} {column.id} • {column.section}
            </p>
            <p className="text-[9px] font-bold text-[#817397]">
              {column.mainBars} • {column.stirrups}
            </p>
          </div>
        </div>
      </div>


    </div>
  );
}
