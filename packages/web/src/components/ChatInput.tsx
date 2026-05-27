import { useState, useRef, useCallback, useEffect } from "react";
import { ModelSelector } from "./ModelSelector";
import { IconPaperclip, IconArrowDropDown } from "./Icons";
import type { MediaAttachment } from "../types";
import { prepareAttachments } from "../utils/imageAttachments";
import { DEFAULT_MODEL } from "../constants";

export type PlannerType = "conversational" | "planning";

interface Props {
  onSend: (
    text: string,
    model: string | null,
    media?: MediaAttachment[],
    plannerType?: PlannerType,
  ) => void;
  onStop: () => void;
  isRunning: boolean;
  disabled?: boolean;
  draft: string;
  onDraftChange: (text: string) => void;
  defaultModel?: string | null;
  defaultPlannerType?: PlannerType;
}

interface AttachmentPreview {
  file: File;
  dataUrl: string;
}

const PLANNER_OPTIONS: { value: PlannerType; label: string; desc: string }[] = [
  {
    value: "conversational",
    label: "Fast",
    desc: "Direct, single-step responses",
  },
  { value: "planning", label: "Plan", desc: "Multi-step structured approach" },
];

function PlannerTypeSelector({
  plannerType,
  onSelect,
}: {
  plannerType: PlannerType;
  onSelect: (v: PlannerType) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const activeLabel =
    PLANNER_OPTIONS.find((o) => o.value === plannerType)?.label ?? "Fast";

  return (
    <div className="model-selector" ref={ref}>
      <button
        className="chat-input-pill"
        onClick={() => setOpen((v) => !v)}
        title="Select planner mode"
      >
        <span>{activeLabel}</span>
        <IconArrowDropDown size={14} />
      </button>
      {open && (
        <div className="model-selector-dropdown">
          {PLANNER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              className={`model-option ${plannerType === opt.value ? "active" : ""}`}
              onClick={() => {
                onSelect(opt.value);
                setOpen(false);
              }}
            >
              <span className="model-option-label">{opt.label}</span>
              <span className="model-option-meta">{opt.desc}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function ChatInput({
  onSend,
  onStop,
  isRunning,
  disabled,
  draft,
  onDraftChange,
  defaultModel,
  defaultPlannerType,
}: Props) {
  const effectiveDefault = defaultModel ?? DEFAULT_MODEL;
  const [model, setModel] = useState<string | null>(effectiveDefault);

  useEffect(() => {
    setModel(effectiveDefault);
  }, [effectiveDefault]);

  const effectivePlanner = defaultPlannerType ?? "conversational";
  const [plannerType, setPlannerType] = useState<PlannerType>(effectivePlanner);

  useEffect(() => {
    setPlannerType(effectivePlanner);
  }, [effectivePlanner]);

  const [attachments, setAttachments] = useState<AttachmentPreview[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isPreparingAttachments, setIsPreparingAttachments] = useState(false);
  const fileErrorTimer = useRef<ReturnType<typeof setTimeout>>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }, [draft]);

  const showFileError = useCallback((msg: string) => {
    setFileError(msg);
    if (fileErrorTimer.current) clearTimeout(fileErrorTimer.current);
    fileErrorTimer.current = setTimeout(() => setFileError(null), 4000);
  }, []);

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      for (const file of fileArray) {
        const dataUrl = URL.createObjectURL(file);
        setAttachments((prev) => {
          if (prev.length >= 5) return prev; // max 5 attachments
          return [...prev, { file, dataUrl }];
        });
      }
    },
    [],
  );

  const removeAttachment = useCallback((index: number) => {
    setAttachments((prev) => {
      URL.revokeObjectURL(prev[index].dataUrl);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const handleSubmit = useCallback(async () => {
    const trimmed = draft.trim();
    if ((!trimmed && attachments.length === 0) || disabled || isPreparingAttachments) {
      return;
    }

    setIsPreparingAttachments(true);

    try {
      let media: MediaAttachment[] | undefined;
      if (attachments.length > 0) {
        const prepared = await prepareAttachments(attachments.map((a) => a.file));
        media = prepared.map(({ bytes: _bytes, ...attachment }) => attachment);
      }

      onSend(trimmed || " ", model, media, plannerType);
      onDraftChange("");
      attachments.forEach((attachment) => {
        URL.revokeObjectURL(attachment.dataUrl);
      });
      setAttachments([]);
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    } catch (err) {
      showFileError(
        err instanceof Error ? err.message : "Failed to process attachments",
      );
    } finally {
      setIsPreparingAttachments(false);
    }
  }, [
    draft,
    attachments,
    disabled,
    isPreparingAttachments,
    onSend,
    model,
    plannerType,
    onDraftChange,
    showFileError,
  ]);

  const inputDisabled = disabled || isPreparingAttachments;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      if (window.innerWidth <= 480 || inputDisabled) return;
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onDraftChange(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  };

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = e.clipboardData.items;
      const pastedFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === "file") {
          const file = item.getAsFile();
          if (file) pastedFiles.push(file);
        }
      }
      if (pastedFiles.length > 0) {
        e.preventDefault();
        addFiles(pastedFiles);
      }
    },
    [addFiles],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        addFiles(e.dataTransfer.files);
      }
    },
    [addFiles],
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        addFiles(e.target.files);
        e.target.value = "";
      }
    },
    [addFiles],
  );

  return (
    <div
      className={`chat-input-area ${dragOver ? "drag-over" : ""}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {fileError && (
        <div className="file-error-toast" role="alert">
          {fileError}
        </div>
      )}
      {attachments.length > 0 && (
        <div className="attachment-previews">
          {attachments.map((a, i) => (
            <div key={a.dataUrl} className="attachment-thumb" title={a.file.name}>
              {a.file.type.startsWith("image/") ? (
                <img src={a.dataUrl} alt="attachment" />
              ) : (
                <div className="attachment-file-icon">
                  <span className="attachment-file-ext">
                    {a.file.name.split(".").pop()?.toUpperCase().slice(0, 4) || "FILE"}
                  </span>
                </div>
              )}
              <button
                className="attachment-remove"
                onClick={() => removeAttachment(i)}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div
        className="chat-input-wrap glass-floating"
        onClick={(e) => {
          const target = e.target as HTMLElement;
          if (
            target.tagName !== "BUTTON" &&
            target.tagName !== "TEXTAREA" &&
            target.tagName !== "INPUT" &&
            target.closest("button") === null &&
            target.closest(".model-selector") === null
          ) {
            textareaRef.current?.focus();
          }
        }}
      >
        <button
          className="chat-action-icon-btn"
          onClick={() => fileInputRef.current?.click()}
          title="Attach image"
          disabled={inputDisabled}
        >
          <IconPaperclip size={24} />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          tabIndex={-1}
          aria-hidden="true"
          style={{
            position: "absolute",
            width: 0,
            height: 0,
            overflow: "hidden",
            opacity: 0,
            pointerEvents: "none",
          }}
          onChange={handleFileSelect}
          disabled={inputDisabled}
        />

        <textarea
          ref={textareaRef}
          className="chat-input"
          placeholder="Send a message..."
          value={draft}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          rows={1}
          disabled={inputDisabled}
        />

        <div className="chat-input-actions">
          <ModelSelector selectedModel={model} onSelect={setModel} />
          <PlannerTypeSelector
            plannerType={plannerType}
            onSelect={setPlannerType}
          />
          {isRunning ? (
            <button
              className="chat-stop-btn"
              onClick={onStop}
              title="Stop generation"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="6" width="12" height="12" rx="2"/>
              </svg>
            </button>
          ) : (
            <button
              className="chat-send-btn"
              onClick={handleSubmit}
              disabled={(!draft.trim() && attachments.length === 0) || inputDisabled}
              title={isPreparingAttachments ? "Processing images..." : "Send (Enter)"}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 19V5M5 12l7-7 7 7"/>
              </svg>
            </button>
          )}
        </div>
      </div>
      <div className="chat-disclaimer">
        AI can make mistakes. Verify important information.
      </div>
    </div>
  );
}
