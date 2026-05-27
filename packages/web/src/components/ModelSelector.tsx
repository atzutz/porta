import { useState, useEffect, useRef, useCallback } from "react";
import { api } from "../api/client";
import { IconCamera } from "./Icons";

interface ModelConfig {
  label: string;
  modelOrAlias: { model: string };
  supportsImages: boolean;
  isRecommended: boolean;
  quotaInfo?: { remainingFraction: number };
}

interface Props {
  selectedModel: string | null;
  onSelect: (model: string) => void;
}

export function ModelSelector({ selectedModel, onSelect }: Props) {
  const [models, setModels] = useState<ModelConfig[]>([]);
  const [defaultModel, setDefaultModel] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const fetchModels = useCallback(async (retries = 3) => {
    for (let i = 0; i < retries; i++) {
      try {
        const data = await api.models();
        setModels(data.clientModelConfigs ?? []);
        setDefaultModel(
          data.defaultOverrideModelConfig?.modelOrAlias?.model ?? null,
        );
        setFetchError(false);
        return;
      } catch {
        if (i < retries - 1) {
          await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
        }
      }
    }
    setFetchError(true);
  }, []);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  // Close on outside click
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

  const active = selectedModel ?? defaultModel;
  const activeLabel =
    models.find((m) => m.modelOrAlias.model === active)?.label ?? "Model";

  return (
    <div className="model-selector" ref={ref}>
      <button
        className="chat-input-pill"
        onClick={() => {
          if (fetchError || models.length === 0) fetchModels();
          setOpen((v) => !v);
        }}
        title="Select model"
      >
        <span>{activeLabel}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
      </button>
      {open && (
        <div className="model-selector-dropdown">
          {fetchError && (
            <button
              className="model-option"
              onClick={() => fetchModels()}
              style={{
                color: "var(--text-tertiary)",
                justifyContent: "center",
              }}
            >
              ⟳ Retry loading models
            </button>
          )}
          {models.map((m) => {
            const isActive = m.modelOrAlias.model === active;
            const quota = m.quotaInfo?.remainingFraction ?? 1;
            return (
              <button
                key={m.modelOrAlias.model}
                className={`model-option ${isActive ? "active" : ""}`}
                onClick={() => {
                  onSelect(m.modelOrAlias.model);
                  setOpen(false);
                }}
              >
                <span className="model-option-label">{m.label}</span>
                <span className="model-option-meta">
                  {m.supportsImages && (
                    <>
                      <IconCamera size={12} />{" "}
                    </>
                  )}
                  {quota < 1 && (
                    <span
                      className="model-quota"
                      style={{
                        color: quota < 0.2 ? "var(--status-error)" : "inherit",
                      }}
                    >
                      {Math.round(quota * 100)}%
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
