import { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

export function Input({ className = "", ...props }: InputProps) {
  const baseStyles =
    "w-full border border-zinc-200 bg-white px-4 py-3 text-zinc-900 transition-colors placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none dark:border-white/10 dark:bg-zinc-900 dark:text-white dark:placeholder:text-zinc-600 dark:focus:border-white";

  return <input className={`${baseStyles} ${className}`} {...props} />;
}
