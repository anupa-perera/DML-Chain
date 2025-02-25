export const BACKEND_SERVER = import.meta.env.VITE_BACKEND_SERVER

export interface AddListingPayload {
  address: string
  contractId: number
  createdAt: string
  expiresAt: string
}

export interface ParticipantInfo {
  address: string
  weight: bigint
}
