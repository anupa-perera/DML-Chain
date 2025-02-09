import * as algokit from '@algorandfoundation/algokit-utils'
import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import algosdk, { encodeAddress } from 'algosdk'
import { DmlChainFactory } from '../contracts/DMLChain'

type Classification = {
  accuracy: bigint
  precision: bigint
  recall: bigint
  f1score: bigint
}

type ParamsData = {
  paramHash: string
  paramKey: string
}

algokit.Config.configure({
  populateAppCallResources: true,
})

export const generateAccount = () => {
  const acc = algosdk.generateAccount()
  return {
    mnemonic: algosdk.secretKeyToMnemonic(acc.sk),
    address: acc.addr,
  }
}

export const createContract = async (ipfsHash: string, modelEvaluation: Classification, address: string) => {
  const algorand = AlgorandClient.defaultLocalNet()

  const mnoAccount = algorand.account.fromMnemonic(address)

  // await algorand.send.payment({
  //   sender: dispenser.addr,
  //   receiver: mnoAccount.account.addr,
  //   amount: (10).algo(),
  // })

  const factory = algorand.client.getTypedAppFactory(DmlChainFactory, {
    defaultSender: mnoAccount.account.addr,
  })

  const { appClient: client } = await factory.send.create.createApplication({ args: { modelHash: ipfsHash } })

  const appID = client.appId

  const mbrPayFirstDeposit = await algorand.createTransaction.payment({
    sender: mnoAccount.account.addr,
    receiver: client.appAddress,
    amount: (1).algo(),
  })

  await client.send.storeClassificationSelectionCriteria({
    args: {
      evaluationMetrics: modelEvaluation,
      mbrPay: mbrPayFirstDeposit,
    },
  })

  await client.send.getClassificationCriteria()

  return appID
}

export const modelSelectionCriteria = async (DOAddress: string, appID: bigint, selectionCriteria: Classification) => {
  const algorand = AlgorandClient.defaultLocalNet()
  algorand.setDefaultValidityWindow(1000)

  const mnoAccount = algorand.account.fromMnemonic(DOAddress)

  const factory = algorand.client.getTypedAppFactory(DmlChainFactory, {
    defaultSender: mnoAccount.account.addr,
  })

  const client = await factory.getAppClientById({ defaultSender: mnoAccount.account.addr, appId: appID })
  const modelSelectionCriteria = await client.send.classModelSelectionCriteria({
    args: { modelEvaluationMetrics: selectionCriteria },
  })

  return modelSelectionCriteria.return
}

export const submitModelParams = async (ParameterData: ParamsData, DOAddress: string, appID: bigint) => {
  const algorand = AlgorandClient.defaultLocalNet()
  algorand.setDefaultValidityWindow(1000)

  const mnoAccount = algorand.account.fromMnemonic(DOAddress)

  const factory = algorand.client.getTypedAppFactory(DmlChainFactory, {
    defaultSender: mnoAccount.account.addr,
  })

  const client = await factory.getAppClientById({ defaultSender: mnoAccount.account.addr, appId: appID })

  const BoxMBRPay = await algorand.createTransaction.payment({
    sender: mnoAccount.account.addr,
    receiver: client.appAddress,
    amount: (1).algo(),
  })
  console.log(BoxMBRPay, 'storing params')

  const storeModelParameters = await client.send.storeModelParams({
    args: { mbrPay: BoxMBRPay, address: mnoAccount.account.addr, paramsData: ParameterData },
  })

  console.log(storeModelParameters, 'storing params')
}

export const getStoredModelParams = async (MOAddress: string, appID: bigint) => {
  const algorand = AlgorandClient.defaultLocalNet()

  const mnoAccount = algorand.account.fromMnemonic(MOAddress)

  const factory = algorand.client.getTypedAppFactory(DmlChainFactory, {
    defaultSender: mnoAccount.account.addr,
  })

  const client = await factory.getAppClientById({ defaultSender: mnoAccount.account.addr, appId: appID })

  try {
    const boxIDs = await algorand.app.getBoxNames(appID)

    const paramsMap: Record<string, { paramHash: string; paramKey: string }> = {}

    for (const box of boxIDs) {
      if (Object.keys(box.nameRaw).length === 32) {
        try {
          const extAddr = encodeAddress(box.nameRaw)
          const getParams = await (await client.send.getBoxValue({ args: { address: extAddr } })).return

          if (getParams?.paramHash && getParams?.paramKey) {
            paramsMap[extAddr] = {
              paramHash: getParams.paramHash,
              paramKey: getParams.paramKey,
            }
          }

          console.log('Added params for address', extAddr, paramsMap[extAddr])
        } catch (error) {
          console.error(`Error fetching box value for ${box.name}`, error)
        }
      }
    }

    return paramsMap
  } catch (error) {
    return {} as Record<string, { paramHash: string; paramKey: string }>
  }
}

export const getIpfsHash = async (appID: bigint) => {
  const algorand = AlgorandClient.defaultLocalNet()
  algorand.setDefaultValidityWindow(1000)

  const randAcc = generateAccount().mnemonic

  const mnoAccount = algorand.account.fromMnemonic(randAcc)

  const factory = algorand.client.getTypedAppFactory(DmlChainFactory, {
    defaultSender: mnoAccount.account.addr,
  })

  const client = await factory.getAppClientById({ defaultSender: mnoAccount.account.addr, appId: appID })

  const ipfsHash = await client.state.global.ipfsHash()

  return ipfsHash
}
