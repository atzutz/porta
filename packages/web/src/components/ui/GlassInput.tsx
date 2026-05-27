import React from "react";

interface GlassInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
}

export const GlassInput = React.forwardRef<HTMLInputElement, GlassInputProps>(
  ({ className = "", icon, ...props }, ref) => {
    return (
      <div className={`glass-input-wrapper ${className}`}>
        {icon && (
          <div style={{ position: "absolute", left: 12, opacity: 0.5 }}>
            {icon}
          </div>
        )}
        <input
          ref={ref}
          className="glass-input"
          style={{ paddingLeft: icon ? 36 : 14 }}
          {...props}
        />
      </div>
    );
  }
);

GlassInput.displayName = "GlassInput";
