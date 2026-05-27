import { useState } from "react";
import {
  IconCopy,
  IconCheck,
  IconLock,
  IconAlertTriangle,
  IconChevron,
  IconEye,
  IconPlus,
  IconEdit,
  IconZap,
} from "./Icons";
import type { TrajectoryStep, FilePermissionRequest } from "../types";

function basename(uriOrPath: string): string {
  const cleaned = uriOrPath.replace(/^file:\/\//, "");
  return cleaned.split("/").pop() ?? cleaned;
}

export function getFilePermissionRequest(
  step: TrajectoryStep,
): FilePermissionRequest | undefined {
  return (
    step.filePermissionRequest ??
    step.viewFile?.filePermissionRequest ??
    step.listDirectory?.filePermissionRequest ??
    step.codeAction?.filePermissionRequest ??
    step.grepSearch?.filePermissionRequest ??
    step.viewFileOutline?.filePermissionRequest ??
    step.viewCodeItem?.filePermissionRequest
  );
}

function StepCopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="step-copy-btn"
      title="Copy"
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
    >
      {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
    </button>
  );
}

// ── File Permission Card ──

const PERMISSION_SCOPE_ONCE = 1;
const PERMISSION_SCOPE_CONVERSATION = 2;

interface FilePermissionCardProps {
  step: TrajectoryStep;
  permissionRequest: FilePermissionRequest;
  onFilePermission: (
    trajectoryId: string,
    stepIndex: number,
    allow: boolean,
    scope: number,
    absolutePathUri: string,
  ) => void;
}

export function FilePermissionCard({
  step,
  permissionRequest,
  onFilePermission,
}: FilePermissionCardProps) {
  const [responded, setResponded] = useState(false);
  const isWaiting = step.status === "CORTEX_STEP_STATUS_WAITING";

  const trajectoryId =
    step.metadata?.sourceTrajectoryStepInfo?.trajectoryId ?? "";
  const stepIndex = step.metadata?.sourceTrajectoryStepInfo?.stepIndex ?? 0;

  const path = permissionRequest.absolutePathUri;
  const displayPath = path.length > 60 ? "…" + path.slice(-55) : path;
  const isDir = permissionRequest.isDirectory ?? false;

  const handleResponse = (allow: boolean, scope: number) => {
    setResponded(true);
    onFilePermission(trajectoryId, stepIndex, allow, scope, path);
  };

  return (
    <div
      className={`chat-block step-card file-permission-card ${responded ? "cmd-ok" : isWaiting ? "cmd-wait" : ""}`}
    >
      <div className="step-card-header" style={{ cursor: "default" }}>
        <span className="step-card-icon">
          <IconLock size={16} />
        </span>
        <div className="command-card-main">
          <span className="step-card-desc">
            File access requested:{" "}
            <code className="step-card-file">{displayPath}</code>
            {isDir ? " (directory)" : ""}
          </span>
        </div>
      </div>
      {permissionRequest.blockReason && (
        <div className="step-card-cwd" style={{ padding: "0 20px 16px", color: "var(--on-surface-variant)" }}>
          {permissionRequest.blockReason
            .replace("BLOCK_REASON_", "")
            .replace(/_/g, " ")
            .toLowerCase()}
        </div>
      )}
      {isWaiting && !responded && (
        <div className="file-permission-actions">
          <button
            className="file-permission-btn deny"
            onClick={() => handleResponse(false, 0)}
          >
            Deny
          </button>
          <button
            className="file-permission-btn allow-once"
            onClick={() => handleResponse(true, PERMISSION_SCOPE_ONCE)}
          >
            Allow Once
          </button>
          <button
            className="file-permission-btn allow-conversation"
            onClick={() => handleResponse(true, PERMISSION_SCOPE_CONVERSATION)}
          >
            Allow This Conversation
          </button>
        </div>
      )}
    </div>
  );
}

// ── Command Card ──

interface CommandCardProps {
  step: TrajectoryStep;
  onCommandAction?: (
    trajectoryId: string,
    stepIndex: number,
    approved: boolean,
  ) => Promise<void>;
}

