"use client";

import { useCallback, useState, useTransition } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { nodeTypes, NODE_META } from "./automation-node";
import { NodePanel } from "./node-panel";
import { updateAutomationFlow, updateAutomationStatus, deleteAutomation } from "@/lib/actions/automations";
import type { Automation, AutomationStatus, CustomField } from "@/types/database";
import type { FlowNode, FlowNodeType, FlowNodeData } from "@/types/automation";
import { Save, Trash2 } from "lucide-react";

const PALETTE: FlowNodeType[] = [
  "send_message",
  "ask_question",
  "condition",
  "random_split",
  "delay",
  "add_tag",
  "remove_tag",
  "ai_reply",
  "reply_comment",
  "human_handoff",
  "start_automation",
];

function defaultDataFor(type: FlowNodeType): FlowNodeData {
  switch (type) {
    case "send_message":
      return { messageType: "text", text: "" };
    case "condition":
      return { field: "message_contains", operator: "contains", value: "" };
    case "random_split":
      return { splitPercent: 50 };
    case "delay":
      return { amount: 1, unit: "minutes" };
    case "add_tag":
    case "remove_tag":
      return { tagName: "" };
    case "ai_reply":
      return { aiSettingsId: null };
    case "ask_question":
      return { question: "", saveTo: "name", inputType: "text" };
    case "reply_comment":
      return { text: "" };
    case "human_handoff":
      return {};
    case "start_automation":
      return { targetAutomationId: "" };
    default:
      return { triggerType: "dm_keyword", keywords: [], matchType: "contains" };
  }
}

export function FlowEditor({
  automation,
  customFields,
  otherAutomations,
}: {
  automation: Automation;
  customFields: CustomField[];
  otherAutomations: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(automation.flow_definition.nodes as unknown as Node[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(automation.flow_definition.edges as unknown as Edge[]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();
  const [status, setStatus] = useState<AutomationStatus>(automation.status);

  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges]
  );

  function addNode(type: FlowNodeType) {
    const id = `${type}-${crypto.randomUUID()}`;
    const newNode: Node = {
      id,
      type,
      position: { x: 250 + (nodes.length % 4) * 40, y: 150 + nodes.length * 90 },
      data: defaultDataFor(type) as unknown as Record<string, unknown>,
    };
    setNodes((nds) => [...nds, newNode]);
  }

  function updateSelectedNodeData(data: FlowNode["data"]) {
    setNodes((nds) => nds.map((n) => (n.id === selectedNodeId ? { ...n, data: data as unknown as Record<string, unknown> } : n)));
  }

  function deleteSelectedNode() {
    setNodes((nds) => nds.filter((n) => n.id !== selectedNodeId));
    setEdges((eds) => eds.filter((e) => e.source !== selectedNodeId && e.target !== selectedNodeId));
    setSelectedNodeId(null);
  }

  function handleSave() {
    startSaving(async () => {
      try {
        await updateAutomationFlow(automation.id, {
          nodes: nodes as unknown as FlowNode[],
          edges: edges.map((e) => ({ id: e.id, source: e.source, target: e.target, sourceHandle: e.sourceHandle })),
        });
        toast.success("Automação salva");
      } catch {
        toast.error("Não foi possível salvar");
      }
    });
  }

  function handleStatusChange(value: AutomationStatus) {
    setStatus(value);
    startSaving(() => updateAutomationStatus(automation.id, value));
  }

  async function handleDelete() {
    if (!confirm("Excluir esta automação? Essa ação não pode ser desfeita.")) return;
    await deleteAutomation(automation.id);
    router.push("/dashboard/automations");
  }

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) as unknown as FlowNode | undefined;

  return (
    <div className="flex h-[calc(100vh-3.5rem-3rem)] gap-0 overflow-hidden rounded-lg border">
      <aside className="w-56 shrink-0 space-y-1 overflow-y-auto border-r bg-background p-3">
        <p className="mb-2 px-1 text-xs font-semibold uppercase text-muted-foreground">Adicionar nó</p>
        {PALETTE.map((type) => {
          const meta = NODE_META[type];
          const Icon = meta.icon;
          return (
            <button
              key={type}
              onClick={() => addNode(type)}
              className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted"
            >
              <Icon className="h-4 w-4 text-muted-foreground" />
              {meta.label}
            </button>
          );
        })}
      </aside>

      <div className="flex flex-1 flex-col">
        <div className="flex items-center justify-between gap-2 border-b bg-background px-4 py-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{automation.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <Select value={status} onValueChange={(v) => handleStatusChange(v as AutomationStatus)}>
              <SelectTrigger className="h-8 w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Rascunho</SelectItem>
                <SelectItem value="active">Ativa</SelectItem>
                <SelectItem value="paused">Pausada</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" onClick={handleSave} disabled={isSaving}>
              <Save className="h-4 w-4" />
              Salvar
            </Button>
            <Button size="sm" variant="ghost" onClick={handleDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1">
          <ReactFlowProvider>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              nodeTypes={nodeTypes}
              onNodeClick={(_, node) => setSelectedNodeId(node.id)}
              onPaneClick={() => setSelectedNodeId(null)}
              fitView
            >
              <Background />
              <Controls />
              <MiniMap pannable zoomable />
            </ReactFlow>
          </ReactFlowProvider>
        </div>
      </div>

      {selectedNode && (
        <NodePanel
          node={selectedNode}
          customFields={customFields}
          otherAutomations={otherAutomations}
          instagramAccountId={automation.instagram_account_id}
          onChange={updateSelectedNodeData}
          onDelete={deleteSelectedNode}
          onClose={() => setSelectedNodeId(null)}
        />
      )}
    </div>
  );
}
