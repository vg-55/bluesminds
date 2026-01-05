import * as React from 'react'
import { Slot, Slottable } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn, px } from '@/lib/utils'

const buttonVariants = cva(
  "inline-flex relative uppercase border font-medium cursor-pointer items-center justify-center gap-2 whitespace-nowrap ease-out transition-all duration-300 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive [clip-path:polygon(var(--poly-roundness)_0,calc(100%_-_var(--poly-roundness))_0,100%_0,100%_calc(100%_-_var(--poly-roundness)),calc(100%_-_var(--poly-roundness))_100%,0_100%,0_calc(100%_-_var(--poly-roundness)),0_var(--poly-roundness))] hover:scale-105 active:scale-95 backdrop-blur-xl",
  {
    variants: {
      variant: {
        default: 'bg-primary/10 border-primary text-primary [&>[data-border]]:bg-primary [box-shadow:inset_0_0_54px_0px_var(--tw-shadow-color)] shadow-primary/50 hover:shadow-primary/80 hover:bg-primary/20',
        destructive:
          'bg-destructive/10 border-destructive text-destructive [&>[data-border]]:bg-destructive [box-shadow:inset_0_0_54px_0px_var(--tw-shadow-color)] shadow-destructive/50 hover:shadow-destructive/80 hover:bg-destructive/20',
        outline:
          'border-border bg-background/50 text-foreground hover:bg-accent/50 hover:border-primary/50',
        secondary:
          'bg-secondary/50 border-secondary text-secondary-foreground hover:bg-secondary/70',
        ghost:
          'border-transparent hover:bg-accent/50 hover:text-accent-foreground dark:hover:bg-accent/30',
        link: 'text-primary underline-offset-4 hover:underline border-transparent [clip-path:none]',
      },
      size: {
        default: 'h-12 px-6 text-sm',
        sm: 'h-10 px-4 text-xs',
        lg: 'h-14 px-8 text-base',
        icon: 'size-12',
        'icon-sm': 'size-10',
        'icon-lg': 'size-14',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Button({
  className,
  variant,
  size,
  children,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : 'button'

  const polyRoundness = size === 'sm' || size === 'icon-sm' ? 10 : size === 'lg' || size === 'icon-lg' ? 18 : 14
  const hypotenuse = polyRoundness * 2
  const hypotenuseHalf = polyRoundness / 2 - 1.5

  // Don't render corner borders for link variant
  const showBorders = variant !== 'link'

  return (
    <Comp
      style={{
        '--poly-roundness': px(polyRoundness),
      } as React.CSSProperties}
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    >
      {showBorders && (
        <>
          <span
            data-border="top-left"
            style={{ '--h': px(hypotenuse), '--hh': px(hypotenuseHalf) } as React.CSSProperties}
            className="absolute inline-block w-[var(--h)] top-[var(--hh)] left-[var(--hh)] h-[2px] -rotate-45 origin-top -translate-x-1/2"
          />
          <span
            data-border="bottom-right"
            style={{ '--h': px(hypotenuse), '--hh': px(hypotenuseHalf) } as React.CSSProperties}
            className="absolute w-[var(--h)] bottom-[var(--hh)] right-[var(--hh)] h-[2px] -rotate-45 translate-x-1/2"
          />
        </>
      )}

      <Slottable>
        {children}
      </Slottable>
    </Comp>
  )
}

export { Button, buttonVariants }
