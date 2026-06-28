/**
 * LazyImage — صورة بـ skeleton أثناء التحميل
 * FIX: loading="eager" دائماً — لأن الـ browser-native lazy loading يسبب فراغات بيضاء
 * أثناء التمرير السريع. المكوّن يملك skeleton خاص به فلا حاجة للـ lazy loading الأصلي.
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

export function LazyImage({ src, alt, className, placeholderClassName, eager: _eager, ...props }: LazyImageProps) {
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
      {/* الصورة دائماً مرئية — eager loading لمنع الفراغات أثناء التمرير السريع */}
      <img
        src={src}
        alt={alt}
        loading="eager"
        decoding="async"
        fetchPriority="high"
        onLoad={() => setLoaded(true)}
        className="w-full h-full object-cover"
        {...props}
      />
    </div>
  );
}
