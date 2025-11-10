import { forwardRef } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

type ButtonElement = HTMLButtonElement;

type ButtonProps =
  React.ButtonHTMLAttributes<ButtonElement> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean };

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60 ring-offset-background',
  {
    variants: {
      variant: {
        default: 'bg-accent text-accent-foreground hover:bg-sky-400',
        muted: 'bg-muted text-muted-foreground hover:bg-muted/80',
        outline: 'border border-accent/50 text-accent hover:bg-accent/10'
      },
      size: {
        default: 'h-11 px-5 py-2.5',
        sm: 'h-9 px-4 text-xs',
        lg: 'h-12 px-6 text-base'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default'
    }
  }
);

export const Button = forwardRef<ButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return <Comp ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
  }
);

Button.displayName = 'Button';

export { buttonVariants };
