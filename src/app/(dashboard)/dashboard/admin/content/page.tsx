import { getAllPosts } from "@/features/content/queries";
import { EmptyState } from "@/components/shared/EmptyState";
import { Topbar } from "@/components/shared/Topbar";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PublishButton } from "./PublishButton";
import { CreatePostForm } from "./CreatePostForm";
import { PostRowActions } from "./PostRowActions";

export default async function AdminContentPage() {
  const posts = await getAllPosts();

  return (
    <>
      <Topbar title="Content" />
      <div className="p-4 md:p-7 flex flex-col gap-6 max-w-[1200px]">
        <CreatePostForm />
        {posts.length === 0 ? (
          <EmptyState body="No posts yet." />
        ) : (
          <div className="bg-[var(--card)] border border-[var(--line)]">
            {posts.map((p) => (
              <div
                key={p.id}
                className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-4 border-b border-[var(--line)] last:border-0"
              >
                <div className="flex-1">
                  <div className="font-semibold text-sm">{p.title}</div>
                  <div className="text-[var(--dim)] text-xs">
                    {p.tag} · {p.views} views
                  </div>
                </div>
                <StatusBadge label={p.status} color={p.statusColor} />
                {p.status === "DRAFT" && <PublishButton postId={p.id} />}
                <PostRowActions postId={p.id} status={p.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
