"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronLeft, ChevronRight, CalendarIcon } from "lucide-react";
import { addDays, addMonths, addWeeks, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

type Unit = "day" | "week" | "month";

const STEP: Record<Unit, (date: Date, amount: number) => Date> = {
  day: addDays,
  week: addWeeks,
  month: addMonths,
};

export function ViewNav({
  basePath,
  currentDate,
  unit,
  label,
  showPicker = true,
}: {
  basePath: string;
  currentDate: string;
  unit: Unit;
  label: string;
  showPicker?: boolean;
}) {
  const router = useRouter();
  const [pickerOpen, setPickerOpen] = useState(false);
  const date = new Date(currentDate);

  function go(target: Date) {
    router.push(`${basePath}?date=${format(target, "yyyy-MM-dd")}`);
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center overflow-hidden rounded-lg border border-border/70">
        <Button variant="ghost" size="icon-sm" className="rounded-none" onClick={() => go(STEP[unit](date, -1))}>
          <ChevronLeft className="size-4" />
        </Button>
        <Button variant="ghost" size="sm" className="rounded-none border-x border-border/70 px-3" onClick={() => go(new Date())}>
          Hoje
        </Button>
        <Button variant="ghost" size="icon-sm" className="rounded-none" onClick={() => go(STEP[unit](date, 1))}>
          <ChevronRight className="size-4" />
        </Button>
      </div>

      <span className="text-sm font-medium capitalize text-foreground">{label}</span>

      {showPicker && (
        <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
          <PopoverTrigger
            render={
              <Button variant="ghost" size="icon-sm" />
            }
          >
            <CalendarIcon className="size-4" />
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto p-0">
            <Calendar
              mode="single"
              locale={ptBR}
              selected={date}
              onSelect={(selected) => {
                if (selected) {
                  go(selected);
                  setPickerOpen(false);
                }
              }}
            />
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
