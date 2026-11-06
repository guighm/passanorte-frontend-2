"use client"

// Button compartilhado (src/shared/components — Princípio IV).
// Baseado no Button do Base UI, com variantes da paleta "Rio Negro"
// (globals.css) via cva e merge de classes via cn. Cliente por interagir
// com handlers de form.

import { Button as BaseButton } from "@base-ui/react/button";
import type { ComponentProps } from "react";

import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/shared/lib/cn";

const buttonVariants = cva(
  "inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md px-4 text-title-4 transition-colors duration-[var(--duration-fast)] disabled:cursor-not-allowed disabled:opacity-60",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground hover:bg-primary-hover",
        secondary: "bg-surface-muted text-foreground hover:bg-border",
        danger: "bg-danger text-danger-foreground hover:bg-danger/90",
      },
    },
    defaultVariants: {
      variant: "primary",
    },
  },
);

type ButtonProps = ComponentProps<typeof BaseButton> &
  VariantProps<typeof buttonVariants>;

export { buttonVariants };

export default function Button({
  variant,
  className,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <BaseButton
      type={type}
      className={cn(buttonVariants({ variant }), className)}
      {...rest}
    />
  );
}