import * as React from "react"
import { ChevronDown, Check } from "lucide-react"
import { cn } from "../../lib/utils"

interface SelectProps {
  value?: string
  onValueChange?: (value: string) => void
  children: React.ReactNode
}

interface SelectContextType {
  value?: string
  onValueChange?: (value: string) => void
  open: boolean
  setOpen: (open: boolean) => void
}

const SelectContext = React.createContext<SelectContextType | undefined>(undefined)

const useSelectContext = () => {
  const context = React.useContext(SelectContext)
  if (!context) {
    throw new Error("Select components must be used within a Select")
  }
  return context
}

const Select: React.FC<SelectProps> = ({ value, onValueChange, children }) => {
  const [open, setOpen] = React.useState(false)

  return (
    <SelectContext.Provider value={{ value, onValueChange, open, setOpen }}>
      <div className="relative">
        {children}
      </div>
    </SelectContext.Provider>
  )
}

interface SelectTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string
  children: React.ReactNode
}

const SelectTrigger = React.forwardRef<HTMLButtonElement, SelectTriggerProps>(
  ({ className, children, ...props }, ref) => {
    const { open, setOpen } = useSelectContext()

    return (
      <button
        ref={ref}
        className={cn(
          "flex h-9 w-full items-center justify-between whitespace-nowrap rounded-lg border border-slate-200 bg-background px-3 py-2 text-sm font-medium shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:border-oasis-blue disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
          className
        )}
        onClick={() => setOpen(!open)}
        {...props}
      >
        {children}
        <ChevronDown className="h-4 w-4 opacity-50" />
      </button>
    )
  }
)
SelectTrigger.displayName = "SelectTrigger"

const SelectValue: React.FC<{ placeholder?: string }> = ({ placeholder }) => {
  const { value } = useSelectContext()
  return <span>{value || placeholder}</span>
}

interface SelectContentProps {
  className?: string
  children: React.ReactNode
}

const SelectContent: React.FC<SelectContentProps> = ({ className, children }) => {
  const { open, setOpen } = useSelectContext()

  if (!open) return null

  return (
    <>
      <div 
        className="fixed inset-0 z-40" 
        onClick={() => setOpen(false)}
      />
      <div
        className={cn(
          "absolute top-full left-0 z-50 mt-1 min-w-[8rem] overflow-hidden rounded-lg border border-slate-200 bg-white text-card-foreground shadow-md animate-in fade-in-0 zoom-in-95",
          className
        )}
      >
        <div className="p-1">
          {children}
        </div>
      </div>
    </>
  )
}

interface SelectItemProps {
  className?: string
  value: string
  children: React.ReactNode
}

const SelectItem: React.FC<SelectItemProps> = ({ className, value, children }) => {
  const { value: selectedValue, onValueChange, setOpen } = useSelectContext()
  const isSelected = value === selectedValue

  return (
    <div
      className={cn(
        "relative flex w-full cursor-pointer select-none items-center rounded-md py-1.5 pl-2 pr-8 text-sm font-medium outline-none hover:bg-oasis-blue-light hover:text-oasis-blue focus:bg-oasis-blue-light focus:text-oasis-blue data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        isSelected && "bg-oasis-blue-light text-oasis-blue",
        className
      )}
      onClick={() => {
        onValueChange?.(value)
        setOpen(false)
      }}
    >
      {children}
      {isSelected && (
        <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
          <Check className="h-4 w-4" />
        </span>
      )}
    </div>
  )
}

export {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
}
