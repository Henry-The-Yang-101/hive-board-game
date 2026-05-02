"use client";

import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, useTexture } from "@react-three/drei";
import * as THREE from "three";
import Image from "next/image";
import { GameState, PieceType, PlayerColor } from "@/game/types";
import { coordKey, legalMoveTargets, legalPlacementTargets, parseKey } from "@/game/rules";

// ─── Layout constants ───────────────────────────────────────────────────────
const HEX_R     = 1.0;
const HEX_SCALE = 0.951;
const HEX_MESH_Y_ROT = Math.PI / 6;
const HEX_TILE_GAP = 0.05;
const PIECE_H   = 0.55;
const PIECE_EDGE_BEVEL = 0.026 * 1.8;
const SIDE_EDGE_ROUND = Math.min(PIECE_EDGE_BEVEL * 0.95, HEX_R * HEX_SCALE * 0.33);
const STACK_GAP = 0.05;
const MARKER_R  = 0.70;
const MARKER_H  = 0.07;
const INSECT_ON_PIECE_SCALE = 0.75;

// ─── Color palette (matches CSS theme) ──────────────────────────────────────
const W_SIDE  = new THREE.Color(0xdce4f5);
const B_SIDE  = new THREE.Color(0x1c2235);
const W_TOP   = new THREE.Color(0xffffff);
const ACCENT  = new THREE.Color(0x7f8cff);

// ─── PNG path table ──────────────────────────────────────────────────────────
const PNG: Record<PieceType, string> = {
  queen:       "/images/insects/queen_bee.png",
  ant:         "/images/insects/soldier_ant.png",
  spider:      "/images/insects/spider.png",
  beetle:      "/images/insects/beetle.png",
  grasshopper: "/images/insects/grasshopper.png",
};

const PIECE_TYPES: PieceType[] = ["queen", "ant", "spider", "beetle", "grasshopper"];

// ─── Helpers ────────────────────────────────────────────────────────────────
function axialToWorld(q: number, r: number): [number, number, number] {
  const layoutR = HEX_R + HEX_TILE_GAP / Math.sqrt(3);
  return [
    layoutR * Math.sqrt(3) * (q + r / 2),
    0,
    layoutR * 1.5 * r,
  ];
}

/**
 * ExtrudeGeometry lid UVs use raw shape coordinates (~±radius), outside [0,1]; textures clamp and look
 * shrunk / shifted. Cylinder caps use normalized UVs — remap top-cap verts (after rotateX) from xz so
 * the insect canvas maps like before.
 */
function remapTopCapUVsCylinderStyle(
  geo: THREE.BufferGeometry,
  vertexStart: number,
  vertexCount: number,
): void {
  const pos = geo.getAttribute("position") as THREE.BufferAttribute;
  const uvAttr = geo.getAttribute("uv") as THREE.BufferAttribute;
  const end = vertexStart + vertexCount;
  let m = 1e-6;
  for (let vi = vertexStart; vi < end; vi++) {
    const x = pos.getX(vi);
    const z = pos.getZ(vi);
    m = Math.max(m, Math.abs(x), Math.abs(z));
  }
  const inv = 1 / (2 * m);
  for (let vi = vertexStart; vi < end; vi++) {
    const x = pos.getX(vi);
    const z = pos.getZ(vi);
    uvAttr.setXY(vi, z * inv + 0.5, x * inv + 0.5);
  }
  uvAttr.needsUpdate = true;
}

/** Horizontal hex outline with circular corners → extruded vertical ribs become rounded side seams. */
function roundedHexShape(R: number, cornerRadius: number): THREE.Shape {
  const verts: THREE.Vector2[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    verts.push(new THREE.Vector2(R * Math.cos(a), R * Math.sin(a)));
  }
  const rc = Math.min(cornerRadius, R * 0.33);
  const tanLen = rc / Math.sqrt(3);
  const toCenter = rc / Math.sin(Math.PI / 3);

  const shape = new THREE.Shape();
  let first = true;

  for (let i = 0; i < 6; i++) {
    const V = verts[i]!;
    const Vp = verts[(i + 5) % 6]!;
    const Vn = verts[(i + 1) % 6]!;
    const dirIn = new THREE.Vector2().subVectors(V, Vp).normalize();
    const dirOut = new THREE.Vector2().subVectors(Vn, V).normalize();
    const P_start = new THREE.Vector2().copy(V).sub(dirIn.clone().multiplyScalar(tanLen));
    const P_end = new THREE.Vector2().copy(V).add(dirOut.clone().multiplyScalar(tanLen));
    const O = V.clone().normalize().multiplyScalar(V.length() - toCenter);

    const a0 = Math.atan2(P_start.y - O.y, P_start.x - O.x);
    const a1 = Math.atan2(P_end.y - O.y, P_end.x - O.x);
    let da = a1 - a0;
    while (da <= -Math.PI) da += 2 * Math.PI;
    while (da > Math.PI) da -= 2 * Math.PI;

    if (first) {
      shape.moveTo(P_start.x, P_start.y);
      first = false;
    }
    shape.absarc(O.x, O.y, rc, a0, a0 + da, da < 0);
  }

  return shape;
}

