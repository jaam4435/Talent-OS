export {
  DistributedCache,
  globalRepositoryCache,
  resetDistributedCache,
} from '@/lib/redis/distributed-cache'

/** @deprecated Alias for DistributedCache */
export { DistributedCache as RepositoryCache } from '@/lib/redis/distributed-cache'
