"use client";

import { useState, useEffect } from "react";
import { AdminRoute } from "@/components/admin-route";
import { AdminLayout } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Brain,
  Plus,
  Edit2,
  Trash2,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  GitBranch,
  Info,
} from "lucide-react";

interface Provider {
  id: string;
  name: string;
  base_url: string;
}

interface CustomModel {
  id: string;
  custom_name: string;
  provider_id: string;
  actual_model_name: string;
  display_name: string;
  description: string | null;
  priority: number;
  weight: number;
  is_active: boolean;
  created_at: string;
  provider?: Provider & { health_status?: string };
}

interface ModelFormData {
  custom_name: string;
  provider_id: string;
  actual_model_name: string;
  display_name: string;
  description: string;
  priority: number;
  weight: number;
  is_active: boolean;
}

export default function AdminModelsPage() {
  const [models, setModels] = useState<CustomModel[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingModel, setEditingModel] = useState<CustomModel | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<ModelFormData>({
    custom_name: "",
    provider_id: "",
    actual_model_name: "",
    display_name: "",
    description: "",
    priority: 100,
    weight: 1.0,
    is_active: true,
  });

  useEffect(() => {
    Promise.all([fetchModels(), fetchProviders()]);
  }, []);

  const fetchModels = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/admin/models');

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch models');
      }

      const data = await response.json();
      setModels(data.data || []);
    } catch (err) {
      console.error('Error fetching models:', err);
      setError(err instanceof Error ? err.message : 'Failed to load models');
    } finally {
      setLoading(false);
    }
  };

  const fetchProviders = async () => {
    try {
      const response = await fetch('/api/admin/servers');

      if (!response.ok) {
        throw new Error('Failed to fetch providers');
      }

      const data = await response.json();
      setProviders(data.data || []);
    } catch (err) {
      console.error('Error fetching providers:', err);
    }
  };

  const openAddModal = () => {
    setEditingModel(null);
    setFormData({
      custom_name: "",
      provider_id: "",
      actual_model_name: "",
      display_name: "",
      description: "",
      priority: 100,
      weight: 1.0,
      is_active: true,
    });
    setShowModal(true);
  };

  const openEditModal = (model: CustomModel) => {
    setEditingModel(model);
    setFormData({
      custom_name: model.custom_name,
      provider_id: model.provider_id,
      actual_model_name: model.actual_model_name,
      display_name: model.display_name,
      description: model.description || "",
      priority: model.priority || 100,
      weight: model.weight || 1.0,
      is_active: model.is_active,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const url = '/api/admin/models';
      const method = editingModel ? 'PATCH' : 'POST';
      const body = editingModel
        ? { id: editingModel.id, ...formData }
        : formData;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save model');
      }

      setShowModal(false);
      fetchModels();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save model');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this custom model?")) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/models?id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete model');
      }

      fetchModels();
    } catch (err) {
      alert('Failed to delete model');
    }
  };

  const toggleActive = async (model: CustomModel) => {
    try {
      const response = await fetch('/api/admin/models', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: model.id,
          is_active: !model.is_active,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update model');
      }

      fetchModels();
    } catch (err) {
      alert('Failed to update model');
    }
  };

  if (loading) {
    return (
      <AdminRoute>
        <AdminLayout>
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
              <p className="font-mono text-sm text-foreground/60">
                Loading models...
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
              onClick={fetchModels}
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
                Custom <i className="font-light">Models</i>
              </h1>
              <p className="font-mono text-sm text-foreground/60">
                Map custom model names to multiple providers with auto-rotation
              </p>
              <div className="flex items-start gap-2 mt-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <p className="font-mono text-xs text-blue-500">
                  Multi-Provider Support: Map the same custom name to multiple providers for load balancing and failover. Use priority (lower = higher priority) and weight (higher = more traffic).
                </p>
              </div>
            </div>
            <Button className="font-mono" onClick={openAddModal}>
              <Plus className="w-4 h-4 mr-2" />
              Add Custom Model
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="p-4 rounded-lg border border-foreground/10 bg-foreground/[0.02]">
              <p className="font-mono text-sm text-foreground/60 mb-1">
                Total Mappings
              </p>
              <p className="font-mono text-2xl font-semibold">
                {models.length}
              </p>
            </div>
            <div className="p-4 rounded-lg border border-foreground/10 bg-foreground/[0.02]">
              <p className="font-mono text-sm text-foreground/60 mb-1">
                Unique Models
              </p>
              <p className="font-mono text-2xl font-semibold">
                {new Set(models.map((m) => m.custom_name)).size}
              </p>
            </div>
            <div className="p-4 rounded-lg border border-foreground/10 bg-foreground/[0.02]">
              <p className="font-mono text-sm text-foreground/60 mb-1">
                Active Mappings
              </p>
              <p className="font-mono text-2xl font-semibold">
                {models.filter((m) => m.is_active).length}
              </p>
            </div>
            <div className="p-4 rounded-lg border border-foreground/10 bg-foreground/[0.02]">
              <p className="font-mono text-sm text-foreground/60 mb-1">
                Multi-Provider
              </p>
              <p className="font-mono text-2xl font-semibold flex items-center gap-2">
                <GitBranch className="w-5 h-5 text-primary" />
                {Object.values(
                  models.reduce((acc, m) => {
                    acc[m.custom_name] = (acc[m.custom_name] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>)
                ).filter((count) => count > 1).length}
              </p>
            </div>
          </div>

          {/* Models List */}
          {models.length > 0 ? (
            <div className="rounded-lg border border-foreground/10 bg-foreground/[0.02] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-foreground/10">
                    <tr>
                      <th className="text-left py-4 px-6 font-mono text-sm uppercase tracking-wide text-foreground/60">
                        Custom Name
                      </th>
                      <th className="text-left py-4 px-6 font-mono text-sm uppercase tracking-wide text-foreground/60">
                        Provider
                      </th>
                      <th className="text-left py-4 px-6 font-mono text-sm uppercase tracking-wide text-foreground/60">
                        Actual Model
                      </th>
                      <th className="text-center py-4 px-6 font-mono text-sm uppercase tracking-wide text-foreground/60">
                        Priority
                      </th>
                      <th className="text-center py-4 px-6 font-mono text-sm uppercase tracking-wide text-foreground/60">
                        Weight
                      </th>
                      <th className="text-center py-4 px-6 font-mono text-sm uppercase tracking-wide text-foreground/60">
                        Status
                      </th>
                      <th className="text-right py-4 px-6 font-mono text-sm uppercase tracking-wide text-foreground/60">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {models.map((model) => (
                      <tr
                        key={model.id}
                        className="border-b border-foreground/10 last:border-0 hover:bg-foreground/5"
                      >
                        <td className="py-4 px-6">
                          <div>
                            <p className="font-mono text-sm font-medium">
                              {model.custom_name}
                            </p>
                            <p className="font-mono text-xs text-foreground/60">
                              {model.display_name}
                            </p>
                            {model.description && (
                              <p className="font-mono text-xs text-foreground/40 mt-1">
                                {model.description}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div>
                            <span className="font-mono text-sm text-primary">
                              {model.provider?.name || 'Unknown'}
                            </span>
                            {model.provider?.health_status && (
                              <span
                                className={`ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-mono ${
                                  model.provider.health_status === 'healthy'
                                    ? 'bg-green-500/10 text-green-500'
                                    : model.provider.health_status === 'degraded'
                                    ? 'bg-yellow-500/10 text-yellow-500'
                                    : 'bg-red-500/10 text-red-500'
                                }`}
                              >
                                {model.provider.health_status}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className="font-mono text-sm">
                            {model.actual_model_name}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-center">
                          <span className="inline-flex items-center px-2 py-1 rounded-full bg-blue-500/10 text-blue-500 font-mono text-xs font-semibold">
                            {model.priority}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-center">
                          <span className="inline-flex items-center px-2 py-1 rounded-full bg-purple-500/10 text-purple-500 font-mono text-xs font-semibold">
                            {model.weight.toFixed(1)}×
                          </span>
                        </td>
                        <td className="py-4 px-6 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full font-mono text-xs ${
                              model.is_active
                                ? "bg-green-500/10 text-green-500"
                                : "bg-gray-500/10 text-gray-500"
                            }`}
                          >
                            {model.is_active ? (
                              <CheckCircle2 className="w-3 h-3" />
                            ) : (
                              <XCircle className="w-3 h-3" />
                            )}
                            {model.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => toggleActive(model)}
                              className="p-2 hover:bg-foreground/5 rounded-lg transition-colors"
                              title={model.is_active ? "Deactivate" : "Activate"}
                            >
                              {model.is_active ? (
                                <XCircle className="w-4 h-4 text-gray-500" />
                              ) : (
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                              )}
                            </button>
                            <button
                              onClick={() => openEditModal(model)}
                              className="p-2 hover:bg-foreground/5 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4 text-primary" />
                            </button>
                            <button
                              onClick={() => handleDelete(model.id)}
                              className="p-2 hover:bg-foreground/5 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
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
              <Brain className="w-12 h-12 text-foreground/20 mx-auto mb-4" />
              <p className="font-mono text-sm text-foreground/60 mb-4">
                No custom models configured
              </p>
              <Button className="font-mono" onClick={openAddModal}>
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Custom Model
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
                  {editingModel ? "Edit Custom Model" : "Add Custom Model"}
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
                  <Label htmlFor="custom_name" className="font-mono">
                    Custom Name * (API users will use this)
                  </Label>
                  <Input
                    id="custom_name"
                    value={formData.custom_name}
                    onChange={(e) =>
                      setFormData({ ...formData, custom_name: e.target.value })
                    }
                    placeholder="my-gpt4, custom-claude, etc."
                    required
                    className="font-mono"
                  />
                  <p className="text-xs text-foreground/60 mt-1 font-mono">
                    This is what users will specify in API calls
                  </p>
                </div>

                <div>
                  <Label htmlFor="display_name" className="font-mono">
                    Display Name *
                  </Label>
                  <Input
                    id="display_name"
                    value={formData.display_name}
                    onChange={(e) =>
                      setFormData({ ...formData, display_name: e.target.value })
                    }
                    placeholder="My GPT-4 Model"
                    required
                    className="font-mono"
                  />
                </div>

                <div>
                  <Label htmlFor="provider_id" className="font-mono">
                    Provider *
                  </Label>
                  <select
                    id="provider_id"
                    value={formData.provider_id}
                    onChange={(e) =>
                      setFormData({ ...formData, provider_id: e.target.value })
                    }
                    required
                    className="w-full px-3 py-2 rounded-lg bg-background border border-foreground/10 focus:border-primary focus:outline-none font-mono text-sm"
                  >
                    <option value="">Select a provider...</option>
                    {providers.map((provider) => (
                      <option key={provider.id} value={provider.id}>
                        {provider.name} - {provider.base_url}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="actual_model_name" className="font-mono">
                    Actual Model Name * (on provider)
                  </Label>
                  <Input
                    id="actual_model_name"
                    value={formData.actual_model_name}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        actual_model_name: e.target.value,
                      })
                    }
                    placeholder="gpt-4-turbo, claude-3-opus-20240229, etc."
                    required
                    className="font-mono"
                  />
                  <p className="text-xs text-foreground/60 mt-1 font-mono">
                    The actual model name on the provider's API
                  </p>
                </div>

                <div>
                  <Label htmlFor="description" className="font-mono">
                    Description (optional)
                  </Label>
                  <textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="E.g., Optimized for coding tasks..."
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg bg-background border border-foreground/10 focus:border-primary focus:outline-none font-mono text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="priority" className="font-mono">
                      Priority (1-1000) *
                    </Label>
                    <Input
                      id="priority"
                      type="number"
                      min="1"
                      max="1000"
                      step="1"
                      value={formData.priority}
                      onChange={(e) =>
                        setFormData({ ...formData, priority: parseInt(e.target.value) || 100 })
                      }
                      required
                      className="font-mono"
                    />
                    <p className="text-xs text-foreground/60 mt-1 font-mono">
                      Lower = higher priority (failover tiers)
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="weight" className="font-mono">
                      Weight (0.1-10.0) *
                    </Label>
                    <Input
                      id="weight"
                      type="number"
                      min="0.1"
                      max="10"
                      step="0.1"
                      value={formData.weight}
                      onChange={(e) =>
                        setFormData({ ...formData, weight: parseFloat(e.target.value) || 1.0 })
                      }
                      required
                      className="font-mono"
                    />
                    <p className="text-xs text-foreground/60 mt-1 font-mono">
                      Higher = more traffic at same priority
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-foreground/5 border border-foreground/10">
                  <p className="font-mono text-xs text-foreground/80 mb-2 font-semibold">
                    💡 Multi-Provider Tips:
                  </p>
                  <ul className="font-mono text-xs text-foreground/60 space-y-1 ml-4 list-disc">
                    <li>Same custom name + different providers = auto-rotation</li>
                    <li>Same priority = load balancing by weight</li>
                    <li>Different priority = failover tiers</li>
                  </ul>
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
                      <>{editingModel ? "Update" : "Create"} Model</>
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
