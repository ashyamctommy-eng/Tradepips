import { useMemo, useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  getGetAdminProfileQueryKey, getGetAdminPostsQueryKey, getGetAdminSettingsQueryKey,
  getGetAdminSummaryQueryKey, getGetAdminUserLedgerQueryKey, getGetAdminUsersQueryKey,
  useAdjustAdminUserLedger, useCreateBlogPost, useDeleteBlogPost, useGetAdminPosts,
  useGetAdminProfile, useGetAdminSettings, useGetAdminSummary, useGetAdminUserLedger,
  useGetAdminUsers, useUpdateAdminSetting, useUpdateBlogPost,
} from '@workspace/api-client-react';
import type { AdminLedgerEntry, AdminSummary, AdminUser, BlogPost, BlogPostInput, PlatformSetting } from '@workspace/api-client-react';
import PublicShell from '@/components/PublicShell';

const settingDefaults = [
  { key: 'maintenance_mode', label: 'Maintenance mode', value: 'false', hint: 'Set to true to indicate scheduled maintenance.' },
  { key: 'announcement_banner', label: 'Announcement banner', value: '', hint: 'Optional banner message shown to platform visitors.' },
  { key: 'support_contact', label: 'Support contact', value: 'support@tradeitx.example', hint: 'Public support email address.' },
];

function PostTable({ posts, onEdit, onDelete }: { posts: BlogPost[]; onEdit: (post: BlogPost) => void; onDelete: (post: BlogPost) => void }) {
  return <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Title</th><th>Category</th><th>Status</th><th>Updated</th><th>Actions</th></tr></thead>
    <tbody>{posts.length === 0 ? <tr><td colSpan={5}>No articles yet. Create one to start the journal.</td></tr> : posts.map(post => <tr key={post.id}><td>{post.title}</td><td>{post.category}</td><td>{post.status}</td><td>{new Date(post.updatedAt).toLocaleDateString()}</td><td><button className="small-btn" onClick={() => onEdit(post)} data-testid={`button-edit-post-${post.id}`}>Edit</button> <button className="small-btn" onClick={() => onDelete(post)} data-testid={`button-delete-post-${post.id}`}>Delete</button></td></tr>)}</tbody>
  </table></div>;
}
interface QueryState<T> { data?: T; isLoading: boolean; isError: boolean; refetch: () => Promise<unknown> }

