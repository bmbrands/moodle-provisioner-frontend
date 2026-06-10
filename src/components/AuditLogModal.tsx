import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { ScrollArea } from "./ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Separator } from "./ui/separator";
import { Calendar } from "./ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Checkbox } from "./ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { ServerLogsPanel } from "./ServerLogsPanel";
import {
  FileText,
  Search,
  Filter,
  Download,
  Calendar as CalendarIcon,
  Clock,
  User,
  Activity,
  AlertTriangle,
  Info,
  Shield,
  Eye,
  EyeOff,
  Terminal
} from "lucide-react";
import { useState, useMemo } from "react";
// import { format } from "date-fns";
// Using built-in Date methods instead of date-fns for compatibility
const format = (date: Date, formatStr: string) => {
  if (formatStr === 'MMM dd, yyyy') {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric'
    });
  }
  if (formatStr === 'HH:mm:ss') {
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }
  if (formatStr === 'PPpp') {
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  }
  return date.toISOString();
};
import { toast } from "sonner";
import type { AuditLogEntry, AuditAction, AuditResource, AuditFilters } from "../types/audit";
import { auditActionLabels, auditResourceLabels, getSeverityColor } from "../types/audit";

interface AuditLogModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  auditLogs: AuditLogEntry[];
  onExportLogs: (logs: AuditLogEntry[]) => void;
}

