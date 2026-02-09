import { useId } from "react";

interface PixelSpeechBubbleProps {
	size?: number;
	className?: string;
	active?: boolean;
}

// Pixel speech bubble with bouncing "..." dots on a 13x11 grid
// Outline-only bubble (matching PixelHeart style) with three dots inside

// Bubble outline pixels
const BUBBLE: Array<[number, number]> = [
	// Top rounded edge
	[3, 0],
	[4, 0],
	[5, 0],
	[6, 0],
	[7, 0],
	[8, 0],
	[9, 0],
	[2, 1],
	[10, 1],
	// Sides
	[1, 2],
	[11, 2],
	[1, 3],
	[11, 3],
	[1, 4],
	[11, 4],
	[1, 5],
	[11, 5],
	// Bottom edge
	[2, 6],
	[10, 6],
	[3, 7],
	[4, 7],
	[5, 7],
	[6, 7],
	[7, 7],
	[8, 7],
	[9, 7],
	// Tail
	[4, 8],
	[3, 9],
	[2, 10],
];

const GRID_W = 13;
const GRID_H = 11;

export function PixelSpeechBubble({
	size = 20,
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
		`.${c}-d1{transform-origin:4.5px 4px}`,
		`.${c}-d2{transform-origin:6.5px 4px}`,
		`.${c}-d3{transform-origin:8.5px 4px}`,
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
					y={3}
					width={1}
					height={2}
					fill="currentColor"
				/>
				<rect
					className={`${c}-d2`}
					x={6}
					y={3}
					width={1}
					height={2}
					fill="currentColor"
				/>
				<rect
					className={`${c}-d3`}
					x={8}
					y={3}
					width={1}
					height={2}
					fill="currentColor"
				/>
			</svg>
		</span>
	);
}