export default function AdminPage() {
  const queryClient = useQueryClient();
  const profile = useGetAdminProfile({ query: { queryKey: getGetAdminProfileQueryKey(), retry: false } });
  const permitted = Boolean(profile.data);
  const summary = useGetAdminSummary({ query: { queryKey: getGetAdminSummaryQueryKey(), enabled: permitted, retry: false } });
  const posts = useGetAdminPosts({ query: { queryKey: getGetAdminPostsQueryKey(), enabled: permitted, retry: false } });
  const settings = useGetAdminSettings({ query: { queryKey: getGetAdminSettingsQueryKey(), enabled: permitted, retry: false } });
  const [tab, setTab] = useState('Overview');
  const [search, setSearch] = useState('');
  const userParams = useMemo(() => ({ search: search || undefined }), [search]);
  const users = useGetAdminUsers(userParams, { query: { queryKey: getGetAdminUsersQueryKey(userParams), enabled: permitted && tab === 'Accounts', retry: false } });
  const [selectedUser, setSelectedUser] = useState('');
  const ledger = useGetAdminUserLedger(selectedUser, { query: { queryKey: getGetAdminUserLedgerQueryKey(selectedUser), enabled: Boolean(selectedUser) && permitted, retry: false } });
  const createPost = useCreateBlogPost();
  const updatePost = useUpdateBlogPost();
  const deletePost = useDeleteBlogPost();
  const updateSetting = useUpdateAdminSetting();
  const adjustLedger = useAdjustAdminUserLedger();
  const [editing, setEditing] = useState<BlogPost | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [settingValues, setSettingValues] = useState<Record<string, string>>({});
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [direction, setDirection] = useState<'CREDIT' | 'DEBIT'>('CREDIT');

  const refreshPosts = async () => Promise.all([
    queryClient.invalidateQueries({ queryKey: getGetAdminPostsQueryKey() }),
    queryClient.invalidateQueries({ queryKey: getGetAdminSummaryQueryKey() }),
  ]);
  const handleDelete = (post: BlogPost) => {
    if (!window.confirm(`Delete “${post.title}”?`)) return;
    deletePost.mutate({ postId: post.id }, {
      onSuccess: () => { setMessage('Article deleted.'); void refreshPosts(); },
      onError: cause => setError(cause instanceof Error ? cause.message : 'Article could not be deleted.'),
    });
  };
  const saveArticle = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editing) return;
    const form = new FormData(event.currentTarget);
    const data: BlogPostInput = {
      slug: String(form.get('slug')).trim(), title: String(form.get('title')).trim(),
      excerpt: String(form.get('excerpt')).trim(), body: String(form.get('body')),
      category: String(form.get('category')).trim(), status: String(form.get('status')) as BlogPostInput['status'],
    };
    const onSuccess = () => { setEditing(null); setMessage('Article saved.'); void refreshPosts(); };
    const onError = (cause: unknown) => setError(cause instanceof Error ? cause.message : 'Article could not be saved.');
    if (editing.id === 'new') createPost.mutate({ data }, { onSuccess, onError });
    else updatePost.mutate({ postId: editing.id, data }, { onSuccess, onError });
  };

  const isChecking = profile.isLoading;
  const isDenied = profile.isError;
  return <PublicShell><main className="page-wrap">
    <section className="page-hero"><div className="eyebrow">ADMIN CONSOLE</div><h1>Platform <em>control.</em></h1><p>Manage journal content, platform settings, and user demo wallets. Access is verified by the server.</p></section>
    {isChecking ? <div className="skeleton" aria-label="Checking administrator access" />
      : isDenied || !profile.data ? <div className="error-panel" role="alert">Administrator access required. Your current session may be missing or your account does not have the ADMIN role. No access is granted here.<br /><button className="small-btn" onClick={() => void profile.refetch()} style={{ marginTop: 12 }}>Retry access check</button></div>
      : <div className="admin-layout">
        <aside className="admin-side" aria-label="Admin sections">{['Overview', 'Articles', 'Accounts', 'Settings'].map(item => <button className={tab === item ? 'selected' : ''} key={item} onClick={() => setTab(item)} data-testid={`button-admin-tab-${item.toLowerCase()}`}>{item}</button>)}</aside>
        <section className="admin-main">
          {message && <div className="notice" role="status">{message}<button className="small-btn" onClick={() => setMessage('')} style={{ float: 'right' }}>Dismiss</button></div>}
          {error && <div className="error-panel" role="alert">{error}<button className="small-btn" onClick={() => setError('')} style={{ float: 'right' }}>Dismiss</button></div>}
          {tab === 'Overview' && <Overview summary={{ data: summary.data as AdminSummary | undefined, isLoading: summary.isLoading, isError: summary.isError, refetch: summary.refetch }} posts={posts.data ?? []} onEdit={setEditing} onDelete={handleDelete} />}
          {tab === 'Articles' && <section><div className="flex justify-between items-center"><h2>Journal articles</h2><button className="button-yellow" onClick={() => setEditing({ id: 'new', slug: '', title: '', excerpt: '', body: '', category: 'Strategy', status: 'DRAFT', createdAt: '', updatedAt: '' })} data-testid="button-admin-new-article">New article</button></div>
            {posts.isLoading ? <div className="skeleton" aria-label="Loading articles" /> : posts.isError ? <div className="error-panel">Articles could not be loaded. <button className="small-btn" onClick={() => void posts.refetch()}>Retry</button></div> : <PostTable posts={posts.data ?? []} onEdit={setEditing} onDelete={handleDelete} />}
            {editing && <ArticleEditor post={editing} busy={createPost.isPending || updatePost.isPending} onClose={() => setEditing(null)} onSubmit={saveArticle} />}
          </section>}
          {tab === 'Accounts' && <AccountsPanel search={search} onSearch={setSearch} query={{ data: users.data as AdminUser[] | undefined, isLoading: users.isLoading, isError: users.isError, refetch: users.refetch }} selectedUser={selectedUser} onSelectUser={setSelectedUser} ledger={{ data: ledger.data as AdminLedgerEntry[] | undefined, isLoading: ledger.isLoading, isError: ledger.isError, refetch: ledger.refetch }} direction={direction} onDirection={setDirection} amount={amount} onAmount={setAmount} reason={reason} onReason={setReason} onAdjust={() => {
            const value = Number(amount);
            if (!(value > 0 && value <= 10000) || reason.trim().length < 3) { setError('Enter an amount up to $10,000 and an audit reason of at least 3 characters.'); return; }
            adjustLedger.mutate({ userId: selectedUser, data: { amount: value, direction, reason: reason.trim() } }, {
              onSuccess: () => { setMessage('Demo wallet adjustment recorded.'); setAmount(''); setReason(''); void Promise.all([queryClient.invalidateQueries({ queryKey: getGetAdminUsersQueryKey() }), queryClient.invalidateQueries({ queryKey: getGetAdminUserLedgerQueryKey(selectedUser) })]); },
              onError: cause => setError(cause instanceof Error ? cause.message : 'Adjustment failed.'),
            });
          }} adjustmentBusy={adjustLedger.isPending} />}
          {tab === 'Settings' && <SettingsPanel query={{ data: settings.data as PlatformSetting[] | undefined, isLoading: settings.isLoading, isError: settings.isError, refetch: settings.refetch }} values={settingValues} onValue={(key, value) => setSettingValues(current => ({ ...current, [key]: value }))} onSave={(key, value) => updateSetting.mutate({ key, data: { value } }, {
            onSuccess: () => { setMessage(`${key} saved.`); void queryClient.invalidateQueries({ queryKey: getGetAdminSettingsQueryKey() }); },
            onError: cause => setError(cause instanceof Error ? cause.message : 'Setting could not be saved.'),
          })} busy={updateSetting.isPending} />}
        </section>
      </div>}
  </main></PublicShell>;
}

