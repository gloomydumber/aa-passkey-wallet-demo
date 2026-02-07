"use client";

/**
 * Amount Input Component
 *
 * Number input with max button and balance display for ETH transfers.
 */

import { forwardRef, type InputHTMLAttributes } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { Button } from "@/components/ui/button";

interface AmountInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  balance?: string;
  symbol?: string;
  onMaxClick?: () => void;
  error?: string;
}

export const AmountInput = forwardRef<HTMLInputElement, AmountInputProps>(
  ({ className, balance, symbol = "ETH", onMaxClick, error, ...props }, ref) => {
    return (
      <div className="w-full space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Amount</label>
          {onMaxClick && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onMaxClick}
              className="h-6 px-2 text-xs"
            >
              Max
            </Button>
          )}
        </div>

        <div className="relative">
          <input
            ref={ref}
            type="text"
            inputMode="decimal"
            pattern="[0-9]*\.?[0-9]*"
            className={twMerge(
              clsx(
                "flex h-12 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 pr-16 text-lg",
                "placeholder:text-zinc-400",
                "focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2",
                "disabled:cursor-not-allowed disabled:opacity-50",
                "dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder:text-zinc-500",
                "dark:focus:ring-offset-zinc-900",
                error && "border-red-500 focus:ring-red-400",
                className
              )
            )}
            {...props}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-zinc-500 dark:text-zinc-400">
            {symbol}
          </span>
        </div>

        {balance !== undefined && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Balance: {balance} {symbol}
          </p>
        )}

        {error && <p className="text-sm text-red-500 dark:text-red-400">{error}</p>}
      </div>
    );
  }
);

AmountInput.displayName = "AmountInput";
