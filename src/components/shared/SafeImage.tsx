import { memo, useState } from "react";

interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
	fallback?: React.ReactNode;
}

export const SafeImage = memo(function SafeImage({
	src,
	alt,
	className,
	fallback,
	crossOrigin,
	loading = "lazy",
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
			loading={loading}
			onError={(e) => {
				setHasError(true);
				onError?.(e);
			}}
			{...props}
		/>
	);
});
