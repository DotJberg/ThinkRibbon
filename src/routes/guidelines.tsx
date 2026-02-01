import { createFileRoute } from "@tanstack/react-router";
import ReactMarkdown from "react-markdown";
import guidelinesMd from "../../user_guideline.md?raw";

export const Route = createFileRoute("/guidelines")({
	component: GuidelinesPage,
});

function GuidelinesPage() {
	return (
		<div className="min-h-screen bg-gray-900 text-gray-100 p-8">
			<div className="max-w-4xl mx-auto">
				<div className="prose prose-invert max-w-none">
					<ReactMarkdown>{guidelinesMd}</ReactMarkdown>
				</div>
			</div>
		</div>
	);
}
