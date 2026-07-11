import type { KeyboardEvent } from 'react';
import { SendIcon } from 'lucide-react';
import { Button, Textarea } from '../../components/ui';

interface ComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  isSending: boolean;
  placeholder?: string;
  disabled?: boolean;
}

/** Reply box shared by the guardian and staff chat views. Enter sends; Shift+Enter adds a line. */
export function Composer({ value, onChange, onSend, isSending, placeholder, disabled }: ComposerProps) {
  const canSend = !disabled && !isSending && value.trim().length > 0;

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    if (canSend) onSend();
  };

  return (
    <div className="flex items-end gap-2">
      <Textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        rows={2}
        disabled={disabled}
        placeholder={placeholder ?? 'Write a message… (Enter to send, Shift+Enter for a new line)'}
        className="min-h-[44px]"
      />
      <Button
        type="button"
        onClick={onSend}
        disabled={!canSend}
        isLoading={isSending}
        leftIcon={<SendIcon className="h-4 w-4" />}
        className="h-11"
      >
        Send
      </Button>
    </div>
  );
}