function createRoundedHexPieceGeometry(): THREE.BufferGeometry {
  const r = HEX_R * HEX_SCALE;
  const shape = roundedHexShape(r, SIDE_EDGE_ROUND);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: PIECE_H - 2 * PIECE_EDGE_BEVEL,
    steps: 1,
    curveSegments: 12,
    bevelEnabled: true,
    bevelThickness: PIECE_EDGE_BEVEL,
    bevelSize: PIECE_EDGE_BEVEL * 0.9,
    bevelOffset: 0,
    bevelSegments: 5,
  });

  geo.rotateX(-Math.PI / 2);
  geo.computeBoundingBox();
  const box = geo.boundingBox!;
  geo.translate(0, -(box.max.y + box.min.y) / 2, 0);

  const lids = geo.groups[0];
  const sides = geo.groups[1];
  const bottomHalf = lids.count / 2;
  const topStart = lids.start + bottomHalf;
  geo.clearGroups();
  geo.addGroup(lids.start, bottomHalf, 2);
  geo.addGroup(topStart, bottomHalf, 1);
  geo.addGroup(sides.start, sides.count, 0);

  remapTopCapUVsCylinderStyle(geo, topStart, bottomHalf);

  geo.computeVertexNormals();
  return geo;
}

/**
 * Draws a PNG onto a 512×512 square canvas (centered, aspect-ratio preserving)
 * and optionally inverts all opaque pixels for black pieces.
 */
function processTexture(src: THREE.Texture, invert: boolean): THREE.Texture {
  const img = src.image as HTMLImageElement;
  const SIZE = 512;
  const cv  = document.createElement("canvas");
  cv.width  = SIZE;
  cv.height = SIZE;
  const ctx = cv.getContext("2d")!;

  const ow = img.naturalWidth  || img.width  || SIZE;
  const oh = img.naturalHeight || img.height || SIZE;
  const ar = ow / oh;
  let dw: number, dh: number, dx: number, dy: number;
  if (ar >= 1) { dw = SIZE; dh = SIZE / ar; }
  else         { dh = SIZE; dw = SIZE * ar; }
  dw *= INSECT_ON_PIECE_SCALE;
  dh *= INSECT_ON_PIECE_SCALE;
  dx = (SIZE - dw) / 2;
  dy = (SIZE - dh) / 2;

  ctx.clearRect(0, 0, SIZE, SIZE);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.drawImage(img, dx, dy, dw, dh);

  if (invert) {
    const id = ctx.getImageData(0, 0, SIZE, SIZE);
    const d  = id.data;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] > 10) {
        d[i]     = 255 - d[i];
        d[i + 1] = 255 - d[i + 1];
        d[i + 2] = 255 - d[i + 2];
      }
    }
    ctx.putImageData(id, 0, 0);
  }

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ─── Legal-move pulsing disc ─────────────────────────────────────────────────
type MarkerProps = { x: number; z: number; geo: THREE.BufferGeometry; onClick: () => void };

function LegalMarker({ x, z, geo, onClick }: MarkerProps) {
  const matRef = useRef<THREE.MeshStandardMaterial>(null!);
  useFrame(({ clock }) => {
    matRef.current.emissiveIntensity = 0.35 + 0.3 * Math.sin(clock.elapsedTime * 3.5);
  });
  return (
    <mesh
      geometry={geo}
      position={[x, MARKER_H / 2, z]}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
    >
      <meshStandardMaterial
        ref={matRef}
        color={ACCENT}
        emissive={ACCENT}
        emissiveIntensity={0.5}
        transparent
        opacity={0.72}
        roughness={0.2}
      />
    </mesh>
  );
}

// ─── Single hex prism piece ───────────────────────────────────────────────────
const ACCENT_DIM = new THREE.Color(0x4a5acc);

type PieceProps = {
  pType: PieceType;
  owner: PlayerColor;
  stackIndex: number;
  q: number;
  r: number;
  isSelected: boolean;
  isLegalTarget: boolean;
  isTop: boolean;
  geo: THREE.BufferGeometry;
  texNormal: THREE.Texture;
  texInverted: THREE.Texture;
  onPieceClick: () => void;
};

