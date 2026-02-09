import { useEffect, useId, useState } from "react";

interface PixelHeartProps {
	size?: number;
	filled?: boolean;
	className?: string;
	animateOnFill?: boolean;
}

// Classic 8-bit heart shape on an 11x10 grid
// 1 = filled pixel, 0 = empty
const HEART_GRID = [
	[0, 0, 1, 1, 0, 0, 0, 1, 1, 0, 0],
	[0, 1, 1, 1, 1, 0, 1, 1, 1, 1, 0],
	[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
	[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
	[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
	[0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
	[0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0],
	[0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0],
	[0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0],
	[0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
];

// Outline-only pixels: border of the heart shape
const OUTLINE_GRID = (() => {
	const rows = HEART_GRID.length;
	const cols = HEART_GRID[0].length;
	return HEART_GRID.map((row, y) =>
		row.map((cell, x) => {
			if (cell === 0) return 0;
			const neighbors = [
				[y - 1, x],
				[y + 1, x],
				[y, x - 1],
				[y, x + 1],
			];
			for (const [ny, nx] of neighbors) {
				if (ny < 0 || ny >= rows || nx < 0 || nx >= cols) return 1;
				if (HEART_GRID[ny][nx] === 0) return 1;
			}
			return 0;
		}),
	);
})();

const GRID_W = 11;
const GRID_H = 10;

// Pre-compute SVG path data for filled and outline hearts
function gridToRects(grid: number[][]): Array<{ x: number; y: number }> {
	const rects: Array<{ x: number; y: number }> = [];
	for (let y = 0; y < grid.length; y++) {
		for (let x = 0; x < grid[y].length; x++) {
			if (grid[y][x] === 1) {
				rects.push({ x, y });
			}
		}
	}
	return rects;
}

const FILLED_RECTS = gridToRects(HEART_GRID);
const OUTLINE_RECTS = gridToRects(OUTLINE_GRID);

const PARTICLE_COUNT = 10;

interface Particle {
	id: number;
	tx: number;
	ty: number;
	delay: number;
}

export function PixelHeart({
	size = 16,
	filled = false,
	className = "",
	animateOnFill = false,
}: PixelHeartProps) {
	const uniqueId = useId();
	const [particles, setParticles] = useState<Particle[]>([]);
	const [popping, setPopping] = useState(false);
	const [wasFilled, setWasFilled] = useState(filled);

	useEffect(() => {
		if (animateOnFill && filled && !wasFilled) {
			setPopping(true);
			const newParticles: Particle[] = Array.from(
				{ length: PARTICLE_COUNT },
				(_, i) => {
					const angle =
						((360 / PARTICLE_COUNT) * i + Math.random() * 30 - 15) *
						(Math.PI / 180);
					const dist = 12 + Math.random() * 20;
					return {
						id: i,
						tx: Math.cos(angle) * dist,
						ty: Math.sin(angle) * dist,
						delay: Math.random() * 80,
					};
				},
			);
			setParticles(newParticles);

			const timer = setTimeout(() => {
				setPopping(false);
				setParticles([]);
			}, 500);

			return () => clearTimeout(timer);
		}
		setWasFilled(filled);
	}, [filled, animateOnFill, wasFilled]);

	const rects = filled ? FILLED_RECTS : OUTLINE_RECTS;
	const particleSize = Math.max(3, size * 0.25);
	const animName = `pb${uniqueId.replace(/:/g, "")}`;

	return (
		<span
			className={`inline-flex items-center justify-center relative ${className}`}
			style={{ width: size, height: (size / GRID_W) * GRID_H }}
		>
			<svg
				width={size}
				height={(size / GRID_W) * GRID_H}
				viewBox={`0 0 ${GRID_W} ${GRID_H}`}
				xmlns="http://www.w3.org/2000/svg"
				style={{
					transform: popping ? "scale(1.3)" : "scale(1)",
					transition: "transform 200ms ease-out",
				}}
				aria-hidden="true"
			>
				{rects.map((r) => (
					<rect
						key={`${uniqueId}-${r.y}-${r.x}`}
						x={r.x}
						y={r.y}
						width={1}
						height={1}
						fill={filled ? "#ef4444" : "currentColor"}
					/>
				))}
			</svg>

			{particles.map((p) => (
				<span
					key={`${uniqueId}-p-${p.id}`}
					className={animName}
					style={{
						position: "absolute",
						left: "50%",
						top: "50%",
						width: particleSize,
						height: particleSize,
						marginLeft: -particleSize / 2,
						marginTop: -particleSize / 2,
						backgroundColor: "#ef4444",
						outline: "1px solid #991b1b",
						animationDelay: `${p.delay}ms`,
						transform: `translate(${p.tx}px, ${p.ty}px)`,
						opacity: 0,
					}}
				/>
			))}

			{particles.length > 0 && (
				<style
					// biome-ignore lint/security/noDangerouslySetInnerHtml: Dynamic keyframe injection
					dangerouslySetInnerHTML={{
						__html: `.${animName}{animation:${animName} 450ms ease-out forwards}@keyframes ${animName}{0%{transform:translate(0,0);opacity:1}100%{opacity:0}}`,
					}}
				/>
			)}
		</span>
	);
}
