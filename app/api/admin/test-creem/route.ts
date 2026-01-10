// ============================================================================
// TEST CREEM CONFIGURATION API ROUTE (ADMIN ONLY)
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { env } from '@/lib/config/env'
import { Creem } from 'creem'
import { errorResponse, successResponse } from '@/lib/utils/errors'
import { logger } from '@/lib/utils/logger'

export async function GET(request: NextRequest) {
  try {
    // Basic auth check (you can improve this)
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const apiKey = env.CREEM_API_KEY
    if (!apiKey) {
      return successResponse({
        configured: false,
        message: 'Creem API key not configured',
      })
    }

    const creem = new Creem({
      retryConfig: {
        strategy: 'backoff',
        backoff: {
          initialInterval: 1,
          maxInterval: 20,
          exponent: 1.5,
          maxElapsedTime: 60,
        },
        retryConnectionErrors: true,
      },
    })

    // Try to list products to verify API key
    try {
      const products = await creem.listProducts({
        xApiKey: apiKey,
        limit: 10,
      })

      logger.info('Creem API test successful', { productCount: (products as any)?.data?.length })

      return successResponse({
        configured: true,
        apiKeyValid: true,
        apiKeyPrefix: apiKey.substring(0, 15) + '...',
        productsFound: (products as any)?.data?.length || 0,
        products: (products as any)?.data?.map((p: any) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          priceAmount: p.price?.amount,
          priceCurrency: p.price?.currency,
        })) || [],
        configuredProducts: {
          starter: env.CREEM_PRODUCT_STARTER,
          pro: env.CREEM_PRODUCT_PRO,
          enterprise: env.CREEM_PRODUCT_ENTERPRISE,
        },
      })
    } catch (apiError: any) {
      logger.error('Creem API test failed', apiError)

      return successResponse({
        configured: true,
        apiKeyValid: false,
        apiKeyPrefix: apiKey.substring(0, 15) + '...',
        error: apiError.message,
        errorStatus: apiError.status || apiError.statusCode,
        errorBody: apiError.body,
        configuredProducts: {
          starter: env.CREEM_PRODUCT_STARTER,
          pro: env.CREEM_PRODUCT_PRO,
          enterprise: env.CREEM_PRODUCT_ENTERPRISE,
        },
      })
    }
  } catch (error) {
    logger.error('Test Creem endpoint error', error)
    return errorResponse(error)
  }
}
