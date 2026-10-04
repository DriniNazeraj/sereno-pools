/** AVIF + WebP <picture> with srcset and explicit dimensions. */
type Props = {
  slug: string;
  widths: number[];
  width: number;
  height: number;
  alt: string;
  sizes: string;
  className?: string;
  imgClassName?: string;
  eager?: boolean;
};
export function Picture({ slug, widths, width, height, alt, sizes, className, imgClassName, eager }: Props) {
  const set = (ext: string) => widths.map((w) => `/images/${slug}-${w}.${ext} ${w}w`).join(", ");
  return (
    <picture className={className}>
      <source type="image/avif" srcSet={set("avif")} sizes={sizes} />
      <source type="image/webp" srcSet={set("webp")} sizes={sizes} />
      <img
        src={`/images/${slug}-${widths[0]}.webp`}
        width={width}
        height={height}
        alt={alt}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        className={imgClassName}
      />
    </picture>
  );
}
