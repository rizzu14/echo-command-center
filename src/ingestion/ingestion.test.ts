import { TagValidator } from './shared/tag-validator'
import { CostNormalizer } from './shared/cost-normalizer'
import { ResourceClassifier } from './shared/resource-classifier'
import { AwsCostExplorerConnector } from './connectors/aws-connector'
import { AzureCostManagementConnector } from './connectors/azure-connector'
import { GcpBillingConnector } from './connectors/gcp-connector'
import { CarbonIntensityFeed, LastKnownIntensityCache } from './connectors/carbon-connector'
import { DataNormalizationPipeline } from './pipeline/normalization-pipeline'
import type { BillingEvent, RawBillingRecord } from './shared/types'

// ---------------------------------------------------------------------------
// TagValidator
// ---------------------------------------------------------------------------

describe('TagValidator', () => {
  const validator = new TagValidator(['tenant_id', 'environment', 'owner'])

  it('passes when all required tags are present', () => {
    const result = validator.validate(
      { tenant_id: 'acme', environment: 'prod', owner: 'platform' },
      'res-1',
    )
    expect(result.valid).toBe(true)
    expect(result.missing_tags).toHaveLength(0)
  })

  it('fails when a required tag is missing', () => {
    const result = validator.validate({ tenant_id: 'acme', environment: 'prod' }, 'res-1')
    expect(result.valid).toBe(false)
    expect(result.missing_tags).toContain('owner')
  })

  it('fails when a required tag is empty string', () => {
    const result = validator.validate(
      { tenant_id: 'acme', environment: '', owner: 'platform' },
      'res-1',
    )
    expect(result.valid).toBe(false)
    expect(result.missing_tags).toContain('environment')
  })

  it('isValid returns true for complete tags', () => {
    expect(
      validator.isValid({ tenant_id: 'acme', environment: 'prod', owner: 'platform' }),
    ).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// CostNormalizer
// ---------------------------------------------------------------------------

describe('CostNormalizer', () => {
  const normalizer = new CostNormalizer()

  it('returns same amount for USD', () => {
    const result = normalizer.normalize(100, 'USD')
    expect(result.amount_usd).toBe(100)
    expect(result.exchange_rate).toBe(1.0)
  })

  it('converts EUR to USD', () => {
    const result = normalizer.normalize(100, 'EUR')
    expect(result.amount_usd).toBeCloseTo(108, 1)
  })

  it('converts to hourly USD correctly', () => {
    // $24 USD over 24 hours = $1/hr
    const hourly = normalizer.toHourlyUsd(24, 'USD', 24)
    expect(hourly).toBe(1)
  })

  it('falls back to 1:1 for unknown currency', () => {
    const result = normalizer.normalize(50, 'XYZ')
    expect(result.amount_usd).toBe(50)
    expect(result.exchange_rate).toBe(1.0)
  })
})

// ---------------------------------------------------------------------------
// ResourceClassifier
// ---------------------------------------------------------------------------

describe('ResourceClassifier', () => {
  const classifier = new ResourceClassifier()

  it('classifies AWS EC2 correctly', () => {
    expect(classifier.classify('AWS', 'Amazon EC2')).toBe('EC2_INSTANCE')
  })

  it('classifies AWS S3 correctly', () => {
    expect(classifier.classify('AWS', 'Amazon S3')).toBe('STORAGE_BUCKET')
  })

  it('classifies Azure VM correctly', () => {
    expect(classifier.classify('AZURE', 'Microsoft.Compute/virtualMachines')).toBe('EC2_INSTANCE')
  })

  it('classifies GCP Compute Engine correctly', () => {
    expect(classifier.classify('GCP', 'Compute Engine')).toBe('EC2_INSTANCE')
  })

  it('classifies GCP BigQuery correctly', () => {
    expect(classifier.classify('GCP', 'BigQuery')).toBe('ANALYTICS')
  })

  it('returns UNKNOWN for unrecognized type', () => {
    expect(classifier.classify('AWS', 'SomeUnknownService')).toBe('UNKNOWN')
  })
})

// ---------------------------------------------------------------------------
// AwsCostExplorerConnector
// ---------------------------------------------------------------------------

describe('AwsCostExplorerConnector', () => {
  const connector = new AwsCostExplorerConnector({ tenantId: 'tenant-aws-test' })

  it('poll() returns raw billing records', async () => {
    const records = await connector.poll()
    expect(records.length).toBeGreaterThan(0)
    expect(records[0].provider).toBe('AWS')
    expect(records[0].cost_currency).toBe('USD')
  })

  it('normalize() produces a valid BillingEvent', async () => {
    const records = await connector.poll()
    const event = connector.normalize(records[0])
    expect(event.provider).toBe('AWS')
    expect(event.tenant_id).toBe('tenant-aws-test')
    expect(event.hourly_cost_usd).toBeGreaterThan(0)
    expect(event.event_id).toBeTruthy()
    expect(event.resource_type).not.toBe('')
  })

  it('normalize() throws when required tags are missing', () => {
    const badRecord: RawBillingRecord = {
      provider: 'AWS',
      raw_resource_id: 'bad-res',
      raw_resource_type: 'Amazon EC2',
      region: 'us-east-1',
      cost_amount: 5,
      cost_currency: 'USD',
      tags: {}, // no tags
      usage_start: '2024-01-01',
      usage_end: '2024-01-02',
    }
    expect(() => connector.normalize(badRecord)).toThrow('TagValidation failed')
  })

  it('healthCheck() returns HEALTHY status initially', async () => {
    const status = await connector.healthCheck()
    expect(status.provider).toBe('AWS')
    expect(status.status).toBe('HEALTHY')
  })

  it('poll interval is capped at 60 seconds', () => {
    const c = new AwsCostExplorerConnector({ tenantId: 't1', pollIntervalMs: 999_999 })
    expect(c.pollInterval).toBe(60_000)
  })
})

// ---------------------------------------------------------------------------
// AzureCostManagementConnector
// ---------------------------------------------------------------------------

describe('AzureCostManagementConnector', () => {
  const connector = new AzureCostManagementConnector({
    tenantId: 'tenant-azure-test',
    subscriptionId: 'sub-123',
  })

  it('poll() returns raw billing records', async () => {
    const records = await connector.poll()
    expect(records.length).toBeGreaterThan(0)
    expect(records[0].provider).toBe('AZURE')
  })

  it('normalize() produces a valid BillingEvent', async () => {
    const records = await connector.poll()
    const event = connector.normalize(records[0])
    expect(event.provider).toBe('AZURE')
    expect(event.tenant_id).toBe('tenant-azure-test')
    expect(event.hourly_cost_usd).toBeGreaterThan(0)
  })

  it('healthCheck() returns HEALTHY status initially', async () => {
    const status = await connector.healthCheck()
    expect(status.provider).toBe('AZURE')
    expect(status.status).toBe('HEALTHY')
  })
})

// ---------------------------------------------------------------------------
// GcpBillingConnector
// ---------------------------------------------------------------------------

describe('GcpBillingConnector', () => {
  const connector = new GcpBillingConnector({
    tenantId: 'tenant-gcp-test',
    billingAccountId: 'billing-acct-456',
  })

  it('poll() returns raw billing records', async () => {
    const records = await connector.poll()
    expect(records.length).toBeGreaterThan(0)
    expect(records[0].provider).toBe('GCP')
  })

  it('normalize() produces a valid BillingEvent', async () => {
    const records = await connector.poll()
    const event = connector.normalize(records[0])
    expect(event.provider).toBe('GCP')
    expect(event.tenant_id).toBe('tenant-gcp-test')
    expect(event.hourly_cost_usd).toBeGreaterThan(0)
  })

  it('healthCheck() returns HEALTHY status initially', async () => {
    const status = await connector.healthCheck()
    expect(status.provider).toBe('GCP')
    expect(status.status).toBe('HEALTHY')
  })
})

// ---------------------------------------------------------------------------
// CarbonIntensityFeed
// ---------------------------------------------------------------------------

describe('CarbonIntensityFeed', () => {
  it('poll() returns readings for all configured regions', async () => {
    const feed = new CarbonIntensityFeed({ regions: ['us-east-1', 'eu-west-1'] })
    const readings = await feed.poll()
    expect(readings).toHaveLength(2)
    expect(readings[0].intensity_gco2_per_kwh).toBeGreaterThan(0)
    expect(readings[0].timestamp).toBeTruthy()
  })

  it('getReading() returns latest reading after poll', async () => {
    const feed = new CarbonIntensityFeed({ regions: ['us-west-2'] })
    await feed.poll()
    const reading = feed.getReading('us-west-2')
    expect(reading).not.toBeNull()
    expect(reading!.region).toBe('us-west-2')
  })

  it('getForecast() returns a projected reading', async () => {
    const feed = new CarbonIntensityFeed({ regions: ['us-east-1'] })
    await feed.poll()
    const forecast = feed.getForecast('us-east-1', 6)
    expect(forecast).not.toBeNull()
    expect(forecast!.forecast_horizon_hours).toBe(6)
  })

  it('isStale() returns true for unknown region', () => {
    const feed = new CarbonIntensityFeed({ regions: [] })
    expect(feed.isStale('unknown-region')).toBe(true)
  })

  it('poll interval is capped at 15 minutes', () => {
    const feed = new CarbonIntensityFeed({ regions: [], pollIntervalMs: 9_999_999 })
    expect(feed.pollInterval).toBe(900_000)
  })
})

describe('LastKnownIntensityCache', () => {
  it('stores and retrieves readings', () => {
    const cache = new LastKnownIntensityCache()
    const reading = {
      region: 'us-east-1',
      intensity_gco2_per_kwh: 380,
      forecast_horizon_hours: 0,
      timestamp: new Date().toISOString(),
    }
    cache.set(reading)
    expect(cache.get('us-east-1')).toEqual(reading)
  })

  it('isStale() returns false for fresh data', () => {
    const cache = new LastKnownIntensityCache()
    cache.set({
      region: 'us-east-1',
      intensity_gco2_per_kwh: 380,
      forecast_horizon_hours: 0,
      timestamp: new Date().toISOString(),
    })
    expect(cache.isStale('us-east-1', 30 * 60_000)).toBe(false)
  })

  it('isStale() returns true for missing region', () => {
    const cache = new LastKnownIntensityCache()
    expect(cache.isStale('missing', 1000)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// DataNormalizationPipeline
// ---------------------------------------------------------------------------

describe('DataNormalizationPipeline', () => {
  const published: BillingEvent[] = []
  const deadLettered: unknown[] = []

  const pipeline = new DataNormalizationPipeline({
    tenantId: 'tenant-pipeline-test',
    awsBillingAccountId: 'aws-acct',
    azureSubscriptionId: 'sub-123',
    gcpBillingAccountId: 'gcp-acct',
    producer: {
      publishBillingEvent: async (e) => {
        published.push(e)
      },
    },
    onDeadLetter: (entry) => deadLettered.push(entry),
  })

  beforeEach(() => {
    published.length = 0
    deadLettered.length = 0
  })

  it('run() publishes BillingEvents from all three connectors', async () => {
    const events = await pipeline.run()
    expect(events.length).toBeGreaterThan(0)
    expect(published.length).toBe(events.length)

    const providers = new Set(events.map((e) => e.provider))
    expect(providers.has('AWS')).toBe(true)
    expect(providers.has('AZURE')).toBe(true)
    expect(providers.has('GCP')).toBe(true)
  })

  it('processRecord() returns null and dead-letters invalid records', () => {
    const badRecord: RawBillingRecord = {
      provider: 'AWS',
      raw_resource_id: 'bad-res',
      raw_resource_type: 'Amazon EC2',
      region: 'us-east-1',
      cost_amount: 5,
      cost_currency: 'USD',
      tags: {}, // missing required tags
      usage_start: '2024-01-01',
      usage_end: '2024-01-02',
    }
    const result = pipeline.processRecord(badRecord)
    expect(result).toBeNull()
    expect(pipeline.getDeadLetterQueue()).toHaveLength(1)
    expect(pipeline.getDeadLetterQueue()[0].error).toContain('Missing required tags')
  })

  it('processRecord() returns a valid BillingEvent for a good record', () => {
    const goodRecord: RawBillingRecord = {
      provider: 'AWS',
      raw_resource_id: 'aws-ec2-us-east-1',
      raw_resource_type: 'Amazon EC2',
      region: 'us-east-1',
      cost_amount: 24,
      cost_currency: 'USD',
      tags: { tenant_id: 'tenant-pipeline-test', environment: 'prod', owner: 'platform' },
      usage_start: '2024-01-01T00:00:00Z',
      usage_end: '2024-01-02T00:00:00Z',
    }
    const event = pipeline.processRecord(goodRecord)
    expect(event).not.toBeNull()
    expect(event!.hourly_cost_usd).toBe(1) // $24 / 24h
    expect(event!.resource_type).toBe('EC2_INSTANCE')
    expect(event!.tenant_id).toBe('tenant-pipeline-test')
  })

  it('drainDeadLetterQueue() clears the queue', () => {
    const badRecord: RawBillingRecord = {
      provider: 'GCP',
      raw_resource_id: 'gcp-bad',
      raw_resource_type: 'Compute Engine',
      region: 'us-central1',
      cost_amount: 5,
      cost_currency: 'USD',
      tags: {},
      usage_start: '2024-01-01',
      usage_end: '2024-01-02',
    }
    pipeline.processRecord(badRecord)
    const drained = pipeline.drainDeadLetterQueue()
    expect(drained.length).toBeGreaterThan(0)
    expect(pipeline.getDeadLetterQueue()).toHaveLength(0)
  })
})
