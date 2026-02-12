"use client";

import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Mention from "@tiptap/extension-mention";
import Placeholder from "@tiptap/extension-placeholder";
import { type Editor, EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useConvex } from "convex/react";
import {
	Bold,
	Heading1,
	Heading2,
	Heading3,
	Image as ImageIcon,
	Italic,
	Link as LinkIcon,
	List,
	ListOrdered,
	Quote,
	Redo,
	Undo,
	Unlink,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
	cleanEmbedHtml,
	extractEmbedUrlFromHtml,
	getEmbedInfo,
} from "../../lib/embed-utils";
import { transformContentForPreview } from "../../lib/tiptap-link-preview";
import { createGameMention } from "./GameMention";
import { ImageUploadModal } from "./ImageUploadModal";
import { LinkPreviewExtension } from "./LinkPreviewNode";
import { createUserMention } from "./UserMention";

interface RichTextEditorProps {
	content?: string; // JSON string
	onChange?: (json: string) => void;
	placeholder?: string;
	uploadEndpoint: "articleInlineImage" | "reviewInlineImage";
	onImageUpload?: (url: string, fileKey: string, caption?: string) => void;
	editable?: boolean;
	className?: string;
}

export function RichTextEditor({
	content,
	onChange,
	placeholder = "Start writing...",
	uploadEndpoint,
	onImageUpload,
	editable = true,
	className = "",
}: RichTextEditorProps) {
	const [imageModalOpen, setImageModalOpen] = useState(false);
	const convex = useConvex();

	const editor = useEditor({
		extensions: [
			StarterKit.configure({
				heading: {
					levels: [1, 2, 3],
				},
			}),
			Image.configure({
				HTMLAttributes: {
					class: "rounded-lg max-w-full h-auto mx-auto my-4",
				},
				allowBase64: false,
			}),
			Link.configure({
				openOnClick: false,
				autolink: true,
				linkOnPaste: true,
				HTMLAttributes: {
					class: "text-slate-400 underline hover:text-slate-300",
				},
			}),
			Placeholder.configure({
				placeholder,
			}),
			createUserMention(convex),
			createGameMention(convex),
		],
		content: content ? JSON.parse(content) : undefined,
		editable,
		onUpdate: ({ editor }) => {
			if (onChange) {
				onChange(JSON.stringify(editor.getJSON()));
			}
		},
		editorProps: {
			attributes: {
				class:
					"prose prose-invert prose-lg max-w-none focus:outline-none min-h-[300px] px-4 py-3",
			},
			handlePaste(view, event) {
				const clipboardData = event.clipboardData;
				if (!clipboardData) return false;

				const plainText = clipboardData.getData("text/plain").trim();
				const html = clipboardData.getData("text/html");

				// Find an embed URL from: direct URL, HTML embed code in
				// plain text (e.g. YouTube iframe), or HTML clipboard data
				// (e.g. Twitter blockquote)
				const embedUrl =
					(plainText && getEmbedInfo(plainText) && plainText) ||
					(plainText && extractEmbedUrlFromHtml(plainText)) ||
					(html && extractEmbedUrlFromHtml(html));

				if (embedUrl) {
					const { schema } = view.state;
					const linkNode = schema.text(embedUrl, [
						schema.marks.link.create({ href: embedUrl }),
					]);
					const paragraph = schema.nodes.paragraph.create(null, linkNode);
					const tr = view.state.tr.replaceSelectionWith(paragraph);
					view.dispatch(tr);
					return true;
				}

				return false;
			},
			transformPastedHTML(html) {
				return cleanEmbedHtml(html);
			},
		},
	});

	// Update content when it changes externally
	useEffect(() => {
		if (editor && content) {
			const currentContent = JSON.stringify(editor.getJSON());
			if (currentContent !== content) {
				editor.commands.setContent(JSON.parse(content));
			}
		}
	}, [content, editor]);

	const handleImageInsert = useCallback(
		(url: string, fileKey: string, caption?: string) => {
			if (editor) {
				editor
					.chain()
					.focus()
					.setImage({ src: url, alt: caption || "" })
					.run();

				if (onImageUpload) {
					onImageUpload(url, fileKey, caption);
				}
			}
			setImageModalOpen(false);
		},
		[editor, onImageUpload],
	);

	if (!editor) {
		return (
			<div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 min-h-[300px] animate-pulse" />
		);
	}

	return (
		<div
			className={`bg-gray-800/50 border border-gray-700 rounded-lg overflow-hidden ${className}`}
		>
			{editable && (
				<Toolbar editor={editor} onImageClick={() => setImageModalOpen(true)} />
			)}
			<EditorContent editor={editor} />

			<ImageUploadModal
				open={imageModalOpen}
				onClose={() => setImageModalOpen(false)}
				onInsert={handleImageInsert}
				uploadEndpoint={uploadEndpoint}
			/>
		</div>
	);
}

