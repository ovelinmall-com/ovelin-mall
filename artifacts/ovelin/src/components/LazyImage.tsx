/**
 * LazyImage — صورة بـ skeleton أثناء التحميل
 * FIX: الصورة دائماً مرئية (opacity:1) — السكيلتون يختفي هو عند اكتمال التحميل
 * السبب: opacity-0 على الصورة يجعلها غير مرئية أثناء التمرير السريع
 * حتى لو بدأ التحميل، يرى المستخدم فراغاً حتى يكتمل onLoad
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
      {/* السكيلتون خلف الصورة — يختفي عند اكتمال التحميل */}
      {!loaded && (
        <div
          className={cn(
            "absolute inset-0 bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100 animate-pulse",
            placeholderClassName,
          )}
        />
      )}
      {/* الصورة دائماً مرئية — لا opacity-0 */}
      <img
        src={src}
        alt={alt}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={eager ? "high" : "auto"}
        onLoad={() => setLoaded(true)}
        className="w-full h-full object-cover"
        {...props}
      />
    </div>
  );
}
