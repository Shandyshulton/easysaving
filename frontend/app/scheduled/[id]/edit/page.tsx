"use client";

import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { setActionFeedbackFlash } from "@/components/ui/action-feedback";
import { ScheduleForm, emptyScheduleForm, type ScheduleFormValues } from "@/components/scheduled/schedule-form";
import { endpoints, type ScheduledPayload } from "@/services/api/easysaving";

export default function EditScheduledPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const client = useQueryClient();

  const { data: schedule, isLoading, isError, error } = useQuery({
    queryKey: ["scheduled", id],
    queryFn: () => endpoints.scheduledById(id),
    enabled: Boolean(id)
  });

  const save = useMutation({
    mutationFn: (payload: ScheduledPayload) => endpoints.updateScheduled(id, payload),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["scheduled"] });
      client.invalidateQueries({ queryKey: ["transactions"] });
      client.invalidateQueries({ queryKey: ["summary"] });
      client.invalidateQueries({ queryKey: ["accounts"] });
      setActionFeedbackFlash({
        type: "success",
        title: "Jadwal diperbarui",
        message: "Perubahan jadwal sudah tersimpan."
      });
      router.push("/scheduled");
    }
  });

  if (isLoading) {
    return (
      <AppShell>
        <div className="mx-auto max-w-2xl space-y-4">
          <div className="h-10 w-40 animate-pulse rounded-[var(--radius)] bg-white" />
          <div className="h-64 animate-pulse rounded-[var(--radius-lg)] bg-white" />
        </div>
      </AppShell>
    );
  }

  if (isError || !schedule) {
    return (
      <AppShell>
        <div className="mx-auto max-w-2xl">
          <div className="panel p-6 text-center">
            <p className="text-sm font-semibold text-[var(--expense)]">Jadwal tidak ditemukan.</p>
            {isError ? <p className="mt-1 text-sm text-[var(--text-secondary)]">{(error as Error).message}</p> : null}
          </div>
        </div>
      </AppShell>
    );
  }

  // Map the API shape onto the form shape.
  const defaults: ScheduleFormValues = {
    ...emptyScheduleForm,
    type: schedule.type,
    name: schedule.name,
    amount: schedule.amount ? String(Math.trunc(Number(schedule.amount))) : "",
    category_id: schedule.category_id,
    account_id: schedule.account_id,
    mode: schedule.mode,
    frequency: schedule.frequency,
    interval: schedule.interval || 1,
    start_date: schedule.start_date.slice(0, 10),
    end_date: schedule.end_date ? schedule.end_date.slice(0, 10) : "",
    remind_days_before: schedule.remind_days_before ?? 3,
    notes: schedule.notes ?? ""
  };

  return (
    <AppShell>
      <ScheduleForm
        title="Edit Jadwal"
        submitLabel="Simpan Perubahan"
        defaultValues={defaults}
        submitting={save.isPending}
        errorMessage={save.error ? (save.error as Error).message : null}
        onSubmit={(payload) => save.mutate(payload)}
      />
    </AppShell>
  );
}
