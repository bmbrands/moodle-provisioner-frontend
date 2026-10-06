import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Package, Settings, Timer } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { LifecycleSettingsTab } from "./LifecycleSettingsTab";
import type { LifecyclePolicy } from "../services/api";
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
  lifecyclePolicy: LifecyclePolicy | null;
  onSaveLifecyclePolicy: (policy: LifecyclePolicy) => Promise<void>;
}

export function AdminSettingsModal({
  open,
  onOpenChange,
  plugins,
  onTogglePluginActive,
  onDeletePlugin,
  onAddPlugin,
  onUpdatePlugin,
  lifecyclePolicy,
  onSaveLifecyclePolicy,
}: AdminSettingsModalProps) {
  const [isAddPluginModalOpen, setIsAddPluginModalOpen] = useState(false);
  const [editingPlugin, setEditingPlugin] = useState<Plugin | null>(null);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent size="2xl" className="max-h-[90vh] shadow-2xl overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Admin Settings
            </DialogTitle>
            <DialogDescription>
              Manage the plugin catalog and system-wide settings
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="plugins" className="mt-4 flex-1 overflow-hidden flex flex-col">
            <TabsList className="flex-shrink-0">
              <TabsTrigger value="plugins">
                <Package className="h-4 w-4" />
                Plugin Catalog
              </TabsTrigger>
              <TabsTrigger value="lifecycle">
                <Timer className="h-4 w-4" />
                Lifecycle
              </TabsTrigger>
            </TabsList>

            <TabsContent value="plugins" className="mt-4 flex-1 overflow-hidden">
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
            </TabsContent>

            <TabsContent value="lifecycle" className="mt-4 flex-1 overflow-y-auto pr-1">
              <LifecycleSettingsTab policy={lifecyclePolicy} onSave={onSaveLifecyclePolicy} />
            </TabsContent>
          </Tabs>
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
