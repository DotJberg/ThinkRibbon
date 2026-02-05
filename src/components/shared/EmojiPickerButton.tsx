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
				className="text-gray-400 hover:text-purple-400 transition-colors"
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
					<div className="absolute bottom-full mb-2 right-0 z-50">
						<EmojiPicker
							theme={Theme.DARK}
							onEmojiClick={(emojiData) => {
								onEmojiSelect(emojiData.emoji);
								setShowPicker(false);
							}}
							width={320}
							height={400}
						/>
					</div>
				</>
			)}
		</div>
	);
}
