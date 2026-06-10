/**
 * LazyImage — صورة بـ skeleton أثناء التحميل
 * - لا يوجد opacity transition يؤخر الظهور — الصورة تظهر فور اكتمال التحميل
 * - لا يوجد IntersectionObserver gate
 * - prop eager=true تجبر loading="eager" للصور فوق الـ fold
 */
import { useState } from "react";
import { cn } from "@/lib/utils";

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  className?: string;
  placeholderClassName?: string;
  eager?: boolean;
}

export function LazyImage({ src, alt, className, placeholderClassName, eager, ...props }: LazyImageProps) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {!loaded && (
        <div
          className={cn(
            "absolute inset-0 bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100 animate-pulse",
            placeholderClassName,
          )}
        />
      )}
      <img
        src={src}
        alt={alt}
        loading={eager ? "eager" : "lazy"}
        onLoad={() => setLoaded(true)}
        className={cn("w-full h-full object-cover", !loaded && "opacity-0")}
        {...props}
      />
    </div>
  );
}
