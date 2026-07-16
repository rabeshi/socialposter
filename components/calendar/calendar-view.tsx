"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/posts/status-badge";

export interface CalendarEvent {
  id: string;
  date: string;
  type: "generation" | "suggested" | "publication";
  label: string;
  status: string;
  category?: string;
  platform?: string;
}

export function CalendarView({ events }: { events: CalendarEvent[] }) {
  const [view, setView] = useState<"month" | "list">("month");
  const [monthOffset, setMonthOffset] = useState(0);

  const now = new Date();
  const viewedMonth = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of events) {
      const key = e.date.slice(0, 10);
      map.set(key, [...(map.get(key) ?? []), e]);
    }
    return map;
  }, [events]);

  const daysInMonth = new Date(viewedMonth.getFullYear(), viewedMonth.getMonth() + 1, 0).getDate();
  const firstWeekday = viewedMonth.getDay();
  const cells: (number | null)[] = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button size="sm" variant={view === "month" ? "default" : "outline"} onClick={() => setView("month")}>Month</Button>
          <Button size="sm" variant={view === "list" ? "default" : "outline"} onClick={() => setView("list")}>List</Button>
        </div>
        {view === "month" && (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setMonthOffset((m) => m - 1)}>←</Button>
            <span className="text-sm font-medium">
              {viewedMonth.toLocaleString("en-US", { month: "long", year: "numeric" })}
            </span>
            <Button size="sm" variant="outline" onClick={() => setMonthOffset((m) => m + 1)}>→</Button>
          </div>
        )}
      </div>

      {view === "month" ? (
        <div className="grid grid-cols-7 gap-2">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="text-center text-xs font-semibold text-muted-foreground">{d}</div>
          ))}
          {cells.map((day, i) => {
            if (day === null) return <div key={i} />;
            const key = `${viewedMonth.getFullYear()}-${String(viewedMonth.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const dayEvents = eventsByDay.get(key) ?? [];
            return (
              <div key={i} className="min-h-[90px] rounded-md border p-1 text-xs">
                <div className="mb-1 font-semibold">{day}</div>
                <div className="space-y-1">
                  {dayEvents.slice(0, 3).map((e) => (
                    <div key={e.id} className="truncate rounded bg-muted px-1 py-0.5">{e.label}</div>
                  ))}
                  {dayEvents.length > 3 && <div className="text-muted-foreground">+{dayEvents.length - 3} more</div>}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2">
          {events
            .sort((a, b) => a.date.localeCompare(b.date))
            .map((e) => (
              <Card key={e.id}>
                <CardContent className="flex items-center justify-between gap-3 pt-6 text-sm">
                  <div>
                    <p className="font-medium">{e.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {e.date.slice(0, 10)} · {e.type}
                      {e.platform ? ` · ${e.platform}` : ""}
                      {e.category ? ` · ${e.category.replaceAll("_", " ")}` : ""}
                    </p>
                  </div>
                  <StatusBadge status={e.status} />
                </CardContent>
              </Card>
            ))}
        </div>
      )}
    </div>
  );
}
