import axios from 'axios'
import { ParamsData } from '../components/FetchTrainedModels'
import { Classification } from '../contracts/DMLChain'
import { AddListingPayload, AddSubscribedListingsPayload, BACKEND_SERVER, ParticipantInfo, SubscribedListingDTO } from './types'

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
  const response = await fetch(`${BACKEND_SERVER}/add-listing`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || 'Failed to add listing')
  }

  return data
}

export const fetchListings = async (address: string) => {
  const response = await axios.get(`${BACKEND_SERVER}/get-filtered-listings/${address}`)

  if (response.status !== 200) {
    throw new Error(response.data.error || 'Failed to get listings')
  }

  return response.data
}

export const addSubscribedListing = async (listingData: AddSubscribedListingsPayload) => {
  try {
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
  } catch (error) {
    console.error('Error adding subscribed listing:', error)
    throw error
  }
}

export const getSubscribedListings = async (address: string): Promise<SubscribedListingDTO[]> => {
  try {
    const response = await axios.get<SubscribedListingDTO[]>(`${BACKEND_SERVER}/get-subscribed-listings/${address}`)
    return response.data
  } catch (error) {
    console.error('Error fetching subscribed listings:', error)
    throw error
  }
}

export const calculateTimeRemaining = (endDate: Date): number => {
  const end = new Date(endDate).getTime()
  const now = new Date().getTime()
  const timeLeft = end - now

  const seconds = Math.floor(timeLeft / 1000)
  return seconds
}
