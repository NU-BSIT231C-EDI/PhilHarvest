import { useState } from "react";
import { Megaphone, Plus, Edit, Trash2, ToggleLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import DashboardLayout from "@/layouts/DashboardLayout";
import { announcements as initialAnnouncements, banners } from "@/data/mockData";
import type { Announcement } from "@/types";

export default function ContentManagement() {
  const [announcements, setAnnouncements] = useState<Announcement[]>(initialAnnouncements);
  const [addOpen, setAddOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");

  function toggleActive(id: string) {
    setAnnouncements((prev) => prev.map((a) => a.id === id ? { ...a, active: !a.active } : a));
  }

  function removeAnnouncement(id: string) {
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
  }

  function addAnnouncement() {
    setAnnouncements((prev) => [...prev, { id: `a${Date.now()}`, title: newTitle, content: newContent, type: "info", active: true, createdAt: new Date().toISOString().split("T")[0] }]);
    setNewTitle("");
    setNewContent("");
    setAddOpen(false);
  }

  return (
    <DashboardLayout role="admin" title="Content Management">
      <div className="p-6 space-y-6">
        {/* Announcements */}
        <Card className="border-card-border">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2"><Megaphone className="w-4 h-4" />Announcements</CardTitle>
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2" data-testid="button-add-announcement"><Plus className="w-3.5 h-3.5" />Add</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>New Announcement</DialogTitle></DialogHeader>
                <div className="space-y-4 py-2">
                  <div><Label>Title</Label><Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Announcement title" className="mt-1" data-testid="input-announcement-title" /></div>
                  <div><Label>Message</Label><Textarea value={newContent} onChange={(e) => setNewContent(e.target.value)} placeholder="Announcement content..." className="mt-1" data-testid="textarea-announcement-content" /></div>
                  <Button className="w-full" onClick={addAnnouncement} disabled={!newTitle || !newContent} data-testid="button-save-announcement">Publish Announcement</Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {announcements.map((a) => (
                <div key={a.id} className={`flex items-start gap-4 p-4 rounded-xl border-2 transition-colors ${a.active ? "border-border bg-background" : "border-dashed border-muted opacity-60"}`} data-testid={`card-announcement-${a.id}`}>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-foreground text-sm">{a.title}</p>
                      <Badge className={a.type === "warning" ? "bg-amber-100 text-amber-800 border-amber-200" : a.type === "success" ? "bg-green-100 text-green-800 border-green-200" : "bg-blue-100 text-blue-800 border-blue-200"} variant="outline">
                        {a.type}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{a.content}</p>
                    <p className="text-xs text-muted-foreground mt-1">Published: {a.createdAt}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch checked={a.active} onCheckedChange={() => toggleActive(a.id)} data-testid={`switch-announcement-${a.id}`} />
                    <Button size="icon" variant="ghost" className="w-7 h-7 text-destructive hover:text-destructive" onClick={() => removeAnnouncement(a.id)} data-testid={`button-delete-announcement-${a.id}`}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Banners */}
        <Card className="border-card-border">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Homepage Banners</CardTitle>
            <Button size="sm" variant="outline" className="gap-2" data-testid="button-add-banner"><Plus className="w-3.5 h-3.5" />Add Banner</Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {banners.map((b) => (
                <div key={b.id} className="flex items-center gap-4 p-3 border border-border rounded-xl" data-testid={`card-banner-${b.id}`}>
                  <img src={b.imageUrl} alt={b.title} className="w-24 h-14 object-cover rounded-lg shrink-0" />
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{b.title}</p>
                    <p className="text-xs text-muted-foreground">{b.subtitle}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={b.active} data-testid={`switch-banner-${b.id}`} />
                    <Button size="icon" variant="ghost" className="w-7 h-7" data-testid={`button-edit-banner-${b.id}`}><Edit className="w-3.5 h-3.5" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