function HexPiece({
  pType, owner, stackIndex, q, r, isSelected, isLegalTarget, isTop,
  geo, texNormal, texInverted, onPieceClick,
}: PieceProps) {
  const [wx, , wz] = axialToWorld(q, r);
  const y = stackIndex * (PIECE_H + STACK_GAP) + PIECE_H / 2;

  const isWhite = owner === "white";
  const sideCol = isWhite ? W_SIDE : B_SIDE;
  const topTex  = isWhite ? texNormal : texInverted;

  const emissiveCol = isSelected ? ACCENT : isLegalTarget ? ACCENT_DIM : new THREE.Color(0x000000);
  const emissiveInt = isSelected ? 0.45   : isLegalTarget ? 0.55        : 0;

  return (
    <group position={[wx, y, wz]} rotation={[0, HEX_MESH_Y_ROT, 0]}>
      <mesh
        geometry={geo}
        onClick={isTop ? (e) => { e.stopPropagation(); onPieceClick(); } : undefined}
        onPointerOver={isTop ? (e) => { e.stopPropagation(); document.body.style.cursor = "pointer"; } : undefined}
        onPointerOut={isTop ? () => { document.body.style.cursor = "default"; } : undefined}
      >
        {/* Group 0: lateral faces */}
        <meshStandardMaterial
          attach="material-0"
          color={sideCol}
          roughness={0.25}
          metalness={0.08}
          emissive={emissiveCol}
          emissiveIntensity={emissiveInt}
        />
        {/* Group 1: top face — insect texture */}
        <meshStandardMaterial
          attach="material-1"
          map={topTex}
          color={W_TOP}
          roughness={0.55}
          metalness={0}
        />
        {/* Group 2: bottom face */}
        <meshStandardMaterial
          attach="material-2"
          color={sideCol}
          roughness={0.4}
        />
      </mesh>
    </group>
  );
}

// ─── Scene (inside Canvas, can use R3F + drei hooks) ─────────────────────────
type SceneProps = {
  state: GameState;
  legalPlacements: Set<string>;
  legalMovesForSelected: Set<string>;
  selectedPieceId: string | null;
  onCellClick: (q: number, r: number, key: string) => void;
  onPieceClick: (pieceId: string) => void;
};

function HiveScene({
  state, legalPlacements, legalMovesForSelected,
  selectedPieceId, onCellClick, onPieceClick,
}: SceneProps) {
  // Load all 5 textures in one Suspense batch
  const raw = useTexture([
    PNG.queen, PNG.ant, PNG.spider, PNG.beetle, PNG.grasshopper,
  ]) as THREE.Texture[];

  const rawMap = useMemo<Record<PieceType, THREE.Texture>>(() => ({
    queen: raw[0], ant: raw[1], spider: raw[2], beetle: raw[3], grasshopper: raw[4],
  }), [raw]);

  // Build processed (centered + possibly inverted) textures once
  const texNormal   = useMemo(() =>
    Object.fromEntries(PIECE_TYPES.map(t => [t, processTexture(rawMap[t], false)])) as Record<PieceType, THREE.Texture>,
  [rawMap]);
  const texInverted = useMemo(() =>
    Object.fromEntries(PIECE_TYPES.map(t => [t, processTexture(rawMap[t], true)])) as Record<PieceType, THREE.Texture>,
  [rawMap]);

  // Shared geometries (extruded hex + bevel for slight rim rounding)
  const pieceGeo  = useMemo(() => createRoundedHexPieceGeometry(), []);
  const markerGeo = useMemo(() =>
    new THREE.CylinderGeometry(MARKER_R, MARKER_R, MARKER_H, 6, 1), []);

  const legalTargetKeys = useMemo(() =>
    new Set([...legalPlacements, ...legalMovesForSelected]),
  [legalPlacements, legalMovesForSelected]);

  return (
    <>
      {/* Pieces — render every piece in every stack */}
      {Object.entries(state.board).flatMap(([key, stack]) => {
        if (!stack.length) return [];
        const coord = parseKey(key);
        const isOccupiedLegalTarget = legalMovesForSelected.has(key);
        return stack.map((piece, i) => {
          const isTop = i === stack.length - 1;
          const isLegalTarget = isTop && isOccupiedLegalTarget;
          return (
            <HexPiece
              key={`${key}-${piece.id}`}
              pType={piece.type}
              owner={piece.owner}
              stackIndex={i}
              q={coord.q}
              r={coord.r}
              isSelected={piece.id === selectedPieceId}
              isLegalTarget={isLegalTarget}
              isTop={isTop}
              geo={pieceGeo}
              texNormal={texNormal[piece.type]}
              texInverted={texInverted[piece.type]}
              onPieceClick={() => {
                // If this occupied cell is a legal move target (e.g. beetle climbing),
                // treat the click as a move, not a piece selection.
                if (isLegalTarget) onCellClick(coord.q, coord.r, key);
                else onPieceClick(piece.id);
              }}
            />
          );
        });
      })}

      {/* Legal move / placement markers — only for empty target cells.
          Occupied legal targets (beetle climbing) are handled via piece highlight above. */}
      {Array.from(legalTargetKeys).map(key => {
        if ((state.board[key]?.length ?? 0) > 0) return null;
        const coord = parseKey(key);
        const [x, , z] = axialToWorld(coord.q, coord.r);
        return (
          <LegalMarker
            key={key}
            x={x}
            z={z}
            geo={markerGeo}
            onClick={() => onCellClick(coord.q, coord.r, key)}
          />
        );
      })}
    </>
  );
}

