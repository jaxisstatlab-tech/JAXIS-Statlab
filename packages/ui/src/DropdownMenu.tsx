"use client";

import * as React from "react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { Check, CaretRight, Circle, DotsThreeVertical } from "@phosphor-icons/react";
import { cn } from "./utils";

export const DropdownMenuRoot = DropdownMenuPrimitive.Root;
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
export const DropdownMenuGroup = DropdownMenuPrimitive.Group;
export const DropdownMenuPortal = DropdownMenuPrimitive.Portal;
export const DropdownMenuSub = DropdownMenuPrimitive.Sub;
export const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup;

export const DropdownMenuSubTrigger = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubTrigger>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubTrigger> & {
    inset?: boolean;
  }
>(({ className, inset, children, ...props }, ref) => (
  <DropdownMenuPrimitive.SubTrigger
    ref={ref}
    className={cn(
      "flex cursor-default select-none items-center rounded-[5px] px-3.5 py-2.5 text-sm font-sans outline-none focus:bg-white/[0.08] data-[state=open]:bg-white/[0.08]",
      inset && "pl-8",
      className
    )}
    {...props}
  >
    {children}
    <CaretRight size={16} weight="fill" className="ml-auto text-white/50" />
  </DropdownMenuPrimitive.SubTrigger>
));
DropdownMenuSubTrigger.displayName = DropdownMenuPrimitive.SubTrigger.displayName;

export const DropdownMenuSubContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubContent>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubContent>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.SubContent
    ref={ref}
    className={cn(
      "z-50 min-w-[10rem] overflow-hidden rounded-[8px] border border-white/15 bg-[#01142B] p-2 text-white shadow-2xl backdrop-blur-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
      className
    )}
    {...props}
  />
));
DropdownMenuSubContent.displayName = DropdownMenuPrimitive.SubContent.displayName;

export const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, sideOffset = 6, style, ...props }, ref) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-50 min-w-[15rem] overflow-hidden rounded-[4px] border border-white/15 bg-[#01142B] p-2 text-white shadow-2xl backdrop-blur-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        className
      )}
      style={{
        padding: "0.5rem",
        boxSizing: "border-box",
        minWidth: "15rem",
        ...style,
      }}
      {...props}
    />
  </DropdownMenuPrimitive.Portal>
));
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName;

export const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & {
    inset?: boolean;
    variant?: "default" | "destructive";
  }
>(({ className, inset, variant = "default", style, ...props }, ref) => (
  <DropdownMenuPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex cursor-pointer select-none items-center gap-3 rounded-[3px] px-3.5 py-2.5 text-sm font-sans outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 border-0 transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      variant === "destructive"
        ? "text-red-400 focus:bg-red-500/10 focus:text-red-300"
        : "text-white/90 focus:bg-white/[0.08] focus:text-white",
      inset && "pl-8",
      className
    )}
    style={{
      padding: "0.625rem 0.875rem",
      boxSizing: "border-box",
      gap: "0.75rem",
      display: "flex",
      alignItems: "center",
      ...style,
    }}
    {...props}
  />
));
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName;

export const DropdownMenuCheckboxItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.CheckboxItem>
>(({ className, children, checked, ...props }, ref) => (
  <DropdownMenuPrimitive.CheckboxItem
    ref={ref}
    className={cn(
      "relative flex cursor-pointer select-none items-center rounded-[3px] py-2.5 pl-9 pr-3.5 text-sm font-sans outline-none transition-colors focus:bg-white/[0.08] focus:text-white data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    checked={checked}
    {...props}
  >
    <span className="absolute left-2.5 flex h-4 w-4 items-center justify-center">
      <DropdownMenuPrimitive.ItemIndicator>
        <Check size={16} weight="bold" className="text-[#CC6600]" />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </DropdownMenuPrimitive.CheckboxItem>
));
DropdownMenuCheckboxItem.displayName = DropdownMenuPrimitive.CheckboxItem.displayName;

export const DropdownMenuRadioItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.RadioItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.RadioItem>
>(({ className, children, ...props }, ref) => (
  <DropdownMenuPrimitive.RadioItem
    ref={ref}
    className={cn(
      "relative flex cursor-pointer select-none items-center rounded-[3px] py-2.5 pl-9 pr-3.5 text-sm font-sans outline-none transition-colors focus:bg-white/[0.08] focus:text-white data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    {...props}
  >
    <span className="absolute left-2.5 flex h-4 w-4 items-center justify-center">
      <DropdownMenuPrimitive.ItemIndicator>
        <Circle size={8} weight="fill" className="fill-current text-[#CC6600]" />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </DropdownMenuPrimitive.RadioItem>
));
DropdownMenuRadioItem.displayName = DropdownMenuPrimitive.RadioItem.displayName;

export const DropdownMenuLabel = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label> & {
    inset?: boolean;
  }
>(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Label
    ref={ref}
    className={cn(
      "px-3.5 py-2 text-xs font-sans font-bold uppercase tracking-wider text-white/50",
      inset && "pl-8",
      className
    )}
    {...props}
  />
));
DropdownMenuLabel.displayName = DropdownMenuPrimitive.Label.displayName;

export const DropdownMenuSeparator = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-1.5 h-px bg-white/10", className)}
    {...props}
  />
));
DropdownMenuSeparator.displayName = DropdownMenuPrimitive.Separator.displayName;

export const DropdownMenuShortcut = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span
      className={cn("ml-auto text-xs font-sans tracking-widest text-white/40", className)}
      {...props}
    />
  );
};
DropdownMenuShortcut.displayName = "DropdownMenuShortcut";

// Backward-compatible High-Level Facade Component
export interface DropdownMenuItemConfig {
  key?: string;
  label: string;
  subtitle?: string;
  icon?: React.ReactNode;
  badge?: string;
  variant?: "default" | "warning" | "danger" | "success";
  disabled?: boolean;
  dividerBefore?: boolean;
  onClick: () => void;
}

export interface DropdownMenuProps {
  items: DropdownMenuItemConfig[];
  trigger?: React.ReactNode;
  align?: "start" | "end" | "left" | "right";
  width?: string;
  className?: string;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function DropdownMenu({
  items,
  trigger,
  align = "end",
  width,
  className = "",
  isOpen,
  onOpenChange,
}: DropdownMenuProps) {
  const normalizedAlign = align === "left" ? "start" : align === "right" ? "end" : align;

  return (
    <DropdownMenuPrimitive.Root open={isOpen} onOpenChange={onOpenChange}>
      <DropdownMenuPrimitive.Trigger asChild>
        {trigger ? (
          <div>{trigger}</div>
        ) : (
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-[4px] border border-white/15 bg-white/5 text-white/70 transition-colors hover:border-white/30 hover:bg-white/10 hover:text-white cursor-pointer"
          >
            <DotsThreeVertical size={18} weight="bold" />
          </button>
        )}
      </DropdownMenuPrimitive.Trigger>

      <DropdownMenuContent
        align={normalizedAlign}
        className={cn("p-2", className)}
        style={{ width: width ?? undefined }}
      >
        {items.map((item, index) => (
          <React.Fragment key={item.key ?? index}>
            {item.dividerBefore && <DropdownMenuSeparator />}
            <DropdownMenuItem
              disabled={item.disabled}
              variant={item.variant === "danger" ? "destructive" : "default"}
              onClick={item.onClick}
              className="flex items-center gap-3 px-3.5 py-2.5"
            >
              {item.icon && <span className="shrink-0 text-white/60">{item.icon}</span>}
              <div className="flex flex-col flex-1 min-w-0">
                <span className="font-semibold text-sm font-sans truncate">{item.label}</span>
                {item.subtitle && (
                  <span className="text-xs text-white/50 font-sans mt-0.5 truncate">{item.subtitle}</span>
                )}
              </div>
              {item.badge && (
                <span className="ml-auto rounded-[3px] bg-white/10 px-2 py-0.5 text-xs font-sans font-semibold text-white/80">
                  {item.badge}
                </span>
              )}
            </DropdownMenuItem>
          </React.Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenuPrimitive.Root>
  );
}
