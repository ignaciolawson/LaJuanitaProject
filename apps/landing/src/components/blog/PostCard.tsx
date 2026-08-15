import Image from "next/image";
import Link from "next/link";
import clsx from "clsx";

import { CATEGORY_LABEL, formatPostDate, readingMinutes, type Post } from "@/data/posts";

/**
 * Tarjeta de nota. Se usa en el índice del blog, en "Seguí leyendo" y en la
 * tira de novedades de la home, así que la variante define el tamaño de la
 * foto y del titular — no el layout, que lo pone la grilla de cada lugar.
 */
export function PostCard({
  post,
  size = "md",
  className,
}: {
  post: Post;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      data-cursor="LEER"
      className={clsx(
        "group flex h-full flex-col border border-[color:var(--page-line)] transition-colors hover:border-red",
        className,
      )}
    >
      <div className={clsx("relative overflow-hidden", size === "sm" ? "h-44" : "h-56")}>
        <Image
          src={post.cover}
          alt=""
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 30vw"
          className="duotone object-cover transition-transform duration-700 group-hover:scale-[1.04]"
        />
        <span className="t-mono absolute left-4 top-4 bg-[color:var(--page-bg)] px-2 py-1 text-accent">
          {CATEGORY_LABEL[post.category]}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-6">
        <h3
          className={clsx(
            "t-display-tight leading-[1.05]",
            size === "sm" ? "text-xl" : "text-[clamp(22px,2vw,28px)]",
          )}
        >
          {post.title}
        </h3>
        <p className="t-body mt-3 text-sm text-[color:var(--page-muted)]">{post.excerpt}</p>

        <div className="t-mono mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-6 text-[color:var(--page-faint)]">
          <time dateTime={post.date}>{formatPostDate(post.date)}</time>
          <span aria-hidden>·</span>
          <span>{readingMinutes(post)} min</span>
          <span
            aria-hidden
            className="ml-auto text-accent transition-transform duration-500 group-hover:translate-x-1"
          >
            →
          </span>
        </div>
      </div>
    </Link>
  );
}