// ─── Board component props ────────────────────────────────────────────────────
type BoardProps = {
  state: GameState;
  myColor: PlayerColor | null;
  interactionMode: "place" | "move";
  selectedPieceType: PieceType;
  selectedPieceId: string | null;
  onSelectPieceType: (t: PieceType) => void;
  onSelectPieceId: (id: string | null) => void;
  onPlace: (q: number, r: number) => void;
  onMove: (pieceId: string, q: number, r: number) => void;
};

// ─── Exported board ──────────────────────────────────────────────────────────
export function HiveBoard3D({
  state, myColor, interactionMode,
  selectedPieceType, selectedPieceId,
  onSelectPieceType, onSelectPieceId,
  onPlace, onMove,
}: BoardProps) {
  const isMyTurn = myColor !== null && state.turn === myColor;

  const legalPlacements = useMemo(() => {
    if (!isMyTurn || interactionMode !== "place") return new Set<string>();
    return legalPlacementTargets(state, myColor!);
  }, [isMyTurn, interactionMode, myColor, state]);

  const legalMovesForSelected = useMemo(() => {
    if (!isMyTurn || interactionMode !== "move" || !selectedPieceId) return new Set<string>();
    return legalMoveTargets(state, selectedPieceId);
  }, [isMyTurn, interactionMode, selectedPieceId, state]);

  const onCellClick = (q: number, r: number, key: string) => {
    if (!isMyTurn) return;
    if (interactionMode === "move") {
      if (selectedPieceId && legalMovesForSelected.has(key)) onMove(selectedPieceId, q, r);
    } else {
      if (legalPlacements.has(key)) onPlace(q, r);
    }
  };

  const onPieceClick = (pieceId: string) => {
    if (!isMyTurn || interactionMode !== "move") return;
    onSelectPieceId(pieceId);
  };

  return (
    <div className="boardWrap">
      {/* ── Piece tray ─────────────────────────────────────────────────── */}
      <div className="tray">
        {PIECE_TYPES.map(piece => {
          const inHand = state.hands[state.turn][piece];
          return (
            <button
              key={piece}
              className={`trayBtn ${selectedPieceType === piece && interactionMode === "place" ? "active" : ""}`}
              onClick={() => onSelectPieceType(piece)}
            >
              <Image
                src={PNG[piece]}
                alt={piece}
                width={32}
                height={32}
                className="trayIcon"
                style={{ objectFit: "contain" }}
              />
              <span className="trayLabel">{piece}</span>
              <strong className="trayCount">{inHand}</strong>
            </button>
          );
        })}
      </div>

      {/* ── 3D Canvas ──────────────────────────────────────────────────── */}
      <div className="canvasWrapper">
        <Canvas
          camera={{ position: [0, 13, 11], fov: 48 }}
          gl={{ alpha: true, antialias: true }}
        >
          <ambientLight intensity={0.65} />
          <directionalLight position={[6, 14, 8]} intensity={1.5} />
          <directionalLight position={[-4, 6, -5]} intensity={0.4} />

          <OrbitControls
            minPolarAngle={Math.PI / 10}
            maxPolarAngle={Math.PI / 2.2}
            minDistance={6}
            maxDistance={30}
            enablePan
            panSpeed={0.55}
            zoomSpeed={0.65}
            makeDefault
          />

          <Suspense fallback={null}>
            <HiveScene
              state={state}
              legalPlacements={legalPlacements}
              legalMovesForSelected={legalMovesForSelected}
              selectedPieceId={selectedPieceId}
              onCellClick={onCellClick}
              onPieceClick={onPieceClick}
            />
          </Suspense>
        </Canvas>
      </div>
    </div>
  );
}