function Overview({ summary, posts, onEdit, onDelete }: { summary: QueryState<AdminSummary>; posts: BlogPost[]; onEdit: (post: BlogPost) => void; onDelete: (post: BlogPost) => void }) {
  return <><h2>Platform overview</h2>{summary.isLoading ? <div className="skeleton" aria-label="Loading summary" /> : summary.isError ? <div className="error-panel">Summary unavailable. <button className="small-btn" onClick={() => void summary.refetch()}>Retry</button></div> : <div className="admin-stats">{[['Accounts', summary.data?.users], ['Articles', summary.data?.posts], ['Published', summary.data?.publishedPosts], ['Demo balances', `$${Number(summary.data?.demoBalance ?? 0).toLocaleString()}`]].map(([label, value]) => <div className="admin-stat" key={String(label)}><div className="section-kicker">{label}</div><strong>{value ?? '—'}</strong></div>)}</div>}
    <h2>Journal articles</h2>{posts.length ? <PostTable posts={posts} onEdit={onEdit} onDelete={onDelete} /> : <div className="content-panel">No articles are available yet.</div>}</>;
}

function ArticleEditor({ post, busy, onClose, onSubmit }: { post: BlogPost; busy: boolean; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return <form className="admin-form" onSubmit={onSubmit}><div className="flex justify-between"><h3>{post.id === 'new' ? 'Create article' : 'Edit article'}</h3><button type="button" className="small-btn" onClick={onClose} data-testid="button-close-article-editor">Close</button></div>
    <label className="field-label">SLUG<input name="slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" maxLength={180} defaultValue={post.slug} data-testid="input-admin-post-slug" /></label>
    <label className="field-label">TITLE<input name="title" required maxLength={180} defaultValue={post.title} data-testid="input-admin-post-title" /></label>
    <label className="field-label">EXCERPT<input name="excerpt" maxLength={320} defaultValue={post.excerpt} data-testid="input-admin-post-excerpt" /></label>
    <label className="field-label">CATEGORY<input name="category" required maxLength={64} defaultValue={post.category} data-testid="input-admin-post-category" /></label>
    <label className="field-label">BODY · PLAIN TEXT / MARKDOWN<textarea name="body" defaultValue={post.body} data-testid="input-admin-post-body" /></label>
    <label className="field-label">STATUS<select name="status" defaultValue={post.status} data-testid="select-admin-post-status"><option value="DRAFT">Draft</option><option value="PUBLISHED">Published</option></select></label>
    <button className="button-yellow" disabled={busy} data-testid="button-admin-save-post">{busy ? 'Saving…' : 'Save article'}</button>
  </form>;
}

function AccountsPanel(props: {
  search: string; onSearch: (value: string) => void; query: QueryState<AdminUser[]>;
  selectedUser: string; onSelectUser: (id: string) => void; ledger: QueryState<AdminLedgerEntry[]>;
  direction: 'CREDIT' | 'DEBIT'; onDirection: (value: 'CREDIT' | 'DEBIT') => void;
  amount: string; onAmount: (value: string) => void; reason: string; onReason: (value: string) => void; onAdjust: () => void; adjustmentBusy: boolean;
}) {
  return <section><h2>Account search</h2><input className="trade-input" placeholder="Search by email" value={props.search} onChange={event => props.onSearch(event.target.value)} data-testid="input-admin-user-search" />
    {props.query.isLoading ? <div className="skeleton" aria-label="Loading accounts" /> : props.query.isError ? <div className="error-panel">Accounts unavailable. <button className="small-btn" onClick={() => void props.query.refetch()}>Retry</button></div> : <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Email</th><th>Role</th><th>Demo balance</th><th>Ledger</th></tr></thead><tbody>{(props.query.data ?? []).length === 0 ? <tr><td colSpan={4}>No accounts match this search.</td></tr> : (props.query.data ?? []).map(user => <tr key={user.id}><td>{user.email}</td><td>{user.role}</td><td>{user.currency} {user.balance.toFixed(2)}</td><td><button className="small-btn" onClick={() => props.onSelectUser(user.id)} data-testid={`button-user-ledger-${user.id}`}>View ledger</button></td></tr>)}</tbody></table></div>}
    {props.selectedUser && <div className="content-panel" style={{ marginTop: 18 }}><div className="flex justify-between"><h3>User demo ledger</h3><button className="small-btn" onClick={() => props.onSelectUser('')}>Close</button></div>
      {props.ledger.isLoading ? <div className="skeleton" aria-label="Loading ledger" /> : props.ledger.isError ? <div className="error-panel">Ledger unavailable. <button className="small-btn" onClick={() => void props.ledger.refetch()}>Retry</button></div> : <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>When</th><th>Type</th><th>Amount</th><th>Status</th><th>Reference</th></tr></thead><tbody>{(props.ledger.data ?? []).length === 0 ? <tr><td colSpan={5}>No ledger entries yet.</td></tr> : (props.ledger.data ?? []).map(entry => <tr key={entry.id}><td>{new Date(entry.createdAt).toLocaleString()}</td><td>{entry.type}</td><td>{entry.amount}</td><td>{entry.status}</td><td>{entry.reference ?? '—'}</td></tr>)}</tbody></table></div>}
      <form className="admin-form" onSubmit={event => { event.preventDefault(); props.onAdjust(); }}><h3>Adjust demo wallet</h3><select value={props.direction} onChange={event => props.onDirection(event.target.value as 'CREDIT' | 'DEBIT')} data-testid="select-ledger-direction"><option value="CREDIT">Credit</option><option value="DEBIT">Debit</option></select><input type="number" min=".01" max="10000" step=".01" required placeholder="Amount" value={props.amount} onChange={event => props.onAmount(event.target.value)} data-testid="input-ledger-amount" /><input required minLength={3} maxLength={100} placeholder="Reason for audit trail" value={props.reason} onChange={event => props.onReason(event.target.value)} data-testid="input-ledger-reason" /><button className="button-yellow" disabled={props.adjustmentBusy} data-testid="button-ledger-adjust">{props.adjustmentBusy ? 'Recording…' : 'Record adjustment'}</button></form>
    </div>}
  </section>;
}

function SettingsPanel({ query, values, onValue, onSave, busy }: {
  query: QueryState<PlatformSetting[]>; values: Record<string, string>;
  onValue: (key: string, value: string) => void; onSave: (key: string, value: string) => void; busy: boolean;
}) {
  const savedSettings = query.data ?? [];
  const merged = settingDefaults.map(fallback => {
    const saved = savedSettings.find(setting => setting.key === fallback.key);
    return { ...fallback, value: saved?.value ?? fallback.value };
  });
  const custom = savedSettings.filter(setting => !settingDefaults.some(fallback => fallback.key === setting.key));
  if (query.isLoading) return <div className="skeleton" aria-label="Loading settings" />;
  if (query.isError) return <div className="error-panel">Settings unavailable. <button className="small-btn" onClick={() => void query.refetch()}>Retry</button></div>;
  return <section><h2>Platform settings</h2><p className="section-copy">Defaults are available on a new install. Saving creates or updates the setting through the administrator API.</p>
    {[...merged, ...custom.map(setting => ({ key: setting.key, label: setting.key, value: setting.value, hint: 'Custom platform setting.' }))].map(setting => <form key={setting.key} className="admin-form" onSubmit={event => { event.preventDefault(); onSave(setting.key, values[setting.key] ?? setting.value); }}>
      <label className="field-label">{setting.label}<span className="disclaimer" style={{ display: 'block', margin: '4px 0' }}>{setting.hint}</span><textarea value={values[setting.key] ?? setting.value} onChange={event => onValue(setting.key, event.target.value)} data-testid={`input-setting-${setting.key}`} /></label>
      <button className="button-yellow" disabled={busy} data-testid={`button-save-setting-${setting.key}`}>{busy ? 'Saving…' : 'Save setting'}</button>
    </form>)}
  </section>;
}
