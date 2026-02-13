import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/marketing/nav";
import { Footer } from "@/components/marketing/footer";
import { getAllPosts } from "@/lib/blog/posts";

export const metadata: Metadata = {
  title: "Blog | Built for Devs",
  description:
    "Insights on developer experience, product adoption, and building for developers. From the team at Built for Devs.",
  openGraph: {
    title: "Blog | Built for Devs",
    description:
      "Insights on developer experience, product adoption, and building for developers.",
    type: "website",
  },
};

export default function BlogIndexPage() {
  const posts = getAllPosts();

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <section className="px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-4xl font-bold text-brand-dark">Blog</h1>
          <p className="mt-4 text-lg text-brand-gray">
            Insights on developer experience, product adoption, and building for
            developers.
          </p>

          <div className="mt-12 grid gap-8">
            {posts.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="group block rounded-xl border p-6 transition-colors hover:border-brand-green/50 hover:bg-brand-light/50"
              >
                <time className="text-sm text-brand-gray">
                  {new Date(post.publishedAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </time>
                <h2 className="mt-2 text-xl font-semibold text-brand-dark group-hover:text-brand-green">
                  {post.title}
                </h2>
                <p className="mt-2 leading-relaxed text-brand-gray">
                  {post.description}
                </p>
                <span className="mt-4 inline-block text-sm font-medium text-brand-green">
                  Read more
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
