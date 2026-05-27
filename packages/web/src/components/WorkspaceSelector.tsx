import { IconFolder } from "./Icons";
import { GlassSelect } from "./ui/GlassSelect";

interface Props {
  workspaces: { uri: string; name: string }[];
  selected: string;
  onSelect: (uri: string) => void;
}

export function WorkspaceSelector({ workspaces, selected, onSelect }: Props) {
  const options = workspaces.map(ws => ({
    value: ws.uri,
    label: ws.name,
    icon: <IconFolder size={12} />
  }));

  return (
    <div style={{ maxWidth: 200, margin: "0 auto" }}>
      <GlassSelect
        value={selected}
        onChange={onSelect}
        options={options}
        placeholder="Select workspace"
      />
    </div>
  );
}
