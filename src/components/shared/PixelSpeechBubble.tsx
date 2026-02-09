import { useId } from "react";

interface PixelSpeechBubbleProps {
	size?: number;
	className?: string;
	active?: boolean;
}

// Pixel speech bubble with bouncing "..." dots on a 13x11 grid
// Outline-only bubble (matching PixelHeart style) with three dots inside

// Bubble outline pixels on a 15x14 grid
const BUBBLE: Array<[number, number]> = [
	// Top rounded edge
	[3, 0],
	[4, 0],
	[5, 0],
	[6, 0],
	[7, 0],
	[8, 0],
	[9, 0],
	[10, 0],
	[11, 0],
	[2, 1],
	[12, 1],
	// Sides
	[1, 2],
	[13, 2],
	[1, 3],
	[13, 3],
	[1, 4],
	[13, 4],
	[1, 5],
	[13, 5],
	[1, 6],
	[13, 6],
	[1, 7],
	[13, 7],
	// Bottom edge
	[2, 8],
	[12, 8],
	[3, 9],
	[4, 9],
	[5, 9],
	[6, 9],
	[7, 9],
	[8, 9],
	[9, 9],
	[10, 9],
	[11, 9],
	// Tail (chunky staircase, bottom-left)
	[3, 10],
	[4, 10],
	[2, 11],
	[3, 11],
	[1, 12],
	[2, 12],
];

const GRID_W = 15;
const GRID_H = 13;

export function PixelSpeechBubble({
	size = 24,
	className = "",
	active = false,
}: PixelSpeechBubbleProps) {
	const uid = useId().replace(/:/g, "");
	const h = (size / GRID_W) * GRID_H;
	const c = `psb${uid}`;

	// All animation is driven by CSS — no inline animation styles so specificity works
	const css = [
		`@keyframes ${c}-b{0%,100%{transform:translateY(0)}50%{transform:translateY(-1.5px)}}`,
		`@keyframes ${c}-pop{0%,100%{transform:translateY(0)}40%{transform:translateY(-1px)}60%{transform:translateY(0.5px)}}`,
		// Base: no animation, dots rest in place
		`.${c}-d1{transform-origin:5px 5px}`,
		`.${c}-d2{transform-origin:7.5px 5px}`,
		`.${c}-d3{transform-origin:10px 5px}`,
		// Hover: animate
		`.${c}:hover .${c}-d1{animation:${c}-b 800ms ease-in-out infinite}`,
		`.${c}:hover .${c}-d2{animation:${c}-b 800ms ease-in-out infinite 150ms}`,
		`.${c}:hover .${c}-d3{animation:${c}-b 800ms ease-in-out infinite 300ms}`,
		`.${c}:hover .${c}-svg{animation:${c}-pop 800ms ease-in-out infinite}`,
		// Active: always animate
		active
			? [
					`.${c} .${c}-d1{animation:${c}-b 800ms ease-in-out infinite}`,
					`.${c} .${c}-d2{animation:${c}-b 800ms ease-in-out infinite 150ms}`,
					`.${c} .${c}-d3{animation:${c}-b 800ms ease-in-out infinite 300ms}`,
					`.${c} .${c}-svg{animation:${c}-pop 800ms ease-in-out infinite}`,
				].join("")
			: "",
	].join("");

	return (
		<span
			className={`inline-flex items-center justify-center ${c} ${className}`}
			style={{ width: size, height: h }}
		>
			<style
				// biome-ignore lint/security/noDangerouslySetInnerHtml: Scoped keyframe for dot bounce
				dangerouslySetInnerHTML={{ __html: css }}
			/>
			<svg
				className={`${c}-svg`}
				width={size}
				height={h}
				viewBox={`0 0 ${GRID_W} ${GRID_H}`}
				xmlns="http://www.w3.org/2000/svg"
				aria-hidden="true"
			>
				{BUBBLE.map(([x, y]) => (
					<rect
						key={`b${x}-${y}`}
						x={x}
						y={y}
						width={1}
						height={1}
						fill="currentColor"
					/>
				))}
				<rect
					className={`${c}-d1`}
					x={4}
					y={4}
					width={2}
					height={2}
					fill="currentColor"
				/>
				<rect
					className={`${c}-d2`}
					x={7}
					y={4}
					width={2}
					height={2}
					fill="currentColor"
				/>
				<rect
					className={`${c}-d3`}
					x={10}
					y={4}
					width={2}
					height={2}
					fill="currentColor"
				/>
			</svg>
		</span>
	);
}
