"use client"

// Button compartilhado (src/shared/components — Princípio IV).
// Substitui o stub "alert" por um botão real com variantes da paleta
// "Rio Negro" (globals.css). Cliente por interagir com handlers de form.

import type { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "secondary" | "danger";
}

const VARIANTS: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary: "bg-primary text-primary-foreground hover:bg-primary-hover",
  secondary: "bg-surface-muted text-foreground hover:bg-border",
  danger: "bg-danger text-danger-foreground hover:bg-danger/90",
};

export default function Button({
  children,
  variant = "primary",
  className = "",
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md px-4 text-sm font-medium transition-colors duration-[var(--duration-fast)] disabled:cursor-not-allowed disabled:opacity-60 ${VARIANTS[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}