import { ParamsData } from '../components/FetchTrainedModels'
import { Classification } from '../contracts/DMLChain'

interface ParticipantInfo {
  address: string
  weight: bigint
}

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

  const rewards = participants.map((participant) => ({
    address: participant.address,
    reward: (participant.weight * fixedPool) / poolWeight,
  }))

  return rewards
}
