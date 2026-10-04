import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import {
  Controller,
  FormProvider,
  useFormContext,
  type ControllerProps,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";
import { cn } from "@/lib/utils";
import { Label } from "./label";

/** shadcn/ui Form primitives (react-hook-form). */
export const Form = FormProvider;

type FieldCtx = { name: string };
const FormFieldContext = React.createContext<FieldCtx>({ name: "" });
const FormItemContext = React.createContext<{ id: string }>({ id: "" });

export function FormField<T extends FieldValues, N extends FieldPath<T>>(props: ControllerProps<T, N>) {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  );
}

export function useFormField() {
  const field = React.useContext(FormFieldContext);
  const item = React.useContext(FormItemContext);
  const { getFieldState, formState } = useFormContext();
  const state = getFieldState(field.name, formState);
  return {
    id: item.id,
    name: field.name,
    itemId: `${item.id}-item`,
    descriptionId: `${item.id}-description`,
    messageId: `${item.id}-message`,
    ...state,
  };
}

export const FormItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const id = React.useId();
    return (
      <FormItemContext.Provider value={{ id }}>
        <div ref={ref} className={cn("space-y-2", className)} {...props} />
      </FormItemContext.Provider>
    );
  },
);
FormItem.displayName = "FormItem";

export const FormLabel = React.forwardRef<
  React.ElementRef<typeof Label>,
  React.ComponentPropsWithoutRef<typeof Label>
>(({ className, ...props }, ref) => {
  const { itemId } = useFormField();
  return <Label ref={ref} htmlFor={itemId} className={className} {...props} />;
});
FormLabel.displayName = "FormLabel";

export const FormControl = React.forwardRef<
  React.ElementRef<typeof Slot>,
  React.ComponentPropsWithoutRef<typeof Slot>
>(({ ...props }, ref) => {
  const { error, itemId, messageId } = useFormField();
  return (
    <Slot
      ref={ref}
      id={itemId}
      aria-describedby={error ? messageId : undefined}
      aria-invalid={!!error}
      {...props}
    />
  );
});
FormControl.displayName = "FormControl";

export const FormMessage = ({ className }: { className?: string }) => {
  const { error, messageId } = useFormField();
  if (!error?.message) return null;
  return (
    <p id={messageId} role="alert" className={cn("text-[13px] leading-[1.4] text-[#FFB4AB]", className)}>
      {String(error.message)}
    </p>
  );
};
