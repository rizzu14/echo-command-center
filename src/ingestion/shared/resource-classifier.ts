/**
 * ResourceClassifier — maps cloud-provider-specific resource type strings
 * to a canonical taxonomy used across ECHO.
 */

export type CanonicalResourceType =
  | 'EC2_INSTANCE'
  | 'RDS_INSTANCE'
  | 'STORAGE_BUCKET'
  | 'LAMBDA_FUNCTION'
  | 'KUBERNETES_NODE'
  | 'LOAD_BALANCER'
  | 'CDN'
  | 'DATABASE'
  | 'CACHE'
  | 'NETWORK'
  | 'CONTAINER'
  | 'SERVERLESS'
  | 'ANALYTICS'
  | 'ML_COMPUTE'
  | 'UNKNOWN'

// AWS resource type mappings
const AWS_TYPE_MAP: Record<string, CanonicalResourceType> = {
  'Amazon EC2': 'EC2_INSTANCE',
  'Amazon Elastic Compute Cloud': 'EC2_INSTANCE',
  'Amazon RDS': 'RDS_INSTANCE',
  'Amazon Relational Database Service': 'RDS_INSTANCE',
  'Amazon S3': 'STORAGE_BUCKET',
  'Amazon Simple Storage Service': 'STORAGE_BUCKET',
  'AWS Lambda': 'LAMBDA_FUNCTION',
  'Amazon EKS': 'KUBERNETES_NODE',
  'Amazon Elastic Kubernetes Service': 'KUBERNETES_NODE',
  'Elastic Load Balancing': 'LOAD_BALANCER',
  'Amazon CloudFront': 'CDN',
  'Amazon DynamoDB': 'DATABASE',
  'Amazon ElastiCache': 'CACHE',
  'Amazon VPC': 'NETWORK',
  'Amazon ECS': 'CONTAINER',
  'Amazon SageMaker': 'ML_COMPUTE',
  'Amazon Redshift': 'ANALYTICS',
  'Amazon Athena': 'ANALYTICS',
}

// Azure resource type mappings
const AZURE_TYPE_MAP: Record<string, CanonicalResourceType> = {
  'Virtual Machines': 'EC2_INSTANCE',
  'Microsoft.Compute/virtualMachines': 'EC2_INSTANCE',
  'SQL Database': 'RDS_INSTANCE',
  'Microsoft.Sql/servers': 'RDS_INSTANCE',
  'Storage': 'STORAGE_BUCKET',
  'Microsoft.Storage/storageAccounts': 'STORAGE_BUCKET',
  'Azure Functions': 'LAMBDA_FUNCTION',
  'Microsoft.Web/sites': 'LAMBDA_FUNCTION',
  'Azure Kubernetes Service': 'KUBERNETES_NODE',
  'Microsoft.ContainerService/managedClusters': 'KUBERNETES_NODE',
  'Load Balancer': 'LOAD_BALANCER',
  'Azure CDN': 'CDN',
  'Cosmos DB': 'DATABASE',
  'Azure Cache for Redis': 'CACHE',
  'Virtual Network': 'NETWORK',
  'Container Instances': 'CONTAINER',
  'Azure Machine Learning': 'ML_COMPUTE',
  'Azure Synapse Analytics': 'ANALYTICS',
}

// GCP resource type mappings
const GCP_TYPE_MAP: Record<string, CanonicalResourceType> = {
  'Compute Engine': 'EC2_INSTANCE',
  'compute.googleapis.com/Instance': 'EC2_INSTANCE',
  'Cloud SQL': 'RDS_INSTANCE',
  'sqladmin.googleapis.com/Instance': 'RDS_INSTANCE',
  'Cloud Storage': 'STORAGE_BUCKET',
  'storage.googleapis.com/Bucket': 'STORAGE_BUCKET',
  'Cloud Functions': 'LAMBDA_FUNCTION',
  'cloudfunctions.googleapis.com/CloudFunction': 'LAMBDA_FUNCTION',
  'Google Kubernetes Engine': 'KUBERNETES_NODE',
  'container.googleapis.com/Cluster': 'KUBERNETES_NODE',
  'Cloud Load Balancing': 'LOAD_BALANCER',
  'Cloud CDN': 'CDN',
  'Cloud Spanner': 'DATABASE',
  'Firestore': 'DATABASE',
  'Memorystore': 'CACHE',
  'Virtual Private Cloud': 'NETWORK',
  'Cloud Run': 'CONTAINER',
  'Vertex AI': 'ML_COMPUTE',
  'BigQuery': 'ANALYTICS',
}

export class ResourceClassifier {
  classify(provider: 'AWS' | 'AZURE' | 'GCP', rawResourceType: string): CanonicalResourceType {
    const map =
      provider === 'AWS' ? AWS_TYPE_MAP : provider === 'AZURE' ? AZURE_TYPE_MAP : GCP_TYPE_MAP

    // Exact match first
    if (map[rawResourceType]) return map[rawResourceType]

    // Partial match (case-insensitive substring)
    const lower = rawResourceType.toLowerCase()
    for (const [key, canonical] of Object.entries(map)) {
      if (lower.includes(key.toLowerCase()) || key.toLowerCase().includes(lower)) {
        return canonical
      }
    }

    return 'UNKNOWN'
  }
}
