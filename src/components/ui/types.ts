import * as React from "react";
import type { VariantProps } from "class-variance-authority";
import type { buttonVariants } from "./button";

// ============================================================================
// BUTTON INTERFACES
// ============================================================================

// Interface base para Button props
export interface BaseButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

// Interface para componentes que usam Button com propriedades específicas
export interface ButtonComponentProps extends BaseButtonProps {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  children?: React.ReactNode;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
}

// Interface para Button como elemento de formulário
export interface FormButtonProps extends ButtonComponentProps {
  type: "submit" | "reset" | "button";
  form?: string;
}

// Interface para Button com ícone
export interface IconButtonProps extends Omit<ButtonComponentProps, 'children'> {
  size: "icon";
  'aria-label': string;
  children: React.ReactElement;
}

// ============================================================================
// SWITCH INTERFACES
// ============================================================================

export interface SwitchProps extends React.HTMLAttributes<HTMLButtonElement> {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

// ============================================================================
// MODAL INTERFACES
// ============================================================================

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}

export interface ModalHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export interface ModalContentProps {
  children: React.ReactNode;
  className?: string;
}

export interface ModalFooterProps {
  children: React.ReactNode;
  className?: string;
}

// ============================================================================
// SELECT INTERFACES
// ============================================================================

export interface SelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
}

export interface SelectContextType {
  value?: string;
  onValueChange?: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
}

export interface SelectTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string;
  children: React.ReactNode;
}

export interface SelectContentProps {
  className?: string;
  children: React.ReactNode;
}

export interface SelectItemProps {
  className?: string;
  value: string;
  children: React.ReactNode;
}

export interface SelectValueProps {
  placeholder?: string;
}

// ============================================================================
// CARD INTERFACES
// ============================================================================

export type CardProps = React.HTMLAttributes<HTMLDivElement>;

export type CardHeaderProps = React.HTMLAttributes<HTMLDivElement>;

export type CardTitleProps = React.HTMLAttributes<HTMLHeadingElement>;

export type CardDescriptionProps = React.HTMLAttributes<HTMLParagraphElement>;

export type CardContentProps = React.HTMLAttributes<HTMLDivElement>;

export type CardFooterProps = React.HTMLAttributes<HTMLDivElement>;

// ============================================================================
// COMMON UI COMPONENT INTERFACES
// ============================================================================

// Interface para componentes que recebem className
export interface WithClassName {
  className?: string;
}

// Interface para componentes que recebem children
export interface WithChildren {
  children: React.ReactNode;
}

// Interface combinada para componentes comuns
export interface CommonComponentProps extends WithClassName, WithChildren {}

// Interface para componentes forwardRef
export interface ForwardRefComponent<T, P> {
  (props: P & React.RefAttributes<T>): React.ReactElement | null;
  displayName?: string;
}