import { createClient } from '@/lib/supabase/server'
import { FreelancerRepository } from '@/lib/domains/talent/repositories/freelancer.repository'
import { PortfolioRepository } from '@/lib/domains/talent/repositories/portfolio.repository'
import { RatingRepository } from '@/lib/domains/talent/repositories/rating.repository'
import { PortfolioService } from '@/lib/domains/talent/services/portfolio.service'
import { TalentQueryService, TalentService } from '@/lib/domains/talent/services/talent.service'

export interface TalentServices {
  talent: TalentService
  portfolio: PortfolioService
  queries: TalentQueryService
}

export async function createTalentServices(): Promise<TalentServices> {
  const supabase = await createClient()
  const context = { supabase }

  const freelancerRepository = new FreelancerRepository(context)
  const portfolioRepository = new PortfolioRepository(context)
  const ratingRepository = new RatingRepository(context)

  return {
    talent: new TalentService(freelancerRepository),
    portfolio: new PortfolioService(freelancerRepository, portfolioRepository),
    queries: new TalentQueryService(freelancerRepository, ratingRepository),
  }
}
