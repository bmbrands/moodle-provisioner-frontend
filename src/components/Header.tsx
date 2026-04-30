import { Settings, Activity, Users, FileText } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { UserAvatar } from "./UserAvatar";
import type { User } from "../types/user";

interface HeaderProps {
  currentUser: User | null;
  onOpenHostMetrics: () => void;
  onOpenAdminSettings: () => void;
  onOpenUserManagement: () => void;
  onOpenAuditLog: () => void;
  onOpenUserProfile: () => void;
  onLogout: () => void;
  canAccessAdminSettings: boolean;
  canViewMetrics: boolean;
  canManageUsers: boolean;
  canViewAuditLog: boolean;
}

export function Header({
  currentUser,
  onOpenHostMetrics,
  onOpenAdminSettings,
  onOpenUserManagement,
  onOpenAuditLog,
  onOpenUserProfile,
  onLogout,
  canAccessAdminSettings,
  canViewMetrics,
  canManageUsers,
  canViewAuditLog
}: HeaderProps) {
  return (
    <div className="shadow-md rounded-lg mb-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Moodle Provisioner</h1>
              <p className="text-muted-foreground">
                Manage test environments for Moodle plugin development
              </p>
            </div>
            <nav className="flex items-center gap-4">
              {canViewMetrics && (
                <Button
                  variant="ghost"
                  className="flex items-center gap-2 hover:bg-accent hover:text-accent-foreground"
                  onClick={onOpenHostMetrics}
                >
                  <Activity className="h-4 w-4" />
                  Host Metrics
                </Button>
              )}
              {canManageUsers && (
                <Button
                  variant="ghost"
                  className="flex items-center gap-2 hover:bg-accent hover:text-accent-foreground"
                  onClick={onOpenUserManagement}
                >
                  <Users className="h-4 w-4" />
                  Users
                </Button>
              )}
              {canViewAuditLog && (
                <Button
                  variant="ghost"
                  className="flex items-center gap-2 hover:bg-accent hover:text-accent-foreground"
                  onClick={onOpenAuditLog}
                >
                  <FileText className="h-4 w-4" />
                  Audit Log
                </Button>
              )}
              {canAccessAdminSettings && (
                <Button
                  variant="ghost"
                  className="flex items-center gap-2 hover:bg-accent hover:text-accent-foreground"
                  onClick={onOpenAdminSettings}
                >
                  <Settings className="h-4 w-4" />
                  Admin Settings
                </Button>
              )}
              {currentUser && (
                <UserAvatar
                  user={currentUser}
                  onOpenProfile={onOpenUserProfile}
                  onLogout={onLogout}
                />
              )}
            </nav>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
