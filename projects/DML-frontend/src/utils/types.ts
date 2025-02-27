export const BACKEND_SERVER = import.meta.env.VITE_BACKEND_SERVER

export interface AddListingPayload {
  address: string
  contractId: number
  createdAt: Date
  expiresAt: Date
  url: string
}

export interface ParticipantInfo {
  address: string
  weight: bigint
}

export interface ListingsDTO {
  contractId: number
  creator: string
  createdAt: Date
  expiresAt: Date
  url: string
  reputation: number
}

export interface AddSubscribedListingsPayload {
  address: string
  creatorAddress: string
  reputation: number
  contractId: number
  createdAt: Date
  expiresAt: Date
  url: string
}

export interface SubscribedListingDTO {
  contractId: string
  createdAt: string
  expiresAt: string
  url: string
  creatorAddress: string
  reputation: number
  feedback: boolean
}
