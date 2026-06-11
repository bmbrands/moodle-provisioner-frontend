import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { ScrollArea } from "./ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { UserPlus, Users, Shield, Building, Search, MoreHorizontal, Edit, Trash2, UserX } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { useState } from "react";
import { toast } from "sonner";
import type { User, Account, Role } from "../types/user";
import { defaultRoles } from "../types/user";

interface UserManagementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  users: User[];
  onUpdateUser: (user: User) => void;
  onDeleteUser: (userId: string) => void;
  onCreateUser: (user: Omit<User, 'id' | 'createdAt' | 'lastLoginAt'> & { password: string }) => void;
}

export function UserManagementModal({
  open,
  onOpenChange,
  users,
  onUpdateUser,
  onDeleteUser,
  onCreateUser
}: UserManagementModalProps) {
  const [activeTab, setActiveTab] = useState("users");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    email: "",
    firstName: "",
    lastName: "",
    accountId: "",
    password: "",
    roles: [] as Role[],
    isActive: true
  });

  const filteredUsers = (Array.isArray(users) ? users : []).filter(user =>
    user.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const handleCreateUser = () => {
    if (!newUser.email || !newUser.firstName || !newUser.lastName || newUser.roles.length === 0) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (newUser.password.length < 8) {
      toast.error("Password must be at least 8 characters long");
      return;
    }

    const account = users[0]?.account;
    onCreateUser({
      ...newUser,
      accountId: account?.id ?? newUser.accountId,
      account: account ?? {
        id: "account-default",
        name: "Boost Union",
        domain: "localhost",
        createdAt: new Date().toISOString(),
        isActive: true,
      },
    });

    setNewUser({
      email: "",
      firstName: "",
      lastName: "",
      accountId: "",
      password: "",
      roles: [],
      isActive: true
    });
    setIsCreateUserOpen(false);
  };

  const toggleUserRole = (user: User, role: Role) => {
    const hasRole = user.roles.some(r => r.id === role.id);
    const updatedRoles = hasRole
      ? user.roles.filter(r => r.id !== role.id)
      : [...user.roles, role];

    onUpdateUser({ ...user, roles: updatedRoles });
    toast.success(`Role ${hasRole ? 'removed from' : 'added to'} ${user.firstName} ${user.lastName}`);
  };

  const deactivateUser = (user: User) => {
    onUpdateUser({ ...user, isActive: false });
    toast.success(`${user.firstName} ${user.lastName} has been deactivated`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="2xl" className="max-h-[90vh] shadow-2xl overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            User Management
          </DialogTitle>
          <DialogDescription>
            Manage users, roles, and organisations permissions
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-3 flex-shrink-0">
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="roles">Roles</TabsTrigger>
            <TabsTrigger value="accounts">Organisations</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="mt-6 flex-1 flex flex-col">
            <div className="flex flex-col flex-1">
              <div className="sticky top-0 bg-background z-10 pb-4 mb-4 border-b">
                <div className="flex items-center justify-between">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search users..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Button
                    onClick={() => setIsCreateUserOpen(!isCreateUserOpen)}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add User
                  </Button>
                </div>

            {isCreateUserOpen && (
              <Card className="shadow-sm border-primary/20">
                <CardHeader>
                  <CardTitle className="text-lg">Create New User</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        value={newUser.firstName}
                        onChange={(e) => setNewUser(prev => ({ ...prev, firstName: e.target.value }))}
                        placeholder="John"
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        value={newUser.lastName}
                        onChange={(e) => setNewUser(prev => ({ ...prev, lastName: e.target.value }))}
                        placeholder="Doe"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newUser.email}
                      onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="john.doe@example.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="password">Temporary Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={newUser.password}
                      onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="At least 8 characters"
                      autoComplete="new-password"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      The user will be required to change this on first sign-in.
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="role">Role</Label>
                    <Select onValueChange={(roleId) => {
                      const role = defaultRoles.find(r => r.id === roleId);
                      if (role) {
                        setNewUser(prev => ({ ...prev, roles: [role] }));
                      }
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                      <SelectContent>
                        {defaultRoles.map(role => (
                          <SelectItem key={role.id} value={role.id}>
                            {role.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleCreateUser} className="bg-success hover:bg-success/90 text-success-foreground">
                      Create User
                    </Button>
                    <Button variant="outline" onClick={() => setIsCreateUserOpen(false)}>
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="shadow-sm">
              <CardContent className="p-0">
                <div className="overflow-y-auto">
                  <Table>
                    <TableHeader className="bg-table-header">
                      <TableRow>
                        <TableHead className="font-semibold text-table-header-foreground">User</TableHead>
                        <TableHead className="font-semibold text-table-header-foreground">Email</TableHead>
                        <TableHead className="font-semibold text-table-header-foreground">Roles</TableHead>
                        <TableHead className="font-semibold text-table-header-foreground">Status</TableHead>
                        <TableHead className="font-semibold text-table-header-foreground">Last Login</TableHead>
                        <TableHead className="text-right font-semibold text-table-header-foreground">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={user.avatar} />
                                <AvatarFallback>{getInitials(user.firstName, user.lastName)}</AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium">{user.firstName} {user.lastName}</div>
                                <div className="text-sm text-muted-foreground">{user.account.name}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {user.roles.map(role => (
                                <Badge key={role.id} variant="secondary" className="text-xs">
                                  {role.name}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={user.isActive ? "default" : "secondary"}
                                   className={user.isActive ? "bg-success text-success-foreground" : ""}>
                              {user.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(user.lastLoginAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit User
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => deactivateUser(user)} disabled={!user.isActive}>
                                  <UserX className="h-4 w-4 mr-2" />
                                  Deactivate
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => onDeleteUser(user.id)}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  </div>
              </CardContent>
            </Card>
            </div>
            </div>
          </TabsContent>

          <TabsContent value="roles" className="mt-6 flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto">
              <div className="space-y-4">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  System Roles
                </CardTitle>
                <CardDescription>
                  Manage roles and their permissions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {defaultRoles.map((role) => (
                  <div key={role.id} className="p-4 border border-border rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium">{role.name}</h4>
                          <Badge variant="outline">{role.id}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{role.description}</p>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {users.filter(u => u.roles.some(r => r.id === role.id)).length} users
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="text-xs font-medium text-muted-foreground mb-2">PERMISSIONS</div>
                      <div className="flex flex-wrap gap-1">
                        {role.permissions.map(permission => (
                          <Badge key={permission.id} variant="outline" className="text-xs">
                            {permission.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="accounts" className="mt-6 flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto">
              <div className="space-y-4">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Organisation information
                </CardTitle>
                <CardDescription>
                  View organisation details and settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                {users.length > 0 && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium">Organisation name</Label>
                        <p className="text-sm">{users[0].account.name}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Domain</Label>
                        <p className="text-sm">{users[0].account.domain}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Created</Label>
                        <p className="text-sm">{new Date(users[0].account.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Status</Label>
                        <Badge variant={users[0].account.isActive ? "default" : "secondary"}
                               className={users[0].account.isActive ? "bg-success text-success-foreground" : ""}>
                          {users[0].account.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
