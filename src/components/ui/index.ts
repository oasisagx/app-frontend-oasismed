// Central index file for all UI component interfaces and types
// This file provides a single point of import for all UI component types

// Button types
export type {
  ButtonComponentProps,
  FormButtonProps,
  IconButtonProps,
  BaseButtonProps,
} from './types';

// Switch types
export type { SwitchProps } from './types';

// Modal types
export type {
  ModalProps,
  ModalHeaderProps,
  ModalContentProps,
  ModalFooterProps,
} from './types';

// Select types
export type {
  SelectProps,
  SelectContextType,
  SelectTriggerProps,
  SelectContentProps,
  SelectItemProps,
  SelectValueProps,
} from './types';

// Card types
export type {
  CardProps,
  CardHeaderProps,
  CardTitleProps,
  CardDescriptionProps,
  CardContentProps,
  CardFooterProps,
} from './types';

// Common types
export type {
  WithClassName,
  WithChildren,
  CommonComponentProps,
  ForwardRefComponent,
} from './types';

// Re-export the main ButtonProps from button.tsx for backward compatibility
export type { ButtonProps } from './button';