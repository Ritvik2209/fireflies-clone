"use client";

import { Download } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { downloadExport, errorMessage } from "@/lib/api";
import { cn } from "@/lib/cn";
import { saveFile } from "@/lib/download";
import type { ExportContent, ExportFormat } from "@/lib/types";

const CONTENTS: { value: ExportContent; label: string; description: string }[] = [
  {
    value: "transcript",
    label: "Transcript",
    description: "Every line with its speaker and time. The TXT file can be uploaded again.",
  },
  {
    value: "summary",
    label: "Summary",
    description: "Overview, keywords, chapters and action items.",
  },
];
const FORMATS: { value: ExportFormat; label: string }[] = [
  { value: "pdf", label: "PDF" },
  { value: "txt", label: "TXT" },
  { value: "md", label: "Markdown" },
];

/** "Download meeting", as in Fireflies: the transcript or the AI notes, as PDF, TXT or Markdown. */
export function ExportDialog({ meetingId, onClose }: { meetingId: number; onClose: () => void }) {
  const [content, setContent] = useState<ExportContent>("transcript");
  const [format, setFormat] = useState<ExportFormat>("pdf");
  const [downloading, setDownloading] = useState(false);

  async function download() {
    setDownloading(true);
    try {
      const { blob, filename } = await downloadExport(meetingId, content, format);
      saveFile(blob, filename);
      toast.success(`Downloaded ${filename}`);
      onClose();
    } catch (error) {
      toast.error(errorMessage(error));
      setDownloading(false);
    }
  }

  return (
    <Modal title="Download meeting" onClose={() => !downloading && onClose()}>
      <div
        role="group"
        aria-label="What to download"
        className="flex gap-6 border-b border-gray-200"
      >
        {CONTENTS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            aria-pressed={content === value}
            onClick={() => setContent(value)}
            className={cn(
              "-mb-px border-b-2 pb-2 text-sm font-medium transition-colors",
              content === value
                ? "border-brand-600 text-brand-700 dark:text-brand-300"
                : "border-transparent text-gray-500 hover:text-gray-700",
            )}
          >
            {label}
          </button>
        ))}
      </div>
      <div role="group" aria-label="File format" className="mt-5 flex gap-2">
        {FORMATS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            aria-pressed={format === value}
            onClick={() => setFormat(value)}
            className={cn(
              "rounded-lg border px-3.5 py-1.5 text-sm font-medium transition-colors",
              format === value
                ? "border-brand-600 bg-brand-50 text-brand-700 dark:text-brand-300"
                : "border-gray-300 text-gray-700 hover:bg-gray-50",
            )}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="mt-4 text-sm text-gray-500">
        {CONTENTS.find((option) => option.value === content)?.description}
      </p>
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose} disabled={downloading}>
          Cancel
        </Button>
        <Button data-autofocus icon={Download} onClick={download} disabled={downloading}>
          {downloading ? "Preparing…" : "Download"}
        </Button>
      </div>
    </Modal>
  );
}
