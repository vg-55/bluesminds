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
  Plus,
  Trash2,
  RefreshCw,
  AlertCircle,
  Download,
  CheckCircle,
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
  source: 'server' | 'custom_mapping'
  provider?: string
  has_pricing: boolean
  current_pricing?: number
}

interface SyncData {
  total_models: number
  with_pricing: number
  missing_pricing: number
  models: AvailableModel[]
  missing_models: AvailableModel[]
}

export default function ModelPricingPage() {
  const [models, setModels] = useState<ModelPricing[]>([])
  const [syncData, setSyncData] = useState<SyncData | null>(null)
  const [showMissingModels, setShowMissingModels] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [selectedMissingModels, setSelectedMissingModels] = useState<Set<string>>(new Set())
  const [defaultPrice, setDefaultPrice] = useState('0.005')
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingData, setEditingData] = useState<EditingModel>({})
  const [showNewForm, setShowNewForm] = useState(false)
  const [filter, setFilter] = useState<{
    provider?: string
    isActive?: string
    isCustom?: string
  }>({})
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  )

  useEffect(() => {
    loadModels()
  }, [filter])

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

  const handleSyncModels = async () => {
    setSyncing(true)
    try {
      const res = await fetch('/api/admin/model-pricing/sync')
      const result = await res.json()

      if (result.success) {
        setSyncData(result.data)
        setShowMissingModels(true)

        if (result.data.missing_pricing > 0) {
          showMessage('success', `Found ${result.data.missing_pricing} models without pricing`)
        } else {
          showMessage('success', 'All models have pricing configured!')
        }
      } else {
        showMessage('error', 'Failed to sync models')
      }
    } catch (error) {
      console.error('Sync error:', error)
      showMessage('error', 'Failed to sync models')
    } finally {
      setSyncing(false)
    }
  }

  const handleToggleMissingModel = (modelName: string) => {
    const newSelected = new Set(selectedMissingModels)
    if (newSelected.has(modelName)) {
      newSelected.delete(modelName)
    } else {
      newSelected.add(modelName)
    }
    setSelectedMissingModels(newSelected)
  }

  const handleSelectAllMissing = () => {
    if (selectedMissingModels.size === syncData?.missing_models.length) {
      setSelectedMissingModels(new Set())
    } else {
      setSelectedMissingModels(
        new Set(syncData?.missing_models.map((m) => m.model_name) || [])
      )
    }
  }

  const handleBulkImport = async () => {
    if (selectedMissingModels.size === 0) {
      showMessage('error', 'Please select at least one model to import')
      return
    }

    try {
      const modelsToImport = syncData?.missing_models.filter((m) =>
        selectedMissingModels.has(m.model_name)
      )

      const res = await fetch('/api/admin/model-pricing/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          models: modelsToImport,
          default_price: parseFloat(defaultPrice),
        }),
      })

      const result = await res.json()
      if (result.success) {
        showMessage('success', `Successfully imported ${result.data.added} models`)
        setShowMissingModels(false)
        setSelectedMissingModels(new Set())
        loadModels()
        handleSyncModels() // Refresh sync data
      } else {
        showMessage('error', result.message || 'Failed to import models')
      }
    } catch (error) {
      console.error('Import error:', error)
      showMessage('error', 'Failed to import models')
    }
  }

  const handleEdit = (model: ModelPricing) => {
    setEditingId(model.id)
    setEditingData(model)
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditingData({})
    setShowNewForm(false)
  }

  const handleSave = async () => {
    try {
      if (showNewForm) {
        // Create new model pricing
        const res = await fetch('/api/admin/model-pricing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editingData),
        })

        const result = await res.json()
        if (result.success) {
          showMessage('success', 'Model pricing created successfully')
          loadModels()
          handleCancelEdit()
        } else {
          showMessage('error', result.message || 'Failed to create model pricing')
        }
      } else {
        // Update existing model pricing
        const res = await fetch('/api/admin/model-pricing', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingId, ...editingData }),
        })

        const result = await res.json()
        if (result.success) {
          showMessage('success', 'Model pricing updated successfully')
          loadModels()
          handleCancelEdit()
        } else {
          showMessage('error', result.message || 'Failed to update model pricing')
        }
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

  const handleNewModel = () => {
    setShowNewForm(true)
    setEditingData({
      model_name: '',
      price_per_request: 0.005,
      provider: 'custom',
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
            Configure per-request pricing for AI models
          </p>
          {syncData && (
            <div className="flex gap-4 mt-3">
              <Badge variant="outline" className="bg-primary/10">
                {syncData.total_models} total models
              </Badge>
              <Badge variant="outline" className="bg-green-500/10 text-green-500">
                {syncData.with_pricing} with pricing
              </Badge>
              {syncData.missing_pricing > 0 && (
                <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500">
                  {syncData.missing_pricing} missing pricing
                </Badge>
              )}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleSyncModels}
            variant="outline"
            className="gap-2"
            disabled={syncing}
          >
            {syncing ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Sync Models
          </Button>
          <Button onClick={handleNewModel} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Model
          </Button>
        </div>
      </div>

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

      {/* Missing Models Section */}
      {showMissingModels && syncData && syncData.missing_models.length > 0 && (
        <Card className="p-6 border-yellow-500/30 bg-yellow-500/5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-500" />
                Missing Pricing for {syncData.missing_models.length} Models
              </h3>
              <p className="text-sm text-foreground/60 mt-1">
                These models are available in your system but don't have pricing configured yet
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowMissingModels(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="mb-4 flex items-center gap-4">
            <div className="flex-1">
              <label className="text-sm text-foreground/60 mb-2 block">
                Default Price per Request
              </label>
              <Input
                type="number"
                step="0.00001"
                value={defaultPrice}
                onChange={(e) => setDefaultPrice(e.target.value)}
                className="w-48"
                placeholder="0.005"
              />
            </div>
            <div className="pt-6 flex gap-2">
              <Button
                onClick={handleSelectAllMissing}
                variant="outline"
                size="sm"
              >
                {selectedMissingModels.size === syncData.missing_models.length
                  ? 'Deselect All'
                  : 'Select All'}
              </Button>
              <Button
                onClick={handleBulkImport}
                disabled={selectedMissingModels.size === 0}
                size="sm"
                className="gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                Import {selectedMissingModels.size} Selected
              </Button>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <input
                      type="checkbox"
                      checked={
                        selectedMissingModels.size === syncData.missing_models.length &&
                        syncData.missing_models.length > 0
                      }
                      onChange={handleSelectAllMissing}
                      className="w-4 h-4"
                    />
                  </TableHead>
                  <TableHead>Model Name</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Provider</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {syncData.missing_models.map((model) => (
                  <TableRow key={model.model_name}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedMissingModels.has(model.model_name)}
                        onChange={() => handleToggleMissingModel(model.model_name)}
                        className="w-4 h-4"
                      />
                    </TableCell>
                    <TableCell className="font-mono">{model.model_name}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          model.source === 'server' ? 'default' : 'outline'
                        }
                      >
                        {model.source === 'server' ? 'Server' : 'Custom Mapping'}
                      </Badge>
                    </TableCell>
                    <TableCell className="capitalize">{model.provider}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
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
                {/* New model form */}
                {showNewForm && (
                  <TableRow className="bg-primary/5">
                    <TableCell>
                      <Input
                        value={editingData.model_name || ''}
                        onChange={(e) =>
                          updateEditingData('model_name', e.target.value)
                        }
                        placeholder="model-name"
                        className="w-full"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={editingData.provider || ''}
                        onChange={(e) =>
                          updateEditingData('provider', e.target.value)
                        }
                        placeholder="provider"
                        className="w-32"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.00001"
                        value={editingData.price_per_request || ''}
                        onChange={(e) =>
                          updateEditingData('price_per_request', e.target.value)
                        }
                        placeholder="0.005"
                        className="w-32"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          step="0.00001"
                          value={editingData.price_per_1k_input_tokens || ''}
                          onChange={(e) =>
                            updateEditingData('price_per_1k_input_tokens', e.target.value)
                          }
                          placeholder="In"
                          className="w-20"
                        />
                        <Input
                          type="number"
                          step="0.00001"
                          value={editingData.price_per_1k_output_tokens || ''}
                          onChange={(e) =>
                            updateEditingData('price_per_1k_output_tokens', e.target.value)
                          }
                          placeholder="Out"
                          className="w-20"
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">Custom</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="default">Active</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleSave}>
                          <Save className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}

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
                      No model pricing found
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