interface ToolbarProps {
	editor: Editor;
	onImageClick: () => void;
}

function Toolbar({ editor, onImageClick }: ToolbarProps) {
	const setLink = useCallback(() => {
		const previousUrl = editor.getAttributes("link").href;
		const url = window.prompt("URL", previousUrl);

		if (url === null) {
			return;
		}

		if (url === "") {
			editor.chain().focus().extendMarkRange("link").unsetLink().run();
			return;
		}

		editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
	}, [editor]);

	return (
		<div className="flex flex-wrap items-center gap-1 p-2 border-b border-gray-700 bg-gray-800/80">
			{/* Text formatting */}
			<ToolbarButton
				onClick={() => editor.chain().focus().toggleBold().run()}
				active={editor.isActive("bold")}
				title="Bold"
			>
				<Bold size={18} />
			</ToolbarButton>
			<ToolbarButton
				onClick={() => editor.chain().focus().toggleItalic().run()}
				active={editor.isActive("italic")}
				title="Italic"
			>
				<Italic size={18} />
			</ToolbarButton>

			<ToolbarDivider />

			{/* Headings */}
			<ToolbarButton
				onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
				active={editor.isActive("heading", { level: 1 })}
				title="Heading 1"
			>
				<Heading1 size={18} />
			</ToolbarButton>
			<ToolbarButton
				onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
				active={editor.isActive("heading", { level: 2 })}
				title="Heading 2"
			>
				<Heading2 size={18} />
			</ToolbarButton>
			<ToolbarButton
				onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
				active={editor.isActive("heading", { level: 3 })}
				title="Heading 3"
			>
				<Heading3 size={18} />
			</ToolbarButton>

			<ToolbarDivider />

			{/* Lists */}
			<ToolbarButton
				onClick={() => editor.chain().focus().toggleBulletList().run()}
				active={editor.isActive("bulletList")}
				title="Bullet List"
			>
				<List size={18} />
			</ToolbarButton>
			<ToolbarButton
				onClick={() => editor.chain().focus().toggleOrderedList().run()}
				active={editor.isActive("orderedList")}
				title="Numbered List"
			>
				<ListOrdered size={18} />
			</ToolbarButton>
			<ToolbarButton
				onClick={() => editor.chain().focus().toggleBlockquote().run()}
				active={editor.isActive("blockquote")}
				title="Quote"
			>
				<Quote size={18} />
			</ToolbarButton>

			<ToolbarDivider />

			{/* Link */}
			<ToolbarButton
				onClick={setLink}
				active={editor.isActive("link")}
				title="Add Link"
			>
				<LinkIcon size={18} />
			</ToolbarButton>
			{editor.isActive("link") && (
				<ToolbarButton
					onClick={() => editor.chain().focus().unsetLink().run()}
					title="Remove Link"
				>
					<Unlink size={18} />
				</ToolbarButton>
			)}

			{/* Image */}
			<ToolbarButton onClick={onImageClick} title="Insert Image">
				<ImageIcon size={18} />
			</ToolbarButton>

			<div className="flex-1" />

			{/* Undo/Redo */}
			<ToolbarButton
				onClick={() => editor.chain().focus().undo().run()}
				disabled={!editor.can().undo()}
				title="Undo"
			>
				<Undo size={18} />
			</ToolbarButton>
			<ToolbarButton
				onClick={() => editor.chain().focus().redo().run()}
				disabled={!editor.can().redo()}
				title="Redo"
			>
				<Redo size={18} />
			</ToolbarButton>
		</div>
	);
}

