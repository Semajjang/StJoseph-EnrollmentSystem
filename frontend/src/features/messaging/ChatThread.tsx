import { useEffect, useRef } from 'react';
import type { ContactMessage, ContactReply } from '../../lib/contactMessages';
import { cn } from '../../lib/cn';

type ViewerSide = 'guardian' | 'staff';

const formatTime = (value: string) =>
  new Date(value).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

const roleLabel: Record<string, string> = { guardian: 'Guardian', staff: 'Staff', admin: 'Admin' };

function isOwnSide(role: string, viewer: ViewerSide) {
  return viewer === 'guardian' ? role === 'guardian' : role === 'staff' || role === 'admin';
}

function Bubble({ authorName, role, body, createdAt, viewer }: {
  authorName: string;
  role: string;
  body: string;
  createdAt: string;
  viewer: ViewerSide;
}) {
  const own = isOwnSide(role, viewer);
  return (
    <div className={cn('flex', own ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-4 py-2.5 shadow-sm',
          own ? 'rounded-tr-sm bg-brand text-white' : 'rounded-tl-sm border border-line bg-surface text-ink',
        )}
      >
        <div className="mb-0.5 flex items-center gap-2">
          <span className={cn('text-xs font-bold', own ? 'text-white' : 'text-ink')}>{authorName}</span>
          <span
            className={cn(
              'rounded-full px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide',
              own ? 'bg-white/20 text-white' : 'bg-brand-tint text-brand-strong',
            )}
          >
            {roleLabel[role] ?? role}
          </span>
        </div>
        <p className={cn('whitespace-pre-wrap break-words text-sm leading-6', own ? 'text-white/95' : 'text-ink-soft')}>{body}</p>
        <p className={cn('mt-1 text-[11px]', own ? 'text-white/70' : 'text-faint')}>{formatTime(createdAt)}</p>
      </div>
    </div>
  );
}

/** The full message thread: the opening message followed by every reply, live. */
export function ChatThread({ message, viewer }: { message: ContactMessage; viewer: ViewerSide }) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [message.id, message.replies.length]);

  return (
    <div className="flex flex-col gap-3">
      <Bubble
        authorName={message.senderName}
        role="guardian"
        body={message.body}
        createdAt={message.createdAt}
        viewer={viewer}
      />
      {message.replies.map((reply: ContactReply) => (
        <Bubble
          key={reply.id}
          authorName={reply.authorName}
          role={reply.authorRole}
          body={reply.body}
          createdAt={reply.createdAt}
          viewer={viewer}
        />
      ))}
      <div ref={endRef} />
    </div>
  );
}