export function CommandCard({ step, onCommandAction }: CommandCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [responded, setResponded] = useState(false);
  const cmd = step.runCommand;
  if (!cmd) return null;

  const isWaiting = step.status === "CORTEX_STEP_STATUS_WAITING";
  const command = isWaiting
    ? (cmd.proposedCommandLine ?? cmd.commandLine ?? cmd.command ?? "")
    : (cmd.commandLine ?? cmd.command ?? "");
  const output = cmd.combinedOutput?.full ?? cmd.output ?? "";
  const cwd = cmd.cwd;
  const exitCode = cmd.exitCode;

  const trajectoryId =
    step.metadata?.sourceTrajectoryStepInfo?.trajectoryId ?? "";
  const stepIndex = step.metadata?.sourceTrajectoryStepInfo?.stepIndex ?? 0;

  const statusClass = isWaiting
    ? "cmd-wait"
    : exitCode === undefined
      ? ""
      : exitCode === 0
        ? "cmd-ok"
        : "cmd-fail";

  const handleAction = async (approved: boolean) => {
    if (!onCommandAction) return;
    setResponded(true);
    try {
      await onCommandAction(trajectoryId, stepIndex, approved);
    } catch {
      setResponded(false);
    }
  };

  return (
    <div className={`chat-block step-card command-card ${statusClass}`}>
      <div
        className="step-card-header"
        role="button"
        tabIndex={0}
        onClick={() => output && setExpanded((v) => !v)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { output && setExpanded((v) => !v); } }}
        style={{ cursor: output ? "pointer" : "default", display: "block", width: "100%", padding: "12px 16px", background: "transparent", border: "none", textAlign: "left" }}
      >
        <div className="command-card-top">
          <span className="step-card-cwd">{cwd || "terminal"}</span>
          <div onClick={(e) => e.stopPropagation()}>
            <StepCopyBtn text={output ? `$ ${command}\n${output}` : `$ ${command}`} />
          </div>
        </div>
        <div className="command-card-main">
          <span className="command-card-prompt">{">_"}</span>
          <span className="step-card-command">{command}</span>
          {output && (
            <span className={`step-card-chevron ${expanded ? "open" : ""}`} style={{ marginLeft: "auto" }}>
              <IconChevron />
            </span>
          )}
        </div>
      </div>
      {isWaiting && !responded && onCommandAction && (
        <div className="command-action-bar">
          <span className="command-waiting-label">
            <span className="waiting-dot" />
            Waiting for approval
          </span>
          <div className="command-action-buttons">
            <button
              className="command-action-btn reject"
              onClick={() => handleAction(false)}
            >
              Reject
            </button>
            <button
              className="command-action-btn approve"
              onClick={() => handleAction(true)}
            >
              Approve
            </button>
          </div>
        </div>
      )}
      {expanded && output && <pre className="step-card-output">{output}</pre>}
    </div>
  );
}

// ── Code Action Card ──

interface CodeActionCardProps {
  step: TrajectoryStep;
}

type DiffLineType =
  | "UNIFIED_DIFF_LINE_TYPE_UNCHANGED"
  | "UNIFIED_DIFF_LINE_TYPE_INSERT"
  | "UNIFIED_DIFF_LINE_TYPE_DELETE"
  | "UNIFIED_DIFF_LINE_TYPE_HUNK_HEADER";

interface DiffLine {
  text?: string;
  type: DiffLineType;
}

function diffLinePrefix(type: DiffLineType): string {
  if (type === "UNIFIED_DIFF_LINE_TYPE_INSERT") return "+";
  if (type === "UNIFIED_DIFF_LINE_TYPE_DELETE") return "-";
  if (type === "UNIFIED_DIFF_LINE_TYPE_HUNK_HEADER") return "@@";
  return " ";
}

function diffLineClass(type: DiffLineType): string {
  if (type === "UNIFIED_DIFF_LINE_TYPE_INSERT") return "diff-add";
  if (type === "UNIFIED_DIFF_LINE_TYPE_DELETE") return "diff-del";
  if (type === "UNIFIED_DIFF_LINE_TYPE_HUNK_HEADER") return "diff-hunk";
  return "";
}

