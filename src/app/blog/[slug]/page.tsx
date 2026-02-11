import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import { Nav } from "@/components/marketing/nav";
import { Footer } from "@/components/marketing/footer";
import { getAllPosts, getPostBySlug } from "@/lib/blog/posts";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};

  return {
    title: `${post.title} | Built for Devs`,
    description: post.description,
    authors: [{ name: post.author }],
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      publishedTime: post.publishedAt,
      authors: [post.author],
      ...(post.ogImage && {
        images: [{ url: post.ogImage, width: 1200, height: 630 }],
      }),
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
      ...(post.ogImage && { images: [post.ogImage] }),
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  return (
    <div className="min-h-screen bg-white">
      <Nav />
      <article className="px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <Link
            href="/blog"
            className="text-sm text-brand-gray hover:text-brand-dark"
          >
            &larr; Back to blog
          </Link>

          <header className="mt-8">
            <h1 className="text-3xl font-bold leading-tight text-brand-dark md:text-4xl">
              {post.title}
            </h1>
            <div className="mt-4 flex items-center gap-3 text-sm text-brand-gray">
              <span>{post.author}</span>
              <span>&middot;</span>
              <time>
                {new Date(post.publishedAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </time>
            </div>
          </header>

          {post.ogImage && (
            <Image
              src={post.ogImage}
              alt={post.title}
              width={1200}
              height={630}
              className="mt-8 rounded-lg"
              priority
            />
          )}

          <div className="prose mt-10 max-w-none">
            <ReactMarkdown
              components={{
                h2: ({ children }) => (
                  <h2 className="mb-4 mt-10 text-2xl font-bold text-brand-dark">
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="mb-3 mt-8 text-xl font-semibold text-brand-dark">
                    {children}
                  </h3>
                ),
                p: ({ children }) => (
                  <p className="mb-4 leading-relaxed text-brand-gray">
                    {children}
                  </p>
                ),
                ul: ({ children }) => (
                  <ul className="mb-4 list-disc space-y-2 pl-6 text-brand-gray">
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol className="mb-4 list-decimal space-y-2 pl-6 text-brand-gray">
                    {children}
                  </ol>
                ),
                li: ({ children }) => (
                  <li className="leading-relaxed">{children}</li>
                ),
                strong: ({ children }) => (
                  <strong className="font-semibold text-brand-dark">
                    {children}
                  </strong>
                ),
                em: ({ children }) => (
                  <em className="italic text-brand-gray">{children}</em>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="my-6 border-l-4 border-brand-green pl-4 italic text-brand-gray">
                    {children}
                  </blockquote>
                ),
              }}
            >
              {post.content}
            </ReactMarkdown>
          </div>
        </div>
      </article>
      <Footer />
    </div>
  );
}
