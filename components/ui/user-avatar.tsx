import { cn } from '@/lib/utils';

interface UserAvatarProps {
  image?: string | null;
  name?: string | null;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const containerSizes: Record<Required<UserAvatarProps>['size'], string> = {
  sm: 'h-6 w-6',
  md: 'h-8 w-8',
  lg: 'h-10 w-10'
};

const emojiSizes: Record<Required<UserAvatarProps>['size'], string> = {
  sm: 'text-lg',
  md: 'text-xl',
  lg: 'text-2xl'
};

const fallbackTextSizes: Record<Required<UserAvatarProps>['size'], string> = {
  sm: 'text-[10px]',
  md: 'text-[11px]',
  lg: 'text-sm'
};

const isUrlLike = (value: string) => /^(https?:\/\/|data:|blob:)/i.test(value);
const isEmojiLike = (value: string) => /\p{Extended_Pictographic}/u.test(value);

const getInitials = (name?: string | null) => {
  if (!name) {
    return '??';
  }
  const trimmed = name.trim();
  if (!trimmed) {
    return '??';
  }
  const [first, second] = trimmed.split(/\s+/);
  if (first && second) {
    return `${first[0]}${second[0]}`.toUpperCase();
  }
  return trimmed.slice(0, 2).toUpperCase();
};

export function UserAvatar({ image, name, className, size = 'md' }: UserAvatarProps) {
  const normalizedImage = image?.trim();
  const initials = getInitials(name);

  if (normalizedImage && isUrlLike(normalizedImage)) {
    return (
      <span
        className={cn(
          'flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted/20',
          containerSizes[size],
          className
        )}
      >
        <img src={normalizedImage} alt={name ?? 'User avatar'} className="h-full w-full object-cover" />
      </span>
    );
  }

  const isEmoji = normalizedImage ? isEmojiLike(normalizedImage) : false;
  const content = isEmoji ? normalizedImage : initials;

  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full bg-muted/60 text-foreground',
        containerSizes[size],
        isEmoji ? emojiSizes[size] : `${fallbackTextSizes[size]} font-semibold uppercase`,
        className
      )}
      aria-label={name ?? 'User avatar'}
      role="img"
    >
      {content}
    </span>
  );
}