export function CodeActionCard({ step }: CodeActionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const ca = step.codeAction;
  if (!ca) return null;

  const toolName = step.metadata?.toolCall?.name ?? "";

  const description = ca.description ?? "Code change";
  const fileUri: string = ca.actionResult?.edit?.absoluteUri ?? "";
  const fileName = fileUri ? basename(fileUri) : "";
  const diffLines: DiffLine[] =
    ca.actionResult?.edit?.diff?.unifiedDiff?.lines ?? [];
  const hasDiff = diffLines.length > 0;

  // Determine icon based on tool
  let iconEl = <IconEye size={16} />;
  if (toolName === "write_to_file") iconEl = <IconPlus size={16} />;
  else if (
    toolName === "multi_replace_file_content" ||
    toolName === "replace_file_content"
  )
    iconEl = <IconEdit size={16} />;

  const isViewOnly = toolName !== "write_to_file" && toolName !== "multi_replace_file_content" && toolName !== "replace_file_content";

  const additions = diffLines.filter(
    (l) => l.type === "UNIFIED_DIFF_LINE_TYPE_INSERT",
  ).length;
  const deletions = diffLines.filter(
    (l) => l.type === "UNIFIED_DIFF_LINE_TYPE_DELETE",
  ).length;

  return (
    <div className={`chat-block step-card code-card ${isViewOnly ? "view-card" : ""}`}>
      <button
        className="step-card-header"
        onClick={() => hasDiff && setExpanded((v) => !v)}
        style={{ cursor: hasDiff ? "pointer" : "default" }}
      >
        <span className="step-card-icon">{iconEl}</span>
        {hasDiff && (
          <span className="diff-stat">
            <span className="diff-stat-add">+{additions}</span>
            <span className="diff-stat-del">-{deletions}</span>
          </span>
        )}
        {isViewOnly && !hasDiff && (
          <span style={{ fontSize: 12, color: "var(--on-surface-variant)", opacity: 0.8 }}>Viewed</span>
        )}
        {fileName && <code className="step-card-file">{fileName}</code>}
        <span className="step-card-desc">{description}</span>
        {hasDiff && (
          <span className={`step-card-chevron ${expanded ? "open" : ""}`}>
            <IconChevron />
          </span>
        )}
      </button>
      {expanded && hasDiff && (
        <div className="step-card-diff">
          <pre className="diff-content">
            {diffLines.map((line, i) => (
              <div key={i} className={`diff-line ${diffLineClass(line.type)}`}>
                <span className="diff-prefix">{diffLinePrefix(line.type)}</span>
                <span className="diff-text">{line.text ?? ""}</span>
              </div>
            ))}
          </pre>
        </div>
      )}
    </div>
  );
}

interface ErrorMessageCardProps {
  step: TrajectoryStep;
  onRetry?: (stepIndex: number) => void;
}

