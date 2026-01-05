"use client";

import { useState, useEffect } from "react";
import { AdminRoute } from "@/components/admin-route";
import { AdminLayout } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import {
  Users,
  Search,
  Ban,
  CheckCircle2,
  Loader2,
  AlertCircle,
} from "lucide-react";

interface User {
  id: string;
  email: string;
  full_name: string | null;
  tier: "free" | "starter" | "pro" | "enterprise";
  status: "active" | "suspended" | "deleted";
  role: "user" | "admin";
  created_at: string;
  credits_balance: number;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/users');

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      // Filter out deleted users
      setUsers(data.users.filter((u: User) => u.status !== 'deleted'));
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.full_name && user.full_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const toggleUserStatus = async (userId: string, currentStatus: string) => {
    try {
      setUpdatingUserId(userId);
      const newStatus = currentStatus === "active" ? "suspended" : "active";

      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update user status');
      }

      // Update local state
      setUsers(
        users.map((user) =>
          user.id === userId
            ? { ...user, status: newStatus as "active" | "suspended" | "deleted" }
            : user
        )
      );
    } catch (err) {
      console.error('Error updating user:', err);
      alert('Failed to update user status');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const deleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
      return;
    }

    try {
      setUpdatingUserId(userId);
      const response = await fetch(`/api/admin/users?userId=${userId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete user');
      }

      // Remove from local state
      setUsers(users.filter((user) => user.id !== userId));
    } catch (err) {
      console.error('Error deleting user:', err);
      alert('Failed to delete user');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <AdminRoute>
        <AdminLayout>
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
              <p className="font-mono text-sm text-foreground/60">
                Loading users...
              </p>
            </div>
          </div>
        </AdminLayout>
      </AdminRoute>
    );
  }

  if (error) {
    return (
      <AdminRoute>
        <AdminLayout>
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="font-mono text-sm text-red-500 mb-4">{error}</p>
            <button
              onClick={fetchUsers}
              className="px-4 py-2 bg-primary text-background rounded-lg font-mono text-sm"
            >
              Retry
            </button>
          </div>
        </AdminLayout>
      </AdminRoute>
    );
  }

  return (
    <AdminRoute>
      <AdminLayout>
        <div className="space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-sentient mb-2">
                User <i className="font-light">Management</i>
              </h1>
              <p className="font-mono text-sm text-foreground/60">
                Manage all user accounts and permissions
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="p-4 rounded-lg border border-foreground/10 bg-foreground/[0.02]">
              <p className="font-mono text-sm text-foreground/60 mb-1">
                Total Users
              </p>
              <p className="font-mono text-2xl font-semibold">
                {users.length}
              </p>
            </div>
            <div className="p-4 rounded-lg border border-foreground/10 bg-foreground/[0.02]">
              <p className="font-mono text-sm text-foreground/60 mb-1">
                Active Users
              </p>
              <p className="font-mono text-2xl font-semibold">
                {users.filter((u) => u.status === "active").length}
              </p>
            </div>
            <div className="p-4 rounded-lg border border-foreground/10 bg-foreground/[0.02]">
              <p className="font-mono text-sm text-foreground/60 mb-1">
                Suspended
              </p>
              <p className="font-mono text-2xl font-semibold">
                {users.filter((u) => u.status === "suspended").length}
              </p>
            </div>
            <div className="p-4 rounded-lg border border-foreground/10 bg-foreground/[0.02]">
              <p className="font-mono text-sm text-foreground/60 mb-1">
                Admins
              </p>
              <p className="font-mono text-2xl font-semibold">
                {users.filter((u) => u.role === "admin").length}
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/60" />
            <input
              type="text"
              placeholder="Search users by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-lg bg-foreground/[0.02] border border-foreground/10 focus:border-primary focus:outline-none font-mono text-sm transition-colors"
            />
          </div>

          {/* Users Table */}
          {filteredUsers.length > 0 ? (
            <div className="rounded-lg border border-foreground/10 bg-foreground/[0.02] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-foreground/10">
                    <tr>
                      <th className="text-left py-4 px-6 font-mono text-sm uppercase tracking-wide text-foreground/60">
                        User
                      </th>
                      <th className="text-left py-4 px-6 font-mono text-sm uppercase tracking-wide text-foreground/60">
                        Tier
                      </th>
                      <th className="text-left py-4 px-6 font-mono text-sm uppercase tracking-wide text-foreground/60">
                        Role
                      </th>
                      <th className="text-left py-4 px-6 font-mono text-sm uppercase tracking-wide text-foreground/60">
                        Status
                      </th>
                      <th className="text-left py-4 px-6 font-mono text-sm uppercase tracking-wide text-foreground/60">
                        Credits
                      </th>
                      <th className="text-left py-4 px-6 font-mono text-sm uppercase tracking-wide text-foreground/60">
                        Joined
                      </th>
                      <th className="text-right py-4 px-6 font-mono text-sm uppercase tracking-wide text-foreground/60">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => (
                      <tr
                        key={user.id}
                        className="border-b border-foreground/10 last:border-0 hover:bg-foreground/5"
                      >
                        <td className="py-4 px-6">
                          <div>
                            <p className="font-mono text-sm font-medium">
                              {user.full_name || 'No name'}
                            </p>
                            <p className="font-mono text-xs text-foreground/60">
                              {user.email}
                            </p>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className="font-mono text-sm text-primary capitalize">
                            {user.tier}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`font-mono text-xs px-2 py-1 rounded-full ${
                            user.role === 'admin'
                              ? 'bg-purple-500/10 text-purple-500'
                              : 'bg-blue-500/10 text-blue-500'
                          }`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full font-mono text-xs ${
                              user.status === "active"
                                ? "bg-green-500/10 text-green-500"
                                : "bg-red-500/10 text-red-500"
                            }`}
                          >
                            {user.status === "active" ? (
                              <CheckCircle2 className="w-3 h-3" />
                            ) : (
                              <Ban className="w-3 h-3" />
                            )}
                            {user.status}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <span className="font-mono text-sm">
                            {user.credits_balance.toFixed(2)}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <span className="font-mono text-sm text-foreground/60">
                            {formatDate(user.created_at)}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => toggleUserStatus(user.id, user.status)}
                              disabled={updatingUserId === user.id}
                              className="p-2 hover:bg-foreground/5 rounded-lg transition-colors disabled:opacity-50"
                              title={
                                user.status === "active"
                                  ? "Suspend user"
                                  : "Activate user"
                              }
                            >
                              {updatingUserId === user.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : user.status === "active" ? (
                                <Ban className="w-4 h-4 text-red-500" />
                              ) : (
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 rounded-lg border border-foreground/10 bg-foreground/[0.02]">
              <Users className="w-12 h-12 text-foreground/20 mx-auto mb-4" />
              <p className="font-mono text-sm text-foreground/60">
                {searchQuery ? 'No users found matching your search' : 'No users yet'}
              </p>
            </div>
          )}
        </div>
      </AdminLayout>
    </AdminRoute>
  );
}
