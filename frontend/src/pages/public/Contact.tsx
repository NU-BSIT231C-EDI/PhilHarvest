import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Phone, Mail, MapPin, Clock, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PublicLayout from "@/layouts/PublicLayout";
import { useState } from "react";

const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  subject: z.string().min(1, "Please select a subject"),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

type ContactForm = z.infer<typeof schema>;

export default function Contact() {
  const [submitted, setSubmitted] = useState(false);
  const form = useForm<ContactForm>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", subject: "", message: "" },
  });

  function onSubmit(_data: ContactForm) {
    setSubmitted(true);
  }

  return (
    <PublicLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-foreground">Get in Touch</h1>
          <p className="mt-3 text-muted-foreground text-lg max-w-xl mx-auto">Have a question, concern, or want to partner with us? We'd love to hear from you.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Contact Info */}
          <div className="lg:col-span-2 space-y-5">
            <div className="bg-card border border-card-border rounded-xl p-6 space-y-5">
              {[
                { icon: Phone, label: "Phone", value: "(02) 8888-HARVEST", sub: "Mon–Fri, 8AM–6PM" },
                { icon: Mail, label: "Email", value: "support@philharvest.ph", sub: "We reply within 24 hours" },
                { icon: MapPin, label: "Address", value: "6/F Ayala North Exchange", sub: "Salcedo Village, Makati City" },
                { icon: Clock, label: "Hours", value: "Monday – Friday", sub: "8:00 AM – 6:00 PM" },
              ].map((c) => (
                <div key={c.label} className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <c.icon className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{c.label}</p>
                    <p className="text-sm font-medium text-foreground">{c.value}</p>
                    <p className="text-xs text-muted-foreground">{c.sub}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-5">
              <p className="font-semibold text-foreground mb-1 text-sm">For Seller Partnerships</p>
              <p className="text-xs text-muted-foreground">Email us at <span className="text-primary">partners@philharvest.ph</span> or call our dedicated seller hotline at <span className="text-primary">(02) 8888-SELLER</span>.</p>
            </div>
          </div>

          {/* Form */}
          <div className="lg:col-span-3">
            <div className="bg-card border border-card-border rounded-xl p-7">
              {submitted ? (
                <div className="text-center py-10">
                  <div className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Send className="w-8 h-8 text-secondary" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-2">Message Sent!</h3>
                  <p className="text-muted-foreground text-sm">Thank you for reaching out. We'll get back to you within 24 hours.</p>
                  <Button className="mt-5" onClick={() => { setSubmitted(false); form.reset(); }} data-testid="button-send-another">Send Another Message</Button>
                </div>
              ) : (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField control={form.control} name="name" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl><Input placeholder="Juan dela Cruz" {...field} data-testid="input-name" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="email" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address</FormLabel>
                          <FormControl><Input placeholder="juan@email.com" type="email" {...field} data-testid="input-email" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                    <FormField control={form.control} name="subject" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subject</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-subject">
                              <SelectValue placeholder="Select a subject" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="general">General Inquiry</SelectItem>
                            <SelectItem value="order">Order Issue</SelectItem>
                            <SelectItem value="seller">Seller Partnership</SelectItem>
                            <SelectItem value="logistics">Logistics Partnership</SelectItem>
                            <SelectItem value="technical">Technical Support</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="message" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Message</FormLabel>
                        <FormControl><Textarea placeholder="Tell us how we can help..." rows={5} {...field} data-testid="textarea-message" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <Button type="submit" className="w-full gap-2 font-semibold" data-testid="button-submit-contact">
                      <Send className="w-4 h-4" /> Send Message
                    </Button>
                  </form>
                </Form>
              )}
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
