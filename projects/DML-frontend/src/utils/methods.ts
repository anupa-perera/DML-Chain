import axios from 'axios'
import { ParamsData } from '../components/FetchTrainedModels'
import { Classification } from '../contracts/DMLChain'
import {
  AddListingPayload,
  AddSubscribedListingsPayload,
  BACKEND_SERVER,
  ParticipantInfo,
  ReputationResponseDTO,
  ReputationType,
  SubscribedListingDTO,
} from './types'

export const calculateReward = (paramsData: ParamsData, fixedPool: bigint, baseCriteria: Classification) => {
  let poolWeight: bigint = 0n
  const baseModelScore = Object.values(baseCriteria).reduce((acc, val) => acc + BigInt(val), 0n)
  const participants: ParticipantInfo[] = []

  Object.keys(paramsData).forEach((address) => {
    const { score, reputation } = paramsData[address]
    if (score > baseModelScore) {
      const excess = score - baseModelScore
      const participantWeight = (excess * (reputation * reputation)) / (100n * 100n)

      poolWeight += participantWeight
      participants.push({ address, weight: participantWeight })
    }
  })

  const addresses = participants.map((participant) => participant.address)
  const rewards = participants.map((participant) => (participant.weight * fixedPool) / poolWeight)

  return { addresses, rewards }
}

export const addListing = async (payload: AddListingPayload) => {
  const response = await axios.post(`${BACKEND_SERVER}/add-listing`, payload)

  if (response.status !== 200) {
    throw new Error(response.data.error || 'Failed to add listing')
  }

  return response.data
}

export const fetchListings = async (address: string) => {
  const response = await axios.get(`${BACKEND_SERVER}/get-filtered-listings/${address}`)

  if (response.status !== 200) {
    throw new Error(response.data.error || 'Failed to get listings')
  }

  return response.data
}

export const addSubscribedListing = async (listingData: AddSubscribedListingsPayload) => {
  const response = await axios.post(`${BACKEND_SERVER}/add-subscribed-listing`, {
    address: listingData.address,
    contractId: listingData.contractId,
    createdAt: listingData.createdAt,
    expiresAt: listingData.expiresAt,
    url: listingData.url,
    creatorAddress: listingData.creatorAddress,
    reputation: listingData.reputation,
  })

  return response.data
}

export const getSubscribedListings = async (address: string): Promise<SubscribedListingDTO[]> => {
  const response = await axios.get<SubscribedListingDTO[]>(`${BACKEND_SERVER}/get-subscribed-listings/${address}`)
  return response.data
}

export const calculateTimeRemaining = (endDate: Date): number => {
  const end = new Date(endDate).getTime()
  const now = new Date().getTime()
  const timeLeft = end - now

  const seconds = Math.floor(timeLeft / 1000)
  return seconds
}

export const updateReputation = async (address: string, action: ReputationType): Promise<ReputationResponseDTO> => {
  try {
    const { data } = await axios.post<ReputationResponseDTO>(`${BACKEND_SERVER}/update-reputation`, {
      address,
      action,
    })
    return data
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.error || 'Failed to update reputation')
    }
    throw error
  }
}

export const getCreatedListings = async (address: string) => {
  const response = await axios.get(`${BACKEND_SERVER}/get-created-listings/${address}`)
  return response.data
}