export function AuditLogModal({ open, onOpenChange, auditLogs, onExportLogs }: AuditLogModalProps) {
  const [filters, setFilters] = useState<Partial<AuditFilters>>({
    searchQuery: "",
    actions: [],
    resources: [],
    severity: [],
    users: []
  });
  const [showFilters, setShowFilters] = useState(false);
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [selectedEntry, setSelectedEntry] = useState<AuditLogEntry | null>(null);
  const [activeTab, setActiveTab] = useState<"activity" | "server">("activity");

  const filteredLogs = useMemo(() => {
    return auditLogs.filter(log => {
      // Search query filter
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        const matchesSearch = (
          log.userName.toLowerCase().includes(query) ||
          log.action.toLowerCase().includes(query) ||
          log.resource.toLowerCase().includes(query) ||
          (log.resourceName && log.resourceName.toLowerCase().includes(query)) ||
          JSON.stringify(log.details).toLowerCase().includes(query)
        );
        if (!matchesSearch) return false;
      }

      // Actions filter
      if (filters.actions && filters.actions.length > 0) {
        if (!filters.actions.includes(log.action)) return false;
      }

      // Resources filter
      if (filters.resources && filters.resources.length > 0) {
        if (!filters.resources.includes(log.resource)) return false;
      }

      // Severity filter
      if (filters.severity && filters.severity.length > 0) {
        if (!filters.severity.includes(log.severity)) return false;
      }

      // Users filter
      if (filters.users && filters.users.length > 0) {
        if (!filters.users.includes(log.userId)) return false;
      }

      // Date range filter
      if (dateRange.from || dateRange.to) {
        const logDate = new Date(log.timestamp);
        if (dateRange.from && logDate < dateRange.from) return false;
        if (dateRange.to && logDate > dateRange.to) return false;
      }

      return true;
    });
  }, [auditLogs, filters, dateRange]);

  const clearFilters = () => {
    setFilters({
      searchQuery: "",
      actions: [],
      resources: [],
      severity: [],
      users: []
    });
    setDateRange({});
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return {
      date: format(date, 'MMM dd, yyyy'),
      time: format(date, 'HH:mm:ss')
    };
  };

  const getSeverityIcon = (severity: AuditLogEntry['severity']) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case 'high': return <AlertTriangle className="h-4 w-4 text-secondary" />;
      case 'medium': return <Info className="h-4 w-4 text-primary" />;
      case 'low': return <Info className="h-4 w-4 text-muted-foreground" />;
      default: return <Info className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getActionIcon = (action: AuditAction) => {
    switch (action) {
      case 'login':
      case 'logout': return <User className="h-4 w-4" />;
      case 'view': return <Eye className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const uniqueUsers = Array.from(new Set(auditLogs.map(log => ({ id: log.userId, name: log.userName }))));
  const uniqueActions = Array.from(new Set(auditLogs.map(log => log.action)));
  const uniqueResources = Array.from(new Set(auditLogs.map(log => log.resource)));
  const severityOptions = ['low', 'medium', 'high', 'critical'] as const;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="2xl" className="max-h-[90vh] shadow-2xl overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Activity Audit Log
          </DialogTitle>
          <DialogDescription>
            Track and monitor all system activities and user actions
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "activity" | "server")}
          className="flex-1 overflow-hidden flex flex-col"
        >
          <TabsList className="flex-shrink-0">
            <TabsTrigger value="activity" className="gap-2">
              <Activity className="h-4 w-4" />
              Activity Log
            </TabsTrigger>
            <TabsTrigger value="server" className="gap-2">
              <Terminal className="h-4 w-4" />
              Server Logs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="activity" className="flex-1 overflow-y-auto mt-3">
          <div className="space-y-4">
          {/* Search and Filter Controls */}
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search activities..."
                value={filters.searchQuery || ""}
                onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2"
              >
                <Filter className="h-4 w-4" />
                {showFilters ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                Filters
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onExportLogs(filteredLogs)}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export ({filteredLogs.length})
              </Button>
            </div>
          </div>

          {/* Advanced Filters Panel */}
          {showFilters && (
            <Card className="shadow-sm border-primary/20">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Advanced Filters</CardTitle>
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    Clear All
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Date Range */}
                  <div className="space-y-2">
                    <Label className="text-sm">Date Range</Label>
                    <div className="flex gap-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className="justify-start text-xs">
                            <CalendarIcon className="h-3 w-3 mr-1" />
                            {dateRange.from ? format(dateRange.from, 'MMM dd') : 'From'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={dateRange.from}
                            onSelect={(date) => setDateRange(prev => ({ ...prev, from: date }))}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className="justify-start text-xs">
                            <CalendarIcon className="h-3 w-3 mr-1" />
                            {dateRange.to ? format(dateRange.to, 'MMM dd') : 'To'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={dateRange.to}
                            onSelect={(date) => setDateRange(prev => ({ ...prev, to: date }))}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  {/* Users Filter */}
                  <div className="space-y-2">
                    <Label className="text-sm">Users ({filters.users?.length || 0})</Label>
                    <Select onValueChange={(userId) => {
                      if (!filters.users?.includes(userId)) {
                        setFilters(prev => ({
                          ...prev,
                          users: [...(prev.users || []), userId]
                        }));
                      }
                    }}>
                      <SelectTrigger className="text-xs">
                        <SelectValue placeholder="Select users" />
                      </SelectTrigger>
                      <SelectContent>
                        {uniqueUsers.map(user => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {filters.users && filters.users.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {filters.users.map(userId => {
                          const user = uniqueUsers.find(u => u.id === userId);
                          return (
                            <Badge
                              key={userId}
                              variant="secondary"
                              className="text-xs cursor-pointer"
                              onClick={() => setFilters(prev => ({
                                ...prev,
                                users: prev.users?.filter(id => id !== userId)
                              }))}
                            >
                              {user?.name} ×
                            </Badge>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Actions Filter */}
                  <div className="space-y-2">
                    <Label className="text-sm">Actions ({filters.actions?.length || 0})</Label>
                    <div className="space-y-1 max-h-24 overflow-y-auto">
                      {uniqueActions.map(action => (
                        <div key={action} className="flex items-center space-x-2">
                          <Checkbox
                            id={`action-${action}`}
                            checked={filters.actions?.includes(action) || false}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setFilters(prev => ({
                                  ...prev,
                                  actions: [...(prev.actions || []), action]
                                }));
                              } else {
                                setFilters(prev => ({
                                  ...prev,
                                  actions: prev.actions?.filter(a => a !== action)
                                }));
                              }
                            }}
                          />
                          <Label htmlFor={`action-${action}`} className="text-xs">
                            {auditActionLabels[action]}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Severity Filter */}
                  <div className="space-y-2">
                    <Label className="text-sm">Severity ({filters.severity?.length || 0})</Label>
                    <div className="space-y-1">
                      {severityOptions.map(severity => (
                        <div key={severity} className="flex items-center space-x-2">
                          <Checkbox
                            id={`severity-${severity}`}
                            checked={filters.severity?.includes(severity) || false}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setFilters(prev => ({
                                  ...prev,
                                  severity: [...(prev.severity || []), severity]
                                }));
                              } else {
                                setFilters(prev => ({
                                  ...prev,
                                  severity: prev.severity?.filter(s => s !== severity)
                                }));
                              }
                            }}
                          />
                          <Label htmlFor={`severity-${severity}`} className="text-xs capitalize">
                            {severity}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Activity Log Table */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Activity Log</CardTitle>
                  <CardDescription>
                    Showing {filteredLogs.length} of {auditLogs.length} activities
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[60vh] overflow-y-auto">
                <Table>
                  <TableHeader className="bg-table-header">
                    <TableRow>
                      <TableHead className="font-semibold text-table-header-foreground">Timestamp</TableHead>
                      <TableHead className="font-semibold text-table-header-foreground">User</TableHead>
                      <TableHead className="font-semibold text-table-header-foreground">Action</TableHead>
                      <TableHead className="font-semibold text-table-header-foreground">Resource</TableHead>
                      <TableHead className="font-semibold text-table-header-foreground">Details</TableHead>
                      <TableHead className="font-semibold text-table-header-foreground">Severity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log) => {
                      const timestamp = formatTimestamp(log.timestamp);
                      return (
                        <TableRow
                          key={log.id}
                          className="cursor-pointer hover:bg-accent/50"
                          onClick={() => setSelectedEntry(log)}
                        >
                          <TableCell>
                            <div className="space-y-1">
                              <div className="text-sm font-medium">{timestamp.date}</div>
                              <div className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {timestamp.time}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="text-sm font-medium">{log.userName}</div>
                              <div className="text-xs text-muted-foreground">{log.userEmail}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getActionIcon(log.action)}
                              <Badge variant="outline" className="text-xs">
                                {auditActionLabels[log.action]}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="text-sm font-medium">{auditResourceLabels[log.resource]}</div>
                              {log.resourceName && (
                                <div className="text-xs text-muted-foreground">{log.resourceName}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-xs text-muted-foreground max-w-48 truncate">
                              {Object.keys(log.details).length > 0
                                ? JSON.stringify(log.details).substring(0, 50) + '...'
                                : 'No additional details'
                              }
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getSeverityIcon(log.severity)}
                              <Badge
                                variant={getSeverityColor(log.severity)}
                                className="text-xs capitalize"
                              >
                                {log.severity}
                              </Badge>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Entry Modal */}
          {selectedEntry && (
            <Dialog open={!!selectedEntry} onOpenChange={() => setSelectedEntry(null)}>
              <DialogContent className="max-w-2xl shadow-2xl">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    {getActionIcon(selectedEntry.action)}
                    Activity Details
                  </DialogTitle>
                  <DialogDescription>
                    Detailed information for this audit log entry
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">User</Label>
                      <div className="p-2 text-sm">
                        <div className="font-medium">{selectedEntry.userName}</div>
                        <div className="text-muted-foreground">{selectedEntry.userEmail}</div>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Timestamp</Label>
                      <div className="p-2 text-sm">
                        {format(new Date(selectedEntry.timestamp), 'PPpp')}
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Action</Label>
                      <div className="p-2">
                        <Badge variant="outline">{auditActionLabels[selectedEntry.action]}</Badge>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Resource</Label>
                      <div className="p-2 text-sm">
                        <div>{auditResourceLabels[selectedEntry.resource]}</div>
                        {selectedEntry.resourceName && (
                          <div className="text-muted-foreground">{selectedEntry.resourceName}</div>
                        )}
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Severity</Label>
                      <div className="p-2">
                        <div className="flex items-center gap-2">
                          {getSeverityIcon(selectedEntry.severity)}
                          <Badge variant={getSeverityColor(selectedEntry.severity)}>
                            {selectedEntry.severity}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">IP Address</Label>
                      <div className="p-2 text-sm font-mono">{selectedEntry.ipAddress}</div>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <Label className="text-sm font-medium">Additional Details</Label>
                    <div className="mt-2 p-3 bg-muted rounded-md">
                      <pre className="text-xs whitespace-pre-wrap">
                        {JSON.stringify(selectedEntry.details, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
        </TabsContent>

          <TabsContent value="server" className="flex-1 overflow-y-auto mt-3">
            <ServerLogsPanel active={open && activeTab === "server"} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
