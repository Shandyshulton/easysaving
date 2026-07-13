import Image from "next/image";

import { cn } from "@/lib/utils";

type BrandLogoProps = {
	className?: string;
	priority?: boolean;
	sizes?: string;
};

export function BrandLogo({ className, priority = false, sizes = "(min-width: 1024px) 180px, 160px" }: BrandLogoProps) {
	return (
		<Image
			src="/logo-easysaving.png"
			alt="EasySaving"
			width={320}
			height={96}
			priority={priority}
			sizes={sizes}
			className={cn("h-auto w-40 object-contain", className)}
		/>
	);
}
