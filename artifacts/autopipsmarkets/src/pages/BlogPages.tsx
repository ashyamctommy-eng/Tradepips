import { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Search } from 'lucide-react';
import { Link, useParams } from 'wouter';
import { getGetBlogPostQueryKey, getGetBlogPostsQueryKey, useGetBlogPost, useGetBlogPosts } from '@workspace/api-client-react';
import type { BlogPost } from '@workspace/api-client-react';
import PublicShell from '@/components/PublicShell';

export function BlogPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const params = useMemo(() => ({
    ...(category === 'All' ? {} : { category }),
    ...(search.trim() ? { search: search.trim() } : {}),
  }), [category, search]);
  const query = useGetBlogPosts(params, { query: { queryKey: getGetBlogPostsQueryKey(params) } });
  const posts = query.data ?? [];
  return <PublicShell><main className="page-wrap">
    <section className="page-hero"><div className="eyebrow">THE TRADEITX JOURNAL</div><h1>Ideas worth <em>testing.</em></h1><p>Practical notes on market structure, strategy, and learning in a simulated terminal.</p></section>
    <div className="blog-search"><Search size={16} aria-hidden="true" /><input placeholder="Search the journal" value={search} onChange={event => setSearch(event.target.value)} aria-label="Search articles" data-testid="input-blog-search" /></div>
    <div className="category-tabs">{['All', 'Technical Analysis', 'Strategy', 'Crypto'].map(value => <button className={category === value ? 'selected' : ''} key={value} onClick={() => setCategory(value)} data-testid={`button-blog-category-${value.toLowerCase().replaceAll(' ', '-')}`}>{value}</button>)}</div>
    {query.isLoading ? <div className="blog-grid" aria-label="Loading articles">{[0, 1, 2].map(index => <div key={index} className="skeleton" />)}</div>
      : query.isError ? <div className="error-panel" role="alert">Journal posts could not be loaded. <button className="small-btn" onClick={() => void query.refetch()}>Try again</button></div>
      : posts.length === 0 ? <div className="content-panel" style={{ margin: '24px 0 80px' }}><BookOpen /><h2>No articles found</h2><p>Try another search or category.</p></div>
      : <div className="blog-grid">{posts.map(post => <Link className="blog-card" href={`/blog/${post.slug}`} key={post.id} data-testid={`link-blog-${post.slug}`}><div className="blog-meta">{post.category} · {post.status === 'PUBLISHED' ? 'Published' : 'Draft'}</div><h2>{post.title}</h2><p>{post.excerpt}</p><div className="blog-meta" style={{ marginTop: 'auto' }}>Read article <ArrowRight size={12} /></div></Link>)}</div>}
  </main></PublicShell>;
}

export function BlogArticle() {
  const { slug = '' } = useParams<{ slug: string }>();
  const query = useGetBlogPost(slug, { query: { queryKey: getGetBlogPostQueryKey(slug), enabled: Boolean(slug), retry: false } });
  const post = query.data as BlogPost | undefined;
  return <PublicShell><main className="page-wrap">
    <div className="page-hero">{query.isLoading ? <div className="skeleton" aria-label="Loading article" />
      : query.isError || !post ? <><div className="eyebrow">ARTICLE NOT FOUND</div><h1>That page has moved.</h1><Link href="/blog" className="button-quiet"><ArrowLeft size={13} /> Back to journal</Link></>
      : <><div className="eyebrow">{post.category} · {new Date(post.publishedAt ?? post.createdAt).toLocaleDateString()}</div><h1>{post.title}</h1><p>{post.excerpt}</p></>}</div>
    {post && <article className="content-panel" style={{ maxWidth: 800, marginBottom: 80, whiteSpace: 'pre-wrap', lineHeight: 1.9, fontSize: 14 }} data-testid="text-blog-body">{post.body}</article>}
  </main></PublicShell>;
}
