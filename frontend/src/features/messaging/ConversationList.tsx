import type { ContactMessage } from '../../lib/contactMessages';
import { StatusPill } from '../../components/ui';
import { cn } from '../../lib/cn';

const formatTime = (value: string) =>
  new Date(value).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

const preview = (message: ContactMessage) => {
  const latest = message.replies[message.replies.length - 1];
  return (latest?.body || message.body || '').replace(/\s+/g, ' ').trim();
};

interface ConversationListProps {
  conversations: ContactMessage[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Conversation ids with content the viewer hasn't seen yet. */
  unreadIds?: Set<string>;
  /** Show the sender name (staff inbox) vs. hide it (guardian's own threads). */
  showSender?: boolean;
}

export function ConversationList({ conversations, selectedId, onSelect, unreadIds, showSender = true }: ConversationListProps) {
  return (
    <div className="space-y-1.5">
      {conversations.map((conversation) => {
        const active = conversation.id === selectedId;
        const unread = unreadIds?.has(conversation.id);
        return (
          <button
            key={conversation.id}
            type="button"
            onClick={() => onSelect(conversation.id)}
            className={cn(
              'w-full rounded-xl border px-3.5 py-3 text-left transition',
              active ? 'border-brand/30 bg-brand-tint' : 'border-line bg-surface hover:bg-surface-sunk',
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm font-bold text-ink">{conversation.subject}</p>
              {unread ? <span className="h-2 w-2 shrink-0 rounded-full bg-accent" aria-label="Unread" /> : null}
            </div>
            {showSender ? <p className="mt-0.5 truncate text-xs font-medium text-muted">{conversation.senderName}</p> : null}
            <p className="mt-0.5 truncate text-xs text-muted">{preview(conversation)}</p>
            <div className="mt-1.5 flex items-center justify-between gap-2">
              <StatusPill status={conversation.status} />
              <span className="text-[11px] text-faint">{formatTime(conversation.updatedAt)}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
