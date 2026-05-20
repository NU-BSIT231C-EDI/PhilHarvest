import { useState } from "react";
import { MessageSquare, Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import DashboardLayout from "@/layouts/DashboardLayout";

const conversations = [
  { id: "c1", customer: "Ana Reyes", initials: "AR", lastMessage: "Thank you! When will my order be ready?", time: "2h ago", unread: 2 },
  { id: "c2", customer: "Bong Cruz", initials: "BC", lastMessage: "Can I order 20kg of mangoes?", time: "Yesterday", unread: 0 },
  { id: "c3", customer: "Celia Torres", initials: "CT", lastMessage: "Is the kamote organic?", time: "2d ago", unread: 0 },
];

const messages = [
  { id: "m1", from: "customer", text: "Hi! I just placed an order for 10kg of tomatoes. When will it be ready?", time: "10:30 AM" },
  { id: "m2", from: "seller", text: "Hello Ana! Your order will be packed fresh tomorrow morning. We'll hand it over to logistics by 7AM.", time: "10:45 AM" },
  { id: "m3", from: "customer", text: "Thank you! When will my order be ready?", time: "11:00 AM" },
];

export default function Messages() {
  const [activeConv, setActiveConv] = useState("c1");
  const [message, setMessage] = useState("");
  const active = conversations.find((c) => c.id === activeConv);

  return (
    <DashboardLayout role="seller" title="Customer Messages">
      <div className="p-6 h-[calc(100vh-8rem)]">
        <div className="flex h-full bg-card border border-card-border rounded-2xl overflow-hidden">
          {/* Conversation List */}
          <div className="w-64 xl:w-72 border-r border-border flex flex-col shrink-0">
            <div className="p-3 border-b border-border">
              <p className="font-semibold text-sm text-foreground">Messages</p>
            </div>
            <div className="flex-1 overflow-y-auto">
              {conversations.map((c) => (
                <button key={c.id} onClick={() => setActiveConv(c.id)} className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors border-b border-border/50 ${activeConv === c.id ? "bg-primary/5" : ""}`} data-testid={`button-conv-${c.id}`}>
                  <Avatar className="w-9 h-9 shrink-0">
                    <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">{c.initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <p className="text-sm font-semibold text-foreground truncate">{c.customer}</p>
                      <span className="text-xs text-muted-foreground shrink-0">{c.time}</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{c.lastMessage}</p>
                  </div>
                  {c.unread > 0 && <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center shrink-0">{c.unread}</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Message Thread */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="p-4 border-b border-border flex items-center gap-3">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">{active?.initials}</AvatarFallback>
              </Avatar>
              <p className="font-semibold text-sm">{active?.customer}</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.from === "seller" ? "justify-end" : "justify-start"}`} data-testid={`message-${m.id}`}>
                  <div className={`max-w-xs px-4 py-2.5 rounded-2xl text-sm ${m.from === "seller" ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted text-foreground rounded-bl-sm"}`}>
                    <p className="leading-relaxed">{m.text}</p>
                    <p className={`text-xs mt-1 ${m.from === "seller" ? "text-primary-foreground/70 text-right" : "text-muted-foreground"}`}>{m.time}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-border">
              <div className="flex gap-2">
                <Input placeholder="Type a message..." value={message} onChange={(e) => setMessage(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") setMessage(""); }} className="flex-1" data-testid="input-message" />
                <Button onClick={() => setMessage("")} className="gap-2" data-testid="button-send"><Send className="w-4 h-4" /></Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
