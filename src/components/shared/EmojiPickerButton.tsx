import EmojiPicker, { Theme } from "emoji-picker-react";
import { Smile } from "lucide-react";
import { useState } from "react";

interface EmojiPickerButtonProps {
	onEmojiSelect: (emoji: string) => void;
	size?: number;
}

export function EmojiPickerButton({
	onEmojiSelect,
	size = 20,
}: EmojiPickerButtonProps) {
	const [showPicker, setShowPicker] = useState(false);

	return (
		<div className="relative flex items-center">
			<button
				type="button"
				onClick={() => setShowPicker(!showPicker)}
				className="text-gray-400 hover:text-slate-400 transition-colors"
				title="Add emoji"
			>
				<Smile size={size} />
			</button>
			{showPicker && (
				<>
					{/* biome-ignore lint/a11y/noStaticElementInteractions: Emoji picker backdrop */}
					{/* biome-ignore lint/a11y/useKeyWithClickEvents: Click only for backdrop */}
					<div
						className="fixed inset-0 z-40"
						onClick={() => setShowPicker(false)}
					/>
					<div className="fixed sm:absolute bottom-0 left-0 right-0 sm:bottom-full sm:mb-2 sm:left-auto sm:right-0 z-50">
						<EmojiPicker
							theme={Theme.DARK}
							onEmojiClick={(emojiData) => {
								onEmojiSelect(emojiData.emoji);
								setShowPicker(false);
							}}
							width="100%"
							height={350}
						/>
					</div>
				</>
			)}
		</div>
	);
}
