import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
	appId: "com.thinkribbon.app",
	appName: "Think Ribbon",
	webDir: "dist",
	server: {
		androidScheme: "https",
	},
};

export default config;
