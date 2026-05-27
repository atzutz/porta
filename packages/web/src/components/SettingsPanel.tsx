/**
 * Settings panel — global client configuration.
 *
 * Currently supports:
 *   - Default model selection
 *   - Default planner type (Fast / Plan)
 *
 * Settings are stored client-side in localStorage.
 */

import { useState, useEffect, useCallback } from "react";
import { IconChevronLeft, IconCheck } from "./Icons";
import { api } from "../api/client";
import type { ClientSettings } from "../types";
import type { PlannerType } from "./ChatInput";
import { GlassSelect } from "./ui/GlassSelect";
import { GlassButton } from "./ui/GlassButton";

interface ModelConfig {
  label: string;
  modelOrAlias: { model: string };
  supportsImages: boolean;
  isRecommended: boolean;
  quotaInfo?: { remainingFraction: number };
}

interface Props {
  settings: ClientSettings;
  onUpdate: (patch: Partial<ClientSettings>) => void;
  onBack: () => void;
}

export function SettingsPanel({ settings, onUpdate, onBack }: Props) {
  const [models, setModels] = useState<ModelConfig[]>([]);
  const [fetchError, setFetchError] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  const fetchModels = useCallback(async (retries = 3) => {
    for (let i = 0; i < retries; i++) {
      try {
        const data = await api.models();
        setModels(data.clientModelConfigs ?? []);
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

  const flashSaved = useCallback(() => {
    setSavedFlash(true);
    const timer = setTimeout(() => setSavedFlash(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleModelChange = useCallback(
    (modelId: string) => {
      const value = modelId === "__none__" ? null : modelId;
      onUpdate({ defaultModel: value });
      flashSaved();
    },
    [onUpdate, flashSaved],
  );

  const handlePlannerChange = useCallback(
    (value: string) => {
      onUpdate({ defaultPlannerType: value as PlannerType });
      flashSaved();
    },
    [onUpdate, flashSaved],
  );

  const handleAutoExecutionChange = useCallback(
    (value: number) => {
      onUpdate({ cascadeAutoExecutionPolicy: value });
      flashSaved();
    },
    [onUpdate, flashSaved],
  );

  const handleMcpAutoApprovalChange = useCallback(
    (value: boolean) => {
      onUpdate({ cascadeMcpAutoApproval: value });
      flashSaved();
    },
    [onUpdate, flashSaved],
  );

  const handleReset = useCallback(() => {
    onUpdate({
      defaultModel: null,
      defaultPlannerType: "conversational",
      cascadeAutoExecutionPolicy: 1,
      cascadeMcpAutoApproval: false,
    });
    flashSaved();
  }, [onUpdate, flashSaved]);

  return (
    <div className="settings-panel">
      <div className="settings-header">
        <button
          className="settings-back-btn"
          onClick={onBack}
          title="Back to chat"
        >
          <IconChevronLeft size={18} />
        </button>
        <h1 className="settings-title">Settings</h1>
        <span className={`settings-saved-badge ${savedFlash ? "visible" : ""}`}>
          <IconCheck size={12} /> Saved
        </span>
      </div>

      <div className="settings-body">
        {/* ── Model ── */}
        <div className="settings-section">
          <h2 className="settings-section-title">Model</h2>
          <div className="settings-row">
            <div className="settings-row-info">
              <span className="settings-row-label">Default Model</span>
              <span className="settings-row-desc">
                The model used when you haven't explicitly selected one
                per-message. Changes apply to new messages only.
              </span>
            </div>
            <GlassSelect
              className="settings-select"
              value={settings.defaultModel ?? "__none__"}
              onChange={handleModelChange}
              options={[
                { value: "__none__", label: "Server default" },
                ...(fetchError ? [{ value: "error", label: "⚠ Failed to load models", disabled: true }] : []),
                ...models.map((m) => ({
                  value: m.modelOrAlias.model,
                  label: `${m.label}${m.supportsImages ? " [Vision]" : ""}${m.isRecommended ? " (Recommended)" : ""}`
                }))
              ]}
            />
          </div>
        </div>

        {/* ── Planner ── */}
        <div className="settings-section">
          <h2 className="settings-section-title">Planner</h2>
          <div className="settings-row">
            <div className="settings-row-info">
              <span className="settings-row-label">Default Mode</span>
              <span className="settings-row-desc">
                Fast gives direct single-step responses. Plan uses a
                multi-step structured approach for complex tasks.
              </span>
            </div>
            <GlassSelect
              className="settings-select"
              value={settings.defaultPlannerType}
              onChange={handlePlannerChange}
              options={[
                { value: "conversational", label: "Fast" },
                { value: "planning", label: "Plan" }
              ]}
            />
          </div>
        </div>

        {/* ── Terminal ── */}
        <div className="settings-section">
          <h2 className="settings-section-title">Terminal</h2>
          <div className="settings-row">
            <div className="settings-row-info">
              <span className="settings-row-label">Terminal Command Auto Execution</span>
              <span className="settings-row-desc">
                Controls whether terminal commands require your approval before running.
              </span>
            </div>
            <GlassSelect
              className="settings-select"
              value={String(settings.cascadeAutoExecutionPolicy)}
              onChange={(v) => handleAutoExecutionChange(Number(v))}
              options={[
                { value: "1", label: "Require Review" },
                { value: "3", label: "Always Proceed" },
                { value: "4", label: "Proceed in Sandbox" }
              ]}
            />
          </div>
        </div>

        {/* ── MCP Tools ── */}
        <div className="settings-section">
          <h2 className="settings-section-title">MCP Tools</h2>
          <div className="settings-row">
            <div className="settings-row-info">
              <span className="settings-row-label">MCP Tool Auto Approval</span>
              <span className="settings-row-desc">
                Controls whether Model Context Protocol (MCP) tool integrations (like Asana, GitHub) require approval.
              </span>
            </div>
            <GlassSelect
              className="settings-select"
              value={settings.cascadeMcpAutoApproval ? "true" : "false"}
              onChange={(v) => handleMcpAutoApprovalChange(v === "true")}
              options={[
                { value: "false", label: "Require Review" },
                { value: "true", label: "Always Proceed" }
              ]}
            />
          </div>
        </div>

        <GlassButton variant="danger" onClick={handleReset} style={{ width: "100%", marginTop: 24 }}>
          Reset all settings to defaults
        </GlassButton>
      </div>
    </div>
  );
}
