// ============================================================================
// REFERRAL SECTION COMPONENT
// ============================================================================
// Displays user's referral program information, stats, and referral list

'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Users,
  CheckCircle,
  Clock,
  DollarSign,
  Copy,
  ExternalLink,
  Gift,
  TrendingUp
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface ReferralData {
  user: {
    id: string
    fullName: string
    email: string
    referralCode: string | null
    creditsBalance: number
    freeRequestsBalance: number
  }
  referralLink: string | null
  stats: {
    totalReferrals: number
    completedReferrals: number
    pendingReferrals: number
    totalEarnings: number
    totalRequestsEarned: number
  }
  settings: {
    rewardType: 'requests' | 'credits'
    referrerRewardType: string
    referrerRewardValue: number
    refereeRewardValue: number
    referrerRequests: number
    refereeRequests: number
    minPurchaseAmount: number
    minQualifyingRequests: number
    enabled: boolean
  } | null
  referrals: Array<{
    id: string
    refereeName: string
    refereeEmail: string
    status: string
    signupDate: string
    completionDate: string | null
    reward: number
    requestsGranted: number
    earned: boolean
  }>
}

export function ReferralSection({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<ReferralData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copiedText, setCopiedText] = useState<string | null>(null)

  useEffect(() => {
    fetchReferralData()
  }, [userId])

  const fetchReferralData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/user/referrals')

      if (!response.ok) {
        throw new Error('Failed to fetch referral data')
      }

      const result = await response.json()
      setData(result.data)
      setError(null)
    } catch (err) {
      console.error('Error fetching referral data:', err)
      setError('Failed to load referral data')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedText(label)
      setTimeout(() => setCopiedText(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-32">
          <p className="text-foreground/60">Loading referral data...</p>
        </div>
      </Card>
    )
  }

  if (error || !data) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-32">
          <p className="text-destructive">{error || 'No referral data available'}</p>
        </div>
      </Card>
    )
  }

  const isRequestRewards = data.settings?.rewardType === 'requests'

  const statsCards = [
    {
      title: 'Total Referrals',
      value: data.stats.totalReferrals.toString(),
      icon: Users,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      title: 'Completed',
      value: data.stats.completedReferrals.toString(),
      icon: CheckCircle,
      color: 'text-accent',
      bg: 'bg-accent/10',
    },
    {
      title: 'Pending',
      value: data.stats.pendingReferrals.toString(),
      icon: Clock,
      color: 'text-yellow-500',
      bg: 'bg-yellow-500/10',
    },
    {
      title: isRequestRewards ? 'Requests Earned' : 'Total Earnings',
      value: isRequestRewards
        ? `${data.stats.totalRequestsEarned.toLocaleString()} reqs`
        : `$${data.stats.totalEarnings.toFixed(2)}`,
      icon: isRequestRewards ? TrendingUp : DollarSign,
      color: 'text-accent',
      bg: 'bg-accent/10',
    },
  ]

  const getStatusBadge = (status: string) => {
    const variants = {
      completed: 'default',
      pending: 'secondary',
      active: 'outline',
      cancelled: 'destructive',
    } as const

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
        {status}
      </Badge>
    )
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <div className="space-y-6">
      {/* Referral Code Card */}
      {data.user.referralCode && data.referralLink && (
        <Card className="p-6 bg-gradient-to-br from-primary/5 to-accent/5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-xl font-sentient text-foreground mb-2">
                <i className="font-light">Your Referral Link</i>
              </h3>
              <p className="text-sm text-foreground/60 font-mono">
                Share this link and earn {isRequestRewards
                  ? `${data.settings?.referrerRequests.toLocaleString()} free API requests`
                  : `$${data.settings?.referrerRewardValue.toFixed(2)}`} for each completed referral
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-accent/10 border border-foreground/10">
              <Gift className="w-5 h-5 text-accent" />
            </div>
          </div>

          <div className="space-y-3">
            {/* Referral Code */}
            <div className="flex items-center gap-2">
              <div className="flex-1 p-3 bg-background border border-foreground/10 rounded-lg font-mono text-sm">
                {data.user.referralCode}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(data.user.referralCode!, 'Referral code')}
                className="min-w-[80px]"
              >
                {copiedText === 'Referral code' ? (
                  <span className="text-xs">Copied!</span>
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>

            {/* Referral Link */}
            <div className="flex items-center gap-2">
              <div className="flex-1 p-3 bg-background border border-foreground/10 rounded-lg font-mono text-sm truncate">
                {data.referralLink}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(data.referralLink!, 'Referral link')}
                className="min-w-[80px]"
              >
                {copiedText === 'Referral link' ? (
                  <span className="text-xs">Copied!</span>
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(data.referralLink!, '_blank')}
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Reward Info */}
          {data.settings && (
            <div className="mt-4 p-3 bg-background/50 rounded-lg border border-foreground/10">
              <div className="flex items-center gap-2 text-sm">
                <TrendingUp className="w-4 h-4 text-accent" />
                <span className="text-foreground/80 font-mono">
                  {isRequestRewards ? (
                    <>
                      You earn: <span className="font-semibold text-accent">{data.settings.referrerRequests.toLocaleString()} requests</span> •
                      Friend gets: <span className="font-semibold text-accent">{data.settings.refereeRequests.toLocaleString()} requests</span> •
                      Qualifying: <span className="font-semibold text-accent">{data.settings.minQualifyingRequests} requests</span>
                    </>
                  ) : (
                    <>
                      You earn: <span className="font-semibold text-accent">${data.settings.referrerRewardValue.toFixed(2)}</span> •
                      Friend gets: <span className="font-semibold text-accent">${data.settings.refereeRewardValue.toFixed(2)}</span>
                    </>
                  )}
                </span>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((card) => {
          const Icon = card.icon

          return (
            <Card
              key={card.title}
              className="p-4 hover:-translate-y-1 hover:shadow-lg transition-all"
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`p-2 rounded-lg ${card.bg} border border-foreground/10`}>
                  <Icon className={`w-4 h-4 ${card.color}`} />
                </div>
              </div>

              <div>
                <p className="text-xs text-foreground/60 uppercase tracking-wide font-mono">
                  {card.title}
                </p>
                <p className="text-xl font-semibold text-foreground mt-1 font-mono">
                  {card.value}
                </p>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Referrals List */}
      <Card className="p-6">
        <h3 className="text-xl font-sentient text-foreground mb-4">
          <i className="font-light">Your Referrals</i>
        </h3>

        {data.referrals.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-foreground/20 mx-auto mb-3" />
            <p className="text-foreground/60 font-mono">No referrals yet</p>
            <p className="text-sm text-foreground/40 font-mono mt-1">
              Share your referral link to start earning rewards
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-foreground/10">
                  <th className="text-left py-3 px-2 text-xs font-medium text-foreground/60 uppercase tracking-wide font-mono">
                    User
                  </th>
                  <th className="text-left py-3 px-2 text-xs font-medium text-foreground/60 uppercase tracking-wide font-mono">
                    Status
                  </th>
                  <th className="text-left py-3 px-2 text-xs font-medium text-foreground/60 uppercase tracking-wide font-mono">
                    Signup Date
                  </th>
                  <th className="text-left py-3 px-2 text-xs font-medium text-foreground/60 uppercase tracking-wide font-mono">
                    Completed
                  </th>
                  <th className="text-right py-3 px-2 text-xs font-medium text-foreground/60 uppercase tracking-wide font-mono">
                    Reward
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.referrals.map((referral) => (
                  <tr
                    key={referral.id}
                    className="border-b border-foreground/5 hover:bg-foreground/5 transition-colors"
                  >
                    <td className="py-3 px-2">
                      <div>
                        <p className="text-sm font-medium text-foreground font-mono">
                          {referral.refereeName}
                        </p>
                        <p className="text-xs text-foreground/60 font-mono">
                          {referral.refereeEmail}
                        </p>
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      {getStatusBadge(referral.status)}
                    </td>
                    <td className="py-3 px-2">
                      <span className="text-sm text-foreground/80 font-mono">
                        {formatDate(referral.signupDate)}
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      <span className="text-sm text-foreground/80 font-mono">
                        {formatDate(referral.completionDate)}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-right">
                      <span
                        className={`text-sm font-semibold font-mono ${
                          referral.earned ? 'text-accent' : 'text-foreground/40'
                        }`}
                      >
                        {isRequestRewards
                          ? `${referral.requestsGranted.toLocaleString()} reqs`
                          : `$${referral.reward.toFixed(2)}`}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