export function ErrorMessageCard({ step, onRetry }: ErrorMessageCardProps) {
  const [expanded, setExpanded] = useState(false);
  const errMsg = step.errorMessage;
  if (!errMsg || !errMsg.error) return null;

  const error = errMsg.error;
  const mainMessage = error.userErrorMessage || error.shortError || error.modelErrorMessage || "An error occurred";
  const detail = error.modelErrorMessage || error.shortError || "";
  const fullError = error.fullError || error.details || "";

  const hasDetail = !!detail || !!fullError;

  return (
    <div className="chat-block step-card error-card">
      <button
        className="step-card-header"
        onClick={() => hasDetail && setExpanded((v) => !v)}
        title={hasDetail ? "Toggle error details" : undefined}
        style={{ cursor: hasDetail ? "pointer" : "default" }}
      >
        <span className="step-card-icon">
          <IconAlertTriangle size={16} />
        </span>
        <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0, textAlign: "left" }}>
          <span className="error-card-title">
            {mainMessage}
          </span>
          {!expanded && detail && detail !== mainMessage && (
            <span className="error-card-detail">
              {detail}
            </span>
          )}
        </div>
        {hasDetail && (
          <span className={`step-card-chevron ${expanded ? "open" : ""}`}>
            <IconChevron />
          </span>
        )}
      </button>
      {onRetry && (
        <div className="file-permission-actions">
          <button
            className="command-action-btn approve"
            onClick={(e) => {
              e.stopPropagation();
              onRetry(step.metadata?.sourceTrajectoryStepInfo?.stepIndex ?? 0);
            }}
          >
            Retry
          </button>
        </div>
      )}
      {expanded && (
        <div className="step-card-output">
          {detail && detail !== mainMessage && (
            <div style={{ marginBottom: "8px", fontWeight: 600 }}>
              {detail}
            </div>
          )}
          {fullError && (
            <div>
              {fullError}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── MCP Tool Card ──

export interface McpToolCardProps {
  step: TrajectoryStep;
  onCommandAction?: (
    trajectoryId: string,
    stepIndex: number,
    approved: boolean,
  ) => Promise<void>;
}

export function McpToolCard({ step, onCommandAction }: McpToolCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [responded, setResponded] = useState(false);
  const mcp = step.mcpTool;
  if (!mcp) return null;

  const isWaiting = step.status === "CORTEX_STEP_STATUS_WAITING";
  const serverName = mcp.serverName ?? "";
  const toolName = mcp.toolCall?.name ?? "";
  const args = mcp.toolCall?.argumentsJson ?? "{}";
  const result = mcp.resultString;

  const trajectoryId = step.metadata?.sourceTrajectoryStepInfo?.trajectoryId ?? "";
  const stepIndex = step.metadata?.sourceTrajectoryStepInfo?.stepIndex ?? 0;

  const statusClass = isWaiting
    ? "cmd-wait"
    : step.status === "CORTEX_STEP_STATUS_ERROR"
      ? "cmd-fail"
      : "cmd-ok";

  const handleAction = async (approved: boolean) => {
    if (!onCommandAction) return;
    setResponded(true);
    try {
      await onCommandAction(trajectoryId, stepIndex, approved);
    } catch {
      setResponded(false);
    }
  };

  let parsedArgs: Record<string, unknown> | null = null;
  try {
    parsedArgs = JSON.parse(args);
  } catch {
    // Ignore invalid JSON
  }

  const hasArgs = !!mcp.toolCall;
  const hasContent = hasArgs || !!result;

  let formattedResult = result ?? "";
  try {
    if (result) {
      const parsed = JSON.parse(result);
      formattedResult = JSON.stringify(parsed, null, 2);
    }
  } catch {
    // Keep raw string if not JSON
  }

  return (
    <div className={`chat-block step-card command-card ${statusClass}`}>
      <button
        className="step-card-header"
        title="Toggle details"
        onClick={() => hasContent && setExpanded((v) => !v)}
        style={{ padding: "12px 16px", cursor: hasContent ? "pointer" : "default" }}
      >
        <span className="step-card-icon">
          <IconZap size={16} />
        </span>
        <div className="command-card-main" style={{ alignItems: "center" }}>
          <span className="step-card-desc" style={{ flex: "none" }}>
            {isWaiting ? "MCP permission requested: " : "Called MCP tool: "}
          </span>
          <code className="step-card-file" style={{ color: "var(--on-surface)" }}>
            {serverName}/{toolName}
          </code>
        </div>
        {hasContent && (
          <span className={`step-card-chevron ${expanded ? "open" : ""}`}>
            <IconChevron />
          </span>
        )}
      </button>
      {isWaiting && !responded && onCommandAction && (
        <div className="command-action-bar" style={{ marginTop: 0 }}>
          <span className="command-waiting-label">
            <span className="waiting-dot" />
            Waiting for approval
          </span>
          <div className="command-action-buttons">
            <button
              className="command-action-btn reject"
              onClick={() => handleAction(false)}
            >
              Reject
            </button>
            <button
              className="command-action-btn approve"
              onClick={() => handleAction(true)}
            >
              Approve
            </button>
          </div>
        </div>
      )}
      {expanded && hasContent && (
        <div className="step-card-output">
          {hasArgs && (
            <div style={{ marginBottom: result ? "10px" : "0px" }}>
              <div style={{ marginBottom: "4px", fontWeight: 600 }}>Arguments:</div>
              <pre style={{ margin: 0, overflowX: "auto", fontFamily: "inherit", fontSize: "inherit", color: "inherit" }}>
                {parsedArgs ? JSON.stringify(parsedArgs, null, 2) : args}
              </pre>
            </div>
          )}
          {result && (
            <div>
              <div style={{ marginBottom: "4px", fontWeight: 600 }}>Output:</div>
              <pre style={{ margin: 0, overflowX: "auto", fontFamily: "inherit", fontSize: "inherit", color: "inherit", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                {formattedResult}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
