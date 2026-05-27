import React from "react";

interface GlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "primary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
}

export function GlassButton({
  variant = "default",
  size = "md",
  className = "",
  children,
  ...props
}: GlassButtonProps) {
  let btnClass = "glass-btn";
  
  if (variant === "primary") btnClass += " glass-btn-primary";
  else if (variant === "danger") btnClass += " glass-btn-danger";
  else if (variant === "ghost") btnClass += " glass-btn-ghost";

  if (size === "sm") btnClass += " glass-btn-sm";
  else if (size === "lg") btnClass += " glass-btn-lg";

  if (className) btnClass += ` ${className}`;

  return (
    <button className={btnClass} {...props}>
      {children}
    </button>
  );
}
