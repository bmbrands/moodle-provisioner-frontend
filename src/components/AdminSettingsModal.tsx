import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Package } from "lucide-react";
import { useState } from "react";
import { PluginCatalogTable } from "./PluginCatalogTable";
import { AddPluginModal } from "./AddPluginModal";
import type { Plugin } from "../types/plugin";

interface AdminSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plugins: Plugin[];
  onTogglePluginActive: (pluginId: string) => void;
  onDeletePlugin: (pluginId: string) => void;
  onAddPlugin: (plugin: Omit<Plugin, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdatePlugin?: (
    pluginId: string,
    updates: Partial<Omit<Plugin, 'id' | 'createdAt' | 'updatedAt'>>
  ) => void;
}

export function AdminSettingsModal({
  open,
  onOpenChange,
  plugins,
  onTogglePluginActive,
  onDeletePlugin,
  onAddPlugin,
  onUpdatePlugin
}: AdminSettingsModalProps) {
  const [isAddPluginModalOpen, setIsAddPluginModalOpen] = useState(false);
  const [editingPlugin, setEditingPlugin] = useState<Plugin | null>(null);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent size="2xl" className="max-h-[90vh] shadow-2xl overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Plugin Catalog
            </DialogTitle>
            <DialogDescription>
              Manage the plugin catalog
            </DialogDescription>
          </DialogHeader>

          <div className="mt-6 flex-1 overflow-hidden">
            <PluginCatalogTable
              plugins={plugins}
              onToggleActive={onTogglePluginActive}
              onDeletePlugin={onDeletePlugin}
              onAddPlugin={() => {
                setEditingPlugin(null);
                setIsAddPluginModalOpen(true);
              }}
              onEditPlugin={(plugin) => {
                setEditingPlugin(plugin);
                setIsAddPluginModalOpen(true);
              }}
            />
          </div>
        </DialogContent>
      </Dialog>

      <AddPluginModal
        open={isAddPluginModalOpen}
        onOpenChange={(open) => {
          setIsAddPluginModalOpen(open);
          if (!open) setEditingPlugin(null);
        }}
        onAddPlugin={onAddPlugin}
        editingPlugin={editingPlugin}
        onUpdatePlugin={onUpdatePlugin}
      />
    </>
  );
}
