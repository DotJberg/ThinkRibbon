export const GENRES: string[] = [
	"Action",
	"Adventure",
	"Arcade",
	"Battle Royale",
	"Beat 'em up",
	"Card & Board Game",
	"Deckbuilder",
	"Dungeon Crawler",
	"Fighting",
	"Hack and Slash",
	"Hero Shooter",
	"Horror",
	"Indie",
	"Japanese Role Playing Game",
	"Metroidvania",
	"MMO",
	"MOBA",
	"Music",
	"Open World",
	"Party Game",
	"Pinball",
	"Platform",
	"Point-and-click",
	"Puzzle",
	"Quiz/Trivia",
	"Racing",
	"Real Time Strategy (RTS)",
	"Roguelike",
	"Role-playing (RPG)",
	"Sandbox",
	"Shoot 'em Up",
	"Shooter",
	"Simulator",
	"Sport",
	"Stealth",
	"Strategy",
	"Survival",
	"Tactical",
	"Tower Defense",
	"Turn-based strategy (TBS)",
	"Visual Novel",
];

/** Maps IGDB genre names to our normalized genre names */
export const IGDB_GENRE_MAP: Record<string, string> = {
	"Hack and Slash/Beat 'em up": "Hack and Slash",
	"Real Time Strategy (RTS)": "Real Time Strategy (RTS)",
	"Role-playing (RPG)": "Role-playing (RPG)",
	"Turn-based strategy (TBS)": "Turn-based strategy (TBS)",
	"Card & Board Game": "Card & Board Game",
	"Point-and-click": "Point-and-click",
	"Quiz/Trivia": "Quiz/Trivia",
	Shooter: "Shooter",
	Platform: "Platform",
	Racing: "Racing",
	Fighting: "Fighting",
	Simulator: "Simulator",
	Sport: "Sport",
	Strategy: "Strategy",
	Puzzle: "Puzzle",
	Adventure: "Adventure",
	Indie: "Indie",
	Arcade: "Arcade",
	Music: "Music",
	"Visual Novel": "Visual Novel",
	Pinball: "Pinball",
	MOBA: "MOBA",
	Tactical: "Tactical",
};

/** Normalizes IGDB genre names to our genre set */
export function normalizeIgdbGenres(igdbGenres: string[]): string[] {
	const normalized = new Set<string>();
	for (const genre of igdbGenres) {
		const mapped = IGDB_GENRE_MAP[genre];
		if (mapped) {
			normalized.add(mapped);
		} else if (GENRES.includes(genre)) {
			normalized.add(genre);
		}
	}
	return [...normalized].sort();
}
