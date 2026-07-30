export interface ShortlistItemView {
  id: string
  freelancerId: string
  rank: number
  notes: string | null
  status: string
  rejectionReason: string | null
  freelancer: {
    id: string
    full_name: string
    email: string
    discipline: string
    day_rate: number | null
    currency: string
    availability: string
    internal_rating: number | null
  }
  matchScore: number | null
  response: string | null
}