interface ToolbarButtonProps {
	onClick: () => void;
	active?: boolean;
	disabled?: boolean;
	title: string;
	children: React.ReactNode;
}

function ToolbarButton({
	onClick,
	active,
	disabled,
	title,
	children,
}: ToolbarButtonProps) {
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			title={title}
			className={`p-2 rounded hover:bg-gray-700 transition-colors ${
				active ? "bg-slate-600/30 text-slate-400" : "text-gray-400"
			} ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
		>
			{children}
		</button>
	);
}

function ToolbarDivider() {
	return <div className="w-px h-6 bg-gray-700 mx-1" />;
}

// Export for rendering content in read-only mode
export function RichTextContent({
	content,
	className = "",
}: {
	content: string;
	className?: string;
}) {
	const handleMentionClick = useCallback(
		(e: React.MouseEvent<HTMLDivElement>) => {
			const target = e.target as HTMLElement;
			const mentionEl = target.closest("[data-type]") as HTMLElement | null;
			if (!mentionEl) return;

			const type = mentionEl.dataset.type;
			const id = mentionEl.dataset.id;

			if (type === "userMention" && id) {
				// Find the username from attrs - stored in data-username
				const username =
					mentionEl.dataset.username || mentionEl.getAttribute("data-username");
				if (username) {
					window.location.href = `/profile/${username}`;
				}
			} else if (type === "gameMention" && id) {
				const slug =
					mentionEl.dataset.slug || mentionEl.getAttribute("data-slug");
				if (slug) {
					window.location.href = `/games/${slug}`;
				}
			}
		},
		[],
	);
	const transformedContent = useMemo(
		() => transformContentForPreview(JSON.parse(content)),
		[content],
	);

	const userMentionReadonly = Mention.extend({
		name: "userMention",
	}).configure({
		HTMLAttributes: {
			class: "text-sky-400 font-medium cursor-pointer hover:underline",
			"data-type": "userMention",
		},
		renderLabel({ node }) {
			return node.attrs.displayText || node.attrs.label || "";
		},
	});

	const gameMentionReadonly = Mention.extend({
		name: "gameMention",
	}).configure({
		HTMLAttributes: {
			class: "text-emerald-400 font-medium cursor-pointer hover:underline",
			"data-type": "gameMention",
		},
		renderLabel({ node }) {
			return node.attrs.displayText || node.attrs.label || "";
		},
	});

	const editor = useEditor({
		extensions: [
			StarterKit.configure({
				heading: {
					levels: [1, 2, 3],
				},
			}),
			Image.configure({
				HTMLAttributes: {
					class: "rounded-lg max-w-full h-auto mx-auto my-4",
				},
			}),
			Link.configure({
				openOnClick: true,
				HTMLAttributes: {
					class: "text-slate-400 underline hover:text-slate-300",
				},
			}),
			LinkPreviewExtension,
			userMentionReadonly,
			gameMentionReadonly,
		],
		content: transformedContent,
		editable: false,
		immediatelyRender: false,
		editorProps: {
			attributes: {
				class: "prose prose-invert prose-lg max-w-none",
			},
		},
	});

	// Ensure transformed content (with linkPreview nodes) is applied after editor creation
	useEffect(() => {
		if (editor && transformedContent) {
			editor.commands.setContent(transformedContent);
		}
	}, [editor, transformedContent]);

	if (!editor) {
		return (
			<div
				className={`animate-pulse bg-gray-800/50 rounded-lg h-32 ${className}`}
			/>
		);
	}

	return (
		/* biome-ignore lint/a11y/noStaticElementInteractions: delegated click handler for mention navigation */
		/* biome-ignore lint/a11y/useKeyWithClickEvents: mentions inside are already keyboard-accessible links */
		<div className={className} onClick={handleMentionClick}>
			<EditorContent editor={editor} />
		</div>
	);
}
