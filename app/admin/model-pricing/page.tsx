// ============================================================================
// ADMIN: MODEL PRICING MANAGEMENT PAGE
// ============================================================================

'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DollarSign,
  Edit,
  Save,
  X,
  Trash2,
  RefreshCw,
  AlertCircle,
} from 'lucide-react'

interface ModelPricing {
  id: string
  model_name: string
  price_per_request: number
  price_per_1k_input_tokens?: number
  price_per_1k_output_tokens?: number
  provider: string
  is_custom: boolean
  is_active: boolean
  notes?: string
  created_at: string
  updated_at: string
}

interface EditingModel extends Partial<ModelPricing> {
  isNew?: boolean
}

interface AvailableModel {
  model_name: string
  display_name: string
  provider: string | null
  is_custom: boolean
}

export default function ModelPricingPage() {
  const [models, setModels] = useState<ModelPricing[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingData, setEditingData] = useState<EditingModel>({})
  const [filter, setFilter] = useState<{
    provider?: string
    isActive?: string
    isCustom?: string
  }>({})
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Mapped models (Admin → Models) for selection + search
  const [availableModels, setAvailableModels] = useState<AvailableModel[]>([])
  const [modelSearch, setModelSearch] = useState('')
  const [selectedModelName, setSelectedModelName] = useState<string>('')
  const [selectionLoading, setSelectionLoading] = useState(true)
  const [selectionSaving, setSelectionSaving] = useState(false)

  useEffect(() => {
    loadModels()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter])

  useEffect(() => {
    loadSelectionAndAvailableModels()
  }, [])

  const loadSelectionAndAvailableModels = async () => {
    setSelectionLoading(true)
    try {
      const res = await fetch('/api/admin/model-pricing?include_settings=true')
      const result = await res.json()

      if (!result?.success) {
        showMessage('error', 'Failed to load mapped models list')
        setAvailableModels([])
        setSelectedModelName('')
        return
      }

      const modelsList: AvailableModel[] = Array.isArray(result?.settings?.available_models)
        ? result.settings.available_models
        : []

      setAvailableModels(modelsList)

      const serverSelected =
        typeof result?.settings?.selected_model_name === 'string'
          ? result.settings.selected_model_name
          : ''

      const exists = serverSelected && modelsList.some((m) => m.model_name === serverSelected)
      if (exists) {
        setSelectedModelName(serverSelected)
      } else if (modelsList.length > 0) {
        setSelectedModelName(modelsList[0].model_name)
      } else {
        setSelectedModelName('')
      }
    } catch (error) {
      console.error('Selection load error:', error)
      showMessage('error', 'Failed to load mapped models list')
      setAvailableModels([])
      setSelectedModelName('')
    } finally {
      setSelectionLoading(false)
    }
  }

  const saveSelectedModel = async () => {
    const trimmed = selectedModelName.trim()
    if (!trimmed) {
      showMessage('error', 'Please select a model')
      return
    }
    const isValid = availableModels.some((m) => m.model_name === trimmed)
    if (!isValid) {
      showMessage('error', 'Selected model is not valid')
      return
    }

    setSelectionSaving(true)
    try {
      const res = await fetch('/api/admin/model-pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'set_selected_model',
          selected_model_name: trimmed,
        }),
      })
      const result = await res.json()
      if (result?.success) {
        showMessage('success', 'Selected model saved')
        // Re-fetch to ensure refresh persistence and server truth
        await loadSelectionAndAvailableModels()
      } else {
        showMessage('error', result?.error?.message || result?.message || 'Failed to save selection')
      }
    } catch (error) {
      console.error('Selection save error:', error)
      showMessage('error', 'Failed to save selection')
    } finally {
      setSelectionSaving(false)
    }
  }

  const loadModels = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filter.provider) params.append('provider', filter.provider)
      if (filter.isActive) params.append('is_active', filter.isActive)
      if (filter.isCustom) params.append('is_custom', filter.isCustom)

      const res = await fetch(`/api/admin/model-pricing?${params}`)
      const result = await res.json()

      if (result.success) {
        setModels(result.data)
      } else {
        showMessage('error', 'Failed to load model pricing')
      }
    } catch (error) {
      console.error('Load error:', error)
      showMessage('error', 'Failed to load model pricing')
    } finally {
      setLoading(false)
    }
  }

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 5000)
  }

  // Sync/import is intentionally removed here: pricing should be managed only for mapped models
  // (Admin → Models). If a mapped model is missing pricing, it will appear in the table as "No pricing"
  // and can be created via the editor.

  const handleEdit = (model: ModelPricing) => {
    setEditingId(model.id)
    setEditingData(model)
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditingData({})
  }

  const handleSave = async () => {
    try {
      const isCreate = !editingId

      const res = await fetch('/api/admin/model-pricing', {
        method: isCreate ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isCreate ? editingData : { id: editingId, ...editingData }),
      })

      const result = await res.json()
      if (result.success) {
        showMessage('success', isCreate ? 'Model pricing created successfully' : 'Model pricing updated successfully')
        loadModels()
        handleCancelEdit()
      } else {
        showMessage('error', result.message || 'Failed to save model pricing')
      }
    } catch (error) {
      console.error('Save error:', error)
      showMessage('error', 'Failed to save model pricing')
    }
  }

  const handleDelete = async (id: string, modelName: string) => {
    if (!confirm(`Are you sure you want to delete pricing for "${modelName}"?`)) {
      return
    }

    try {
      const res = await fetch(`/api/admin/model-pricing?id=${id}`, {
        method: 'DELETE',
      })

      const result = await res.json()
      if (result.success) {
        showMessage('success', 'Model pricing deleted successfully')
        loadModels()
      } else {
        showMessage('error', result.message || 'Failed to delete model pricing')
      }
    } catch (error) {
      console.error('Delete error:', error)
      showMessage('error', 'Failed to delete model pricing')
    }
  }

  const handleSelectModelForPricing = (modelName: string) => {
    const existing = models.find((m) => m.model_name === modelName)
    if (existing) {
      setEditingId(existing.id)
      setEditingData(existing)
      return
    }

    // Create pricing for a mapped model that currently has no pricing row
    const mapped = availableModels.find((m) => m.model_name === modelName)
    setEditingId(null)
    setEditingData({
      model_name: modelName,
      price_per_request: 0.005,
      provider: mapped?.provider || 'custom',
      is_custom: true,
      is_active: true,
    })
  }

  const updateEditingData = (field: string, value: any) => {
    setEditingData((prev) => ({ ...prev, [field]: value }))
  }

  const uniqueProviders = Array.from(new Set(models.map((m) => m.provider)))

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-foreground">Model Pricing Management</h1>
          <p className="text-foreground/60 text-lg mt-2">
            Configure per-request pricing for mapped and custom AI models
          </p>
          <div className="flex gap-4 mt-3">
            <Badge variant="outline" className="bg-primary/10">
              {availableModels.length} mapped models
            </Badge>
            <Badge variant="outline" className="bg-green-500/10 text-green-500">
              {models.length} pricing rows
            </Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={loadSelectionAndAvailableModels}
            disabled={selectionLoading}
            className="gap-2"
            title="Refresh mapped models list from Admin → Models"
          >
            <RefreshCw className={`w-4 h-4 ${selectionLoading ? 'animate-spin' : ''}`} />
            Refresh Mapped Models
          </Button>
        </div>
      </div>

      {/* Mapped Models (Admin → Models) */}
      <Card className="p-6">
        <div className="flex items-start justify-between gap-6">
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-foreground">Mapped Models (Admin → Models)</h2>
            <p className="text-sm text-foreground/60 mt-1">
              Only models that are currently mapped/enabled in <strong>Admin → Models</strong> are shown here.
              Select a model to create or update its pricing.
            </p>

            {selectionLoading ? (
              <div className="flex items-center gap-2 mt-4 text-foreground/60">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span className="text-sm">Loading mapped models…</span>
              </div>
            ) : availableModels.length === 0 ? (
              <div className="mt-4 p-4 rounded-lg border border-foreground/10 bg-foreground/[0.02]">
                <p className="text-sm text-foreground/70">No mapped models are available.</p>
                <p className="text-xs text-foreground/60 mt-1">
                  Create/enable a model mapping in <strong>Admin → Models</strong> first.
                </p>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Input
                    value={modelSearch}
                    onChange={(e) => setModelSearch(e.target.value)}
                    placeholder="Search mapped models…"
                    className="max-w-xl"
                  />
                  <Button
                    onClick={saveSelectedModel}
                    disabled={selectionSaving || !selectedModelName}
                    className="gap-2"
                    title="Persist selected model server-side"
                  >
                    {selectionSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Selection
                  </Button>
                </div>

                <div className="text-xs text-foreground/60">
                  Current selection:{' '}
                  <span className="font-mono text-foreground">{selectedModelName || '—'}</span>
                </div>

                <div className="max-h-80 overflow-y-auto border border-foreground/10 rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Model</TableHead>
                        <TableHead>Provider</TableHead>
                        <TableHead>Pricing</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {availableModels
                        .filter((m) => {
                          const q = modelSearch.trim().toLowerCase()
                          if (!q) return true
                          return (
                            m.model_name.toLowerCase().includes(q) ||
                            m.display_name.toLowerCase().includes(q) ||
                            (m.provider || '').toLowerCase().includes(q)
                          )
                        })
                        .map((m) => {
                          const pricing = models.find((p) => p.model_name === m.model_name)
                          return (
                            <TableRow key={m.model_name}>
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="font-mono">{m.model_name}</span>
                                  {m.display_name !== m.model_name && (
                                    <span className="text-xs text-foreground/60">{m.display_name}</span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-sm text-foreground/70">
                                {m.provider || '—'}
                              </TableCell>
                              <TableCell>
                                {pricing ? (
                                  <span className="font-mono">${pricing.price_per_request.toFixed(5)}</span>
                                ) : (
                                  <Badge variant="outline" className="text-foreground/60">
                                    No pricing
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setSelectedModelName(m.model_name)
                                      handleSelectModelForPricing(m.model_name)
                                    }}
                                    className="gap-2"
                                  >
                                    <Edit className="w-4 h-4" />
                                    {pricing ? 'Edit' : 'Set Pricing'}
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Info Notice about Filtering */}
      <Card className="p-4 bg-primary/5 border-primary/20">
        <div className="flex gap-2 items-start">
          <AlertCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
          <div className="text-sm text-foreground/70">
            This page only shows models that are currently <strong>mapped/enabled</strong> in{' '}
            <strong>Admin → Models</strong>. Unmapped/disabled models are hidden automatically.
          </div>
        </div>
      </Card>

      {/* Message */}
      {message && (
        <div
          className={`p-4 rounded-lg border flex items-center gap-3 ${
            message.type === 'success'
              ? 'bg-green-500/10 border-green-500/30 text-green-500'
              : 'bg-red-500/10 border-red-500/30 text-red-500'
          }`}
        >
          <AlertCircle className="w-5 h-5" />
          <span>{message.text}</span>
        </div>
      )}


      {/* Filters */}
      <Card className="p-6">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="text-sm text-foreground/60 mb-2 block">Provider</label>
            <select
              className="w-full px-3 py-2 bg-foreground/5 border border-foreground/10 rounded-lg text-foreground"
              value={filter.provider || ''}
              onChange={(e) =>
                setFilter({ ...filter, provider: e.target.value || undefined })
              }
            >
              <option value="">All Providers</option>
              {uniqueProviders.map((provider) => (
                <option key={provider} value={provider}>
                  {provider}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1">
            <label className="text-sm text-foreground/60 mb-2 block">Status</label>
            <select
              className="w-full px-3 py-2 bg-foreground/5 border border-foreground/10 rounded-lg text-foreground"
              value={filter.isActive || ''}
              onChange={(e) =>
                setFilter({ ...filter, isActive: e.target.value || undefined })
              }
            >
              <option value="">All Status</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>

          <div className="flex-1">
            <label className="text-sm text-foreground/60 mb-2 block">Type</label>
            <select
              className="w-full px-3 py-2 bg-foreground/5 border border-foreground/10 rounded-lg text-foreground"
              value={filter.isCustom || ''}
              onChange={(e) =>
                setFilter({ ...filter, isCustom: e.target.value || undefined })
              }
            >
              <option value="">All Types</option>
              <option value="true">Custom</option>
              <option value="false">Standard</option>
            </select>
          </div>

          <div className="pt-6">
            <Button
              variant="outline"
              onClick={() => setFilter({})}
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Reset
            </Button>
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-6 h-6 animate-spin text-foreground/60" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Model Name</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Price per Request</TableHead>
                  <TableHead>Token Pricing (Input/Output)</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>

                {/* Existing models */}
                {models.map((model) => {
                  const isEditing = editingId === model.id

                  return (
                    <TableRow key={model.id} className={isEditing ? 'bg-primary/5' : ''}>
                      <TableCell className="font-mono">
                        {model.model_name}
                        {model.model_name === 'default' && (
                          <Badge variant="outline" className="ml-2">
                            Fallback
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="capitalize">{model.provider}</TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            type="number"
                            step="0.00001"
                            value={editingData.price_per_request || ''}
                            onChange={(e) =>
                              updateEditingData('price_per_request', e.target.value)
                            }
                            className="w-32"
                          />
                        ) : (
                          <span className="font-mono">
                            ${model.price_per_request.toFixed(5)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <div className="flex gap-2">
                            <Input
                              type="number"
                              step="0.00001"
                              value={editingData.price_per_1k_input_tokens || ''}
                              onChange={(e) =>
                                updateEditingData(
                                  'price_per_1k_input_tokens',
                                  e.target.value
                                )
                              }
                              placeholder="In"
                              className="w-20"
                            />
                            <Input
                              type="number"
                              step="0.00001"
                              value={editingData.price_per_1k_output_tokens || ''}
                              onChange={(e) =>
                                updateEditingData(
                                  'price_per_1k_output_tokens',
                                  e.target.value
                                )
                              }
                              placeholder="Out"
                              className="w-20"
                            />
                          </div>
                        ) : (
                          <span className="text-sm text-foreground/60">
                            {model.price_per_1k_input_tokens
                              ? `$${model.price_per_1k_input_tokens.toFixed(5)} / $${model.price_per_1k_output_tokens?.toFixed(5)}`
                              : 'N/A'}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={model.is_custom ? 'default' : 'outline'}>
                          {model.is_custom ? 'Custom' : 'Standard'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <select
                            className="px-3 py-1 bg-foreground/5 border border-foreground/10 rounded text-sm"
                            value={editingData.is_active ? 'true' : 'false'}
                            onChange={(e) =>
                              updateEditingData('is_active', e.target.value === 'true')
                            }
                          >
                            <option value="true">Active</option>
                            <option value="false">Inactive</option>
                          </select>
                        ) : (
                          <Badge
                            variant={model.is_active ? 'default' : 'outline'}
                            className={
                              model.is_active ? 'bg-green-500/20 text-green-500' : ''
                            }
                          >
                            {model.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {isEditing ? (
                            <>
                              <Button size="sm" onClick={handleSave}>
                                <Save className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={handleCancelEdit}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEdit(model)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              {model.model_name !== 'default' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDelete(model.id, model.model_name)}
                                  className="text-red-500 hover:text-red-600"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}

                {models.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-foreground/60">
                      No pricing rows found yet. Select a mapped model above to create pricing.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Info Card */}
      <Card className="p-6 bg-primary/5 border-primary/20">
        <div className="flex gap-3">
          <DollarSign className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-foreground mb-2">About Model Pricing</h3>
            <ul className="space-y-1 text-sm text-foreground/70">
              <li>
                • <strong>Price per Request:</strong> The cost charged for each API request
                using this model
              </li>
              <li>
                • <strong>Token Pricing:</strong> Optional reference pricing per 1K tokens
                (for analytics only)
              </li>
              <li>
                • <strong>Custom Models:</strong> User-defined models with custom pricing
              </li>
              <li>
                • <strong>Default Pricing:</strong> Fallback pricing for unknown models
                (cannot be deleted)
              </li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  )
}
