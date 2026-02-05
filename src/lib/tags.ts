export interface TagDefinition {
	label: string;
	bg: string;
	text: string;
	border: string;
}

export const TAGS: Record<string, TagDefinition> = {
	Dropped: {
		label: "Dropped",
		bg: "bg-red-500/20",
		text: "text-red-400",
		border: "border-red-500/30",
	},
	Endless: {
		label: "Endless",
		bg: "bg-cyan-500/20",
		text: "text-cyan-400",
		border: "border-cyan-500/30",
	},
	Favorite: {
		label: "Favorite",
		bg: "bg-pink-500/20",
		text: "text-pink-400",
		border: "border-pink-500/30",
	},
	"Co-op": {
		label: "Co-op",
		bg: "bg-green-500/20",
		text: "text-green-400",
		border: "border-green-500/30",
	},
	Multiplayer: {
		label: "Multiplayer",
		bg: "bg-teal-500/20",
		text: "text-teal-400",
		border: "border-teal-500/30",
	},
	Completed: {
		label: "Completed",
		bg: "bg-purple-500/20",
		text: "text-purple-400",
		border: "border-purple-500/30",
	},
	Beaten: {
		label: "Beaten",
		bg: "bg-blue-500/20",
		text: "text-blue-400",
		border: "border-blue-500/30",
	},
	Replayed: {
		label: "Replayed",
		bg: "bg-orange-500/20",
		text: "text-orange-400",
		border: "border-orange-500/30",
	},
	"First Play": {
		label: "First Play",
		bg: "bg-indigo-500/20",
		text: "text-indigo-400",
		border: "border-indigo-500/30",
	},
	"Must-Play": {
		label: "Must-Play",
		bg: "bg-amber-500/20",
		text: "text-amber-400",
		border: "border-amber-500/30",
	},
	Underrated: {
		label: "Underrated",
		bg: "bg-emerald-500/20",
		text: "text-emerald-400",
		border: "border-emerald-500/30",
	},
	Overrated: {
		label: "Overrated",
		bg: "bg-rose-500/20",
		text: "text-rose-400",
		border: "border-rose-500/30",
	},
	Cozy: {
		label: "Cozy",
		bg: "bg-fuchsia-500/20",
		text: "text-fuchsia-400",
		border: "border-fuchsia-500/30",
	},
	"Story-Driven": {
		label: "Story-Driven",
		bg: "bg-violet-500/20",
		text: "text-violet-400",
		border: "border-violet-500/30",
	},
	Casual: {
		label: "Casual",
		bg: "bg-sky-500/20",
		text: "text-sky-400",
		border: "border-sky-500/30",
	},
	"Early Access": {
		label: "Early Access",
		bg: "bg-yellow-500/20",
		text: "text-yellow-400",
		border: "border-yellow-500/30",
	},
	Nostalgic: {
		label: "Nostalgic",
		bg: "bg-lime-500/20",
		text: "text-lime-400",
		border: "border-lime-500/30",
	},
};

export const TAG_KEYS = Object.keys(TAGS);
