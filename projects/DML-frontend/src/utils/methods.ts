import { ParamsData } from '../components/FetchTrainedModels'
import { Classification } from '../contracts/DMLChain'
import { AddListingPayload, BACKEND_SERVER, ParticipantInfo } from './types'

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
