"use client";

import {
  forwardRef,
  useEffect,
  useState,
  type ButtonHTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils";

interface Ripple {
  x: number;
  y: number;
  size: number;
  id: number;
}

const LoaderIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cn("animate-spin", className)}
  >
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);

type ButtonVariant =
  | "default"
  | "destructive"
  | "outline"
  | "secondary"
  | "ghost"
  | "link";

type ButtonSize = "default" | "sm" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "default",
      size = "default",
      children,
      loading = false,
      onClick,
      iconLeft,
      iconRight,
      type,
      ...props
    },
    ref
  ) => {
    const [ripples, setRipples] = useState<Ripple[]>([]);

    const iconOnly = Boolean(!children && (iconLeft || iconRight));

    useEffect(() => {
      const styleId = "ripple-animation-style";
      if (document.getElementById(styleId)) return;

      const style = document.createElement("style");
      style.id = styleId;
      style.innerHTML = `
        @keyframes ripple-effect {
          from {
            transform: scale(0);
            opacity: 1;
          }
          to {
            transform: scale(2);
            opacity: 0;
          }
        }
        .animate-ripple {
          animation: ripple-effect 0.7s ease-out forwards;
        }
      `;
      document.head.appendChild(style);
    }, []);

    const createRipple = (event: MouseEvent<HTMLButtonElement>) => {
      if (loading) return;

      const button = event.currentTarget;
      const rect = button.getBoundingClientRect();
      const rippleSize = Math.max(rect.width, rect.height);
      const x = event.clientX - rect.left - rippleSize / 2;
      const y = event.clientY - rect.top - rippleSize / 2;

      const newRipple: Ripple = { x, y, size: rippleSize, id: Date.now() };
      setRipples((current) => [...current, newRipple]);

      window.setTimeout(() => {
        setRipples((current) => current.slice(1));
      }, 700);

      onClick?.(event);
    };

    const rippleColor =
      variant === "default" || variant === "destructive"
        ? "bg-white/30 dark:bg-slate-900/20"
        : "bg-slate-900/10 dark:bg-white/10";

const baseClasses =
  "relative inline-flex items-center justify-center rounded-md text-sm font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-400 dark:focus-visible:ring-indigo-300 disabled:cursor-not-allowed disabled:opacity-50 overflow-hidden active:scale-[0.98] hover:-translate-y-0.5 shadow-sm";

const variantClasses: Record<ButtonVariant, string> = {
  default:
    "bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white shadow-lg hover:shadow-xl hover:from-indigo-500/90 hover:via-purple-500/90 hover:to-pink-500/90 dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400",
  destructive:
    "bg-red-500 text-white shadow-md hover:bg-red-600 dark:bg-red-600 dark:text-white dark:hover:bg-red-700",
  outline:
    "border border-transparent bg-gradient-to-r from-slate-100 via-white to-slate-100 text-slate-900 hover:border-indigo-200 hover:shadow-lg dark:from-slate-800 dark:via-slate-900 dark:to-slate-800 dark:text-slate-50 dark:hover:border-purple-400",
  secondary:
    "bg-gradient-to-r from-cyan-400 via-sky-400 to-emerald-400 text-white shadow-md hover:shadow-xl hover:from-cyan-400/90 hover:via-sky-400/90 hover:to-emerald-400/90 dark:from-cyan-500 dark:via-sky-500 dark:to-emerald-500",
  ghost:
    "hover:bg-slate-100 text-slate-900 dark:hover:bg-slate-800 dark:text-slate-50",
  link: "text-slate-900 underline-offset-4 hover:underline dark:text-slate-50",
    };

    const sizeClasses: Record<ButtonSize, string> = {
      default: iconOnly ? "h-10 w-10 p-0" : "h-10 px-4",
      sm: iconOnly ? "h-8 w-8 p-0" : "h-8 px-3 text-sm",
      lg: iconOnly ? "h-12 w-12 p-0" : "h-12 px-8 text-base",
    };

    return (
      <button
        ref={ref}
        className={cn("cursor-pointer", baseClasses, variantClasses[variant], sizeClasses[size], className)}
        onClick={createRipple}
        disabled={loading}
        type={type ?? "button"}
        {...props}
      >
        <span className="relative z-10 flex items-center gap-2">
          {loading && <LoaderIcon className="h-4 w-4" />}
          {!loading && iconLeft && (
            <span className="flex items-center justify-center">{iconLeft}</span>
          )}
          {children}
          {!loading && iconRight && (
            <span className="flex items-center justify-center">{iconRight}</span>
          )}
        </span>

        {!loading && (
          <span className="absolute inset-0 z-0">
            {ripples.map((ripple) => (
              <span
                key={ripple.id}
                className={cn("absolute rounded-full animate-ripple", rippleColor)}
                style={{
                  left: ripple.x,
                  top: ripple.y,
                  width: ripple.size,
                  height: ripple.size,
                }}
              />
            ))}
          </span>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";

export default Button;
