"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { setActionFeedbackFlash } from "@/components/ui/action-feedback";
import { ScheduleForm, emptyScheduleForm } from "@/components/scheduled/schedule-form";
import { endpoints, type ScheduledPayload } from "@/services/api/easysaving";

export default function AddScheduledPage() {
  const router = useRouter();
  const client = useQueryClient();

  const save = useMutation({
    mutationFn: (payload: ScheduledPayload) => endpoints.createScheduled(payload),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["scheduled"] });
      client.invalidateQueries({ queryKey: ["transactions"] });
      client.invalidateQueries({ queryKey: ["summary"] });
      client.invalidateQueries({ queryKey: ["accounts"] });
      setActionFeedbackFlash({
        type: "success",
        title: "Jadwal dibuat",
        message: "Jadwal akan diproses saat jatuh tempo."
      });
      router.push("/scheduled");
    }
  });

  return (
    <AppShell>
      <ScheduleForm
        title="Buat Jadwal"
        submitLabel="Simpan Jadwal"
        defaultValues={emptyScheduleForm}
        submitting={save.isPending}
        errorMessage={save.error ? (save.error as Error).message : null}
        onSubmit={(payload) => save.mutate(payload)}
      />
    </AppShell>
  );
}
