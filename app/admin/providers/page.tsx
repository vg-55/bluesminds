"use client";

import { useState, useEffect } from "react";
import { AdminRoute } from "@/components/admin-route";
import { AdminLayout } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Boxes,
  Plus,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  Edit2,
  Trash2,
  X,
} from "lucide-react";

interface Provider {
  id: string;
  name: string;
  base_url: string;
  api_key?: string;
  health_status: "healthy" | "degraded" | "unhealthy" | "unknown";
  is_active: boolean;
  priority: number;
  weight: number;
  max_concurrent_requests: number;
  total_requests: number;
  failed_requests: number;
  avg_response_time_ms: number;
  last_health_check_at: string | null;
  supported_models: string[];
}

interface ProviderFormData {
  name: string;
  base_url: string;
  api_key?: string;
  priority: number;
  weight: number;
  max_concurrent_requests: number;
  is_active: boolean;
  supported_models: string;
}

export default function AdminProvidersPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);
  const [saving, setSaving] = useState(false);
  const [fetchingModels, setFetchingModels] = useState(false);
  const [checkingHealth, setCheckingHealth] = useState(false);
  const [formData, setFormData] = useState<ProviderFormData>({
    name: "",
    base_url: "",
    api_key: "",
    priority: 1,
    weight: 1,
    max_concurrent_requests: 100,
    is_active: true,
    supported_models: "",
  });

  useEffect(() => {
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/admin/servers');

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to fetch providers');
      }

      const data = await response.json();
      setProviders(data.data || []);
    } catch (err) {
      console.error('Error fetching providers:', err);
      setError(err instanceof Error ? err.message : 'Failed to load providers');
    } finally {
      setLoading(false);
    }
  };

  const fetchModelsFromServer = async () => {
    if (!formData.base_url) {
      alert('Please enter a Base URL first');
      return;
    }

    setFetchingModels(true);
    try {
      // Use our proxy API to fetch models (avoids CSP issues)
      const response = await fetch('/api/admin/fetch-models', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          base_url: formData.base_url,
          api_key: formData.api_key || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch models');
      }

      const data = await response.json();
      const models = data.models || [];

      if (models.length === 0) {
        alert('No models found. Please enter them manually.');
        return;
      }

      setFormData({
        ...formData,
        supported_models: models.join(', '),
      });

      alert(`Successfully fetched ${models.length} models!`);
    } catch (err) {
      console.error('Error fetching models:', err);
      alert(
        err instanceof Error
          ? err.message
          : 'Failed to fetch models. Please ensure the server URL is correct and accessible.'
      );
    } finally {
      setFetchingModels(false);
    }
  };

  const openAddModal = () => {
    setEditingProvider(null);
    setFormData({
      name: "",
      base_url: "",
      api_key: "",
      priority: 1,
      weight: 1,
      max_concurrent_requests: 100,
      is_active: true,
      supported_models: "",
    });
    setShowModal(true);
  };

  const openEditModal = (provider: Provider) => {
    setEditingProvider(provider);
    setFormData({
      name: provider.name,
      base_url: provider.base_url,
      api_key: provider.api_key || "",
      priority: provider.priority,
      weight: provider.weight,
      max_concurrent_requests: provider.max_concurrent_requests,
      is_active: provider.is_active,
      supported_models: provider.supported_models.join(", "),
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const payload = {
        ...formData,
        supported_models: formData.supported_models
          .split(",")
          .map((m) => m.trim())
          .filter((m) => m),
      };

      const url = '/api/admin/servers';
      const method = editingProvider ? 'PATCH' : 'POST';
      const body = editingProvider
        ? { id: editingProvider.id, ...payload }
        : payload;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to save provider');
      }

      setShowModal(false);
      fetchProviders();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save provider');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this provider?")) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/servers?id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete provider');
      }

      fetchProviders();
    } catch (err) {
      alert('Failed to delete provider');
    }
  };

  const toggleActive = async (provider: Provider) => {
    try {
      const response = await fetch('/api/admin/servers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: provider.id,
          is_active: !provider.is_active,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update provider');
      }

      fetchProviders();
    } catch (err) {
      alert('Failed to update provider');
    }
  };

  const runHealthCheck = async (providerId?: string) => {
    setCheckingHealth(true);
    try {
      const response = await fetch('/api/admin/health-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serverId: providerId }),
      });

      if (!response.ok) {
        throw new Error('Failed to run health check');
      }

      const data = await response.json();
      alert(
        `Health check completed!\nChecked: ${data.checked} server(s)\n\n` +
        data.results
          .map((r: any) => `${r.name}: ${r.status} (${r.responseTime}ms)`)
          .join('\n')
      );

      fetchProviders();
    } catch (err) {
      alert('Failed to run health check');
    } finally {
      setCheckingHealth(false);
    }
  };

  const formatLastChecked = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <AdminRoute>
        <AdminLayout>
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
              <p className="font-mono text-sm text-foreground/60">
                Loading providers...
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
              onClick={fetchProviders}
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
                LiteLLM <i className="font-light">Providers</i>
              </h1>
              <p className="font-mono text-sm text-foreground/60">
                Manage LiteLLM server pool and load balancing
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="font-mono"
                onClick={() => runHealthCheck()}
                disabled={checkingHealth || providers.length === 0}
              >
                {checkingHealth ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Check All Health
                  </>
                )}
              </Button>
              <Button className="font-mono" onClick={openAddModal}>
                <Plus className="w-4 h-4 mr-2" />
                Add Provider
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="p-4 rounded-lg border border-foreground/10 bg-foreground/[0.02]">
              <p className="font-mono text-sm text-foreground/60 mb-1">
                Total Providers
              </p>
              <p className="font-mono text-2xl font-semibold">
                {providers.length}
              </p>
            </div>
            <div className="p-4 rounded-lg border border-foreground/10 bg-foreground/[0.02]">
              <p className="font-mono text-sm text-foreground/60 mb-1">
                Active
              </p>
              <p className="font-mono text-2xl font-semibold">
                {providers.filter((p) => p.is_active).length}
              </p>
            </div>
            <div className="p-4 rounded-lg border border-foreground/10 bg-foreground/[0.02]">
              <p className="font-mono text-sm text-foreground/60 mb-1">
                Healthy
              </p>
              <p className="font-mono text-2xl font-semibold">
                {providers.filter((p) => p.health_status === "healthy").length}
              </p>
            </div>
            <div className="p-4 rounded-lg border border-foreground/10 bg-foreground/[0.02]">
              <p className="font-mono text-sm text-foreground/60 mb-1">
                Total Requests
              </p>
              <p className="font-mono text-2xl font-semibold">
                {providers.reduce((sum, p) => sum + p.total_requests, 0).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Providers List */}
          {providers.length > 0 ? (
            <div className="space-y-4">
              {providers.map((provider) => (
                <div
                  key={provider.id}
                  className="p-6 rounded-lg border border-foreground/10 bg-foreground/[0.02]"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-mono text-lg font-semibold">
                          {provider.name}
                        </h3>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full font-mono text-xs ${
                            provider.is_active
                              ? "bg-green-500/10 text-green-500"
                              : "bg-gray-500/10 text-gray-500"
                          }`}
                        >
                          {provider.is_active ? (
                            <CheckCircle2 className="w-3 h-3" />
                          ) : (
                            <XCircle className="w-3 h-3" />
                          )}
                          {provider.is_active ? "Active" : "Inactive"}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full font-mono text-xs ${
                            provider.health_status === "healthy"
                              ? "bg-green-500/10 text-green-500"
                              : provider.health_status === "degraded"
                              ? "bg-yellow-500/10 text-yellow-500"
                              : provider.health_status === "unhealthy"
                              ? "bg-red-500/10 text-red-500"
                              : "bg-gray-500/10 text-gray-500"
                          }`}
                        >
                          {provider.health_status}
                        </span>
                      </div>
                      <p className="font-mono text-sm text-foreground/60 mb-2">
                        {provider.base_url}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => runHealthCheck(provider.id)}
                        disabled={checkingHealth}
                        className="p-2 hover:bg-foreground/5 rounded-lg transition-colors disabled:opacity-50"
                        title="Check Health"
                      >
                        {checkingHealth ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 text-blue-500" />
                        )}
                      </button>
                      <button
                        onClick={() => toggleActive(provider)}
                        className="p-2 hover:bg-foreground/5 rounded-lg transition-colors"
                        title={provider.is_active ? "Deactivate" : "Activate"}
                      >
                        {provider.is_active ? (
                          <XCircle className="w-4 h-4 text-gray-500" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        )}
                      </button>
                      <button
                        onClick={() => openEditModal(provider)}
                        className="p-2 hover:bg-foreground/5 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4 text-primary" />
                      </button>
                      <button
                        onClick={() => handleDelete(provider.id)}
                        className="p-2 hover:bg-foreground/5 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div>
                      <p className="font-mono text-xs text-foreground/60 mb-1">
                        Priority
                      </p>
                      <p className="font-mono text-sm font-semibold">
                        {provider.priority}
                      </p>
                    </div>
                    <div>
                      <p className="font-mono text-xs text-foreground/60 mb-1">
                        Weight
                      </p>
                      <p className="font-mono text-sm font-semibold">
                        {provider.weight}
                      </p>
                    </div>
                    <div>
                      <p className="font-mono text-xs text-foreground/60 mb-1">
                        Total Requests
                      </p>
                      <p className="font-mono text-sm font-semibold">
                        {provider.total_requests.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="font-mono text-xs text-foreground/60 mb-1">
                        Failed
                      </p>
                      <p className="font-mono text-sm font-semibold text-red-500">
                        {provider.failed_requests.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="font-mono text-xs text-foreground/60 mb-1">
                        Avg Response
                      </p>
                      <p className="font-mono text-sm font-semibold">
                        {provider.avg_response_time_ms}ms
                      </p>
                    </div>
                  </div>

                  {provider.supported_models.length > 0 && (
                    <div className="mt-4">
                      <p className="font-mono text-xs text-foreground/60 mb-2">
                        Supported Models:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {provider.supported_models.map((model) => (
                          <span
                            key={model}
                            className="px-2 py-1 rounded-full bg-primary/10 text-primary font-mono text-xs"
                          >
                            {model}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-4 pt-4 border-t border-foreground/10">
                    <p className="font-mono text-xs text-foreground/60">
                      Last health check: {formatLastChecked(provider.last_health_check_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 rounded-lg border border-foreground/10 bg-foreground/[0.02]">
              <Boxes className="w-12 h-12 text-foreground/20 mx-auto mb-4" />
              <p className="font-mono text-sm text-foreground/60 mb-4">
                No LiteLLM providers configured
              </p>
              <Button className="font-mono" onClick={openAddModal}>
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Provider
              </Button>
            </div>
          )}
        </div>

        {/* Add/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-background rounded-lg border border-foreground/10 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-foreground/10 flex items-center justify-between sticky top-0 bg-background">
                <h2 className="text-xl font-mono font-semibold">
                  {editingProvider ? "Edit Provider" : "Add New Provider"}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-foreground/5 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <Label htmlFor="name" className="font-mono">
                    Provider Name *
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="OpenAI, Anthropic, etc."
                    required
                    className="font-mono"
                  />
                </div>

                <div>
                  <Label htmlFor="base_url" className="font-mono">
                    Base URL *
                  </Label>
                  <Input
                    id="base_url"
                    value={formData.base_url}
                    onChange={(e) =>
                      setFormData({ ...formData, base_url: e.target.value })
                    }
                    placeholder="http://localhost:4000"
                    required
                    className="font-mono"
                  />
                </div>

                <div>
                  <Label htmlFor="api_key" className="font-mono">
                    API Key (optional)
                  </Label>
                  <Input
                    id="api_key"
                    type="password"
                    value={formData.api_key}
                    onChange={(e) =>
                      setFormData({ ...formData, api_key: e.target.value })
                    }
                    placeholder="sk-..."
                    className="font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="priority" className="font-mono">
                      Priority
                    </Label>
                    <Input
                      id="priority"
                      type="number"
                      min="1"
                      value={formData.priority}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          priority: parseInt(e.target.value),
                        })
                      }
                      className="font-mono"
                    />
                    <p className="text-xs text-foreground/60 mt-1 font-mono">
                      Lower = higher priority
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="weight" className="font-mono">
                      Weight
                    </Label>
                    <Input
                      id="weight"
                      type="number"
                      min="1"
                      value={formData.weight}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          weight: parseInt(e.target.value),
                        })
                      }
                      className="font-mono"
                    />
                    <p className="text-xs text-foreground/60 mt-1 font-mono">
                      For load balancing
                    </p>
                  </div>
                </div>

                <div>
                  <Label htmlFor="max_concurrent_requests" className="font-mono">
                    Max Concurrent Requests
                  </Label>
                  <Input
                    id="max_concurrent_requests"
                    type="number"
                    min="1"
                    value={formData.max_concurrent_requests}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        max_concurrent_requests: parseInt(e.target.value),
                      })
                    }
                    className="font-mono"
                  />
                </div>

                <div>
                  <Label htmlFor="supported_models" className="font-mono">
                    Supported Models
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="supported_models"
                      value={formData.supported_models}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          supported_models: e.target.value,
                        })
                      }
                      placeholder="gpt-4, gpt-3.5-turbo, claude-3-opus"
                      className="font-mono flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={fetchModelsFromServer}
                      disabled={fetchingModels || !formData.base_url}
                      className="font-mono whitespace-nowrap"
                    >
                      {fetchingModels ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Fetching...
                        </>
                      ) : (
                        'Auto-Fetch'
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-foreground/60 mt-1 font-mono">
                    Comma-separated list or click Auto-Fetch to detect from server
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) =>
                      setFormData({ ...formData, is_active: e.target.checked })
                    }
                    className="rounded"
                  />
                  <Label htmlFor="is_active" className="font-mono cursor-pointer">
                    Active
                  </Label>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="submit"
                    disabled={saving}
                    className="flex-1 font-mono"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>{editingProvider ? "Update" : "Create"} Provider</>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowModal(false)}
                    disabled={saving}
                    className="font-mono"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </AdminLayout>
    </AdminRoute>
  );
}
