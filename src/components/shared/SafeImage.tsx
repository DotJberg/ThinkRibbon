import { useState } from "react";

interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
	fallback?: React.ReactNode;
}

export function SafeImage({
	src,
	alt,
	className,
	fallback,
	crossOrigin = "anonymous",
	onError,
	...props
}: SafeImageProps) {
	const [hasError, setHasError] = useState(false);

	if (hasError) {
		return fallback || null;
	}

	return (
		<img
			src={src}
			alt={alt}
			className={className}
			crossOrigin={crossOrigin}
			onError={(e) => {
				setHasError(true);
				onError?.(e);
			}}
			{...props}
		/>
	);
}
