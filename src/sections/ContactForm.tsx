import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CircleCheck, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input, Textarea } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BUDGETS,
  BUDGET_LABELS,
  PROJECT_TYPES,
  PROJECT_TYPE_LABELS,
  contactSchema,
  submitContact,
  CONTACT_MOCK,
  type ContactPayload,
} from "@/lib/contact";

type Status = "idle" | "loading" | "success" | "error";

/** Interactive contact form (lazy-loaded chunk: react-hook-form + zod + Radix Select). */
export default function ContactForm({ initial }: { initial?: Partial<ContactPayload> }) {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const form = useForm<ContactPayload>({
    resolver: zodResolver(contactSchema),
    mode: "onBlur",
    reValidateMode: "onBlur",
    defaultValues: { name: "", email: "", phone: "", message: "", company_website: "", ...initial },
  });

  const onSubmit = async (values: ContactPayload) => {
    if (status === "loading") return;
    setStatus("loading");
    setErrorMsg("");
    const res = await submitContact(values);
    if (res.ok) {
      setStatus("success");
      return;
    }
    if (res.error.fields) {
      Object.entries(res.error.fields).forEach(([k, v]) => v && form.setError(k as keyof ContactPayload, { message: v }));
    }
    setErrorMsg(res.error.message);
    setStatus("error");
  };

  return (
    <>
            {status === "success" ? (
              <div className="flex min-h-[420px] flex-col items-center justify-center text-center" role="status" aria-live="polite">
                <CircleCheck className="h-14 w-14 text-on-dark" strokeWidth={1.25} aria-hidden />
                <p className="mt-6 max-w-[24ch] font-serif text-[28px] leading-[1.2] text-cream-50">
                  Thanks, we&rsquo;ll be in touch within one business day.
                </p>
              </div>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} noValidate aria-label="Request a design consult" className="space-y-5">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input autoComplete="name" required {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid gap-5 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" inputMode="email" autoComplete="email" required {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input type="tel" inputMode="tel" autoComplete="tel" required {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="projectType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Project type</FormLabel>
                          <Select
                            value={field.value ?? ""}
                            onValueChange={(v) => {
                              field.onChange(v);
                              void form.trigger("projectType");
                            }}
                            onOpenChange={(o) => !o && field.onBlur()}
                          >
                            <FormControl>
                              <SelectTrigger ref={field.ref}>
                                <SelectValue placeholder="Choose one" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {PROJECT_TYPES.map((p) => (
                                <SelectItem key={p} value={p}>
                                  {PROJECT_TYPE_LABELS[p]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="budget"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Budget</FormLabel>
                          <Select
                            value={field.value ?? ""}
                            onValueChange={(v) => {
                              field.onChange(v);
                              void form.trigger("budget");
                            }}
                            onOpenChange={(o) => !o && field.onBlur()}
                          >
                            <FormControl>
                              <SelectTrigger ref={field.ref}>
                                <SelectValue placeholder="Choose a range" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {BUDGETS.map((b) => (
                                <SelectItem key={b} value={b}>
                                  {BUDGET_LABELS[b]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Message <span className="font-normal text-on-dark/60">(optional)</span>
                        </FormLabel>
                        <FormControl>
                          <Textarea rows={4} placeholder="Yard size, must-haves, timing…" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {/* Honeypot: hidden from people and assistive tech; bots tend to fill it. */}
                  <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
                    <label htmlFor="company_website">Company website</label>
                    <input id="company_website" type="text" tabIndex={-1} autoComplete="off" {...form.register("company_website")} />
                  </div>

                  {status === "error" && (
                    <div role="alert" className="flex items-start gap-3 rounded-md border border-[#F08A80]/50 bg-[#B3261E]/20 p-4 text-[14px] leading-[1.45]">
                      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#FFB4AB]" aria-hidden />
                      <div className="flex-1">
                        <p className="font-medium text-cream-50">We couldn&rsquo;t send your request.</p>
                        <p className="mt-1 text-on-dark/80">{errorMsg || "Please try again."}</p>
                      </div>
                      <button
                        type="submit"
                        className="btn-focus -my-1 min-h-11 shrink-0 rounded-full border border-on-dark/40 px-4 text-[14px] font-medium hover:bg-white/10"
                      >
                        Retry
                      </button>
                    </div>
                  )}

                  {CONTACT_MOCK && (
                    <p className="rounded-sm border border-dashed border-on-dark/30 px-3 py-2 text-center text-[13px] text-on-dark/80" data-demo-form>
                      Demo form: messages are not sent (mock mode). Type &ldquo;fail&rdquo; in the message to preview the error state.
                    </p>
                  )}
                  <Button
                    type="submit"
                    disabled={status === "loading"}
                    aria-busy={status === "loading"}
                    className="!h-[52px] w-full !bg-cream-50 !text-forest-900 hover:!bg-white"
                  >
                    {status === "loading" ? (
                      <>
                        <span className="h-4 w-4 animate-[spin_.8s_linear_infinite] rounded-full border-2 border-forest-900/25 border-t-forest-900" aria-hidden />
                        Sending…
                      </>
                    ) : (
                      "Request my design consult"
                    )}
                  </Button>
                  <p className="text-center text-[13px] text-on-dark/60">No spam, ever. We only use your details to reply.</p>
                </form>
              </Form>
            )}
    </>
  );
}
