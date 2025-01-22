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
  console.log('myAccount:', acc)
  console.log('Account address as string:', acc.addr.toString())
  console.log('Private key as mnemonic:', algosdk.secretKeyToMnemonic(acc.sk))
  return algosdk.secretKeyToMnemonic(acc.sk)
}

export const createContract = async (ipfsHash: string, modelEvaluation: Classification, address: string) => {
  const algorand = AlgorandClient.defaultLocalNet()

  const dispenser = await algorand.account.localNetDispenser()

  const mnoAccount = algorand.account.fromMnemonic(address)

  await algorand.send.payment({
    sender: dispenser.addr,
    receiver: mnoAccount.account.addr,
    amount: (10).algo(),
  })

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

  const createBox = await client.send.storeClassificationSelectionCriteria({
    args: {
      evaluationMetrics: modelEvaluation,
      mbrPay: mbrPayFirstDeposit,
    },
  })

  console.log('this is create box', createBox)

  const getStoredcriteria = await client.send.getClassificationCriteria()

  console.log(getStoredcriteria, 'these are the metrics')

  return appID
}

export const modelSelectionCriteria = async (DOAddress: string, appID: bigint) => {
  const algorand = AlgorandClient.defaultLocalNet()
  algorand.setDefaultValidityWindow(1000)

  const criteria: Classification = {
    accuracy: 100n,
    precision: 10n,
    recall: 100n,
    f1score: 1000n,
  }

  const mnoAccount = algorand.account.fromMnemonic(DOAddress)

  const factory = algorand.client.getTypedAppFactory(DmlChainFactory, {
    defaultSender: mnoAccount.account.addr,
  })

  const client = await factory.getAppClientById({ defaultSender: mnoAccount.account.addr, appId: appID })
  const modelSelectionCriteria = await client.send.classModelSelectionCriteria({
    args: { modelEvaluationMetrics: criteria },
  })

  return modelSelectionCriteria.return
}

export const submitModelParams = async (ParameterData: ParamsData, DOAddress: string, appID: bigint) => {
  const algorand = AlgorandClient.defaultLocalNet()
  algorand.setDefaultValidityWindow(1000)

  const mnoAccount = algorand.account.fromMnemonic(DOAddress)

  const dispenser = await algorand.account.localNetDispenser()

  await algorand.send.payment({
    sender: dispenser.addr,
    receiver: mnoAccount.account.addr,
    amount: (1).algo(),
  })

  const factory = algorand.client.getTypedAppFactory(DmlChainFactory, {
    defaultSender: mnoAccount.account.addr,
  })

  const client = await factory.getAppClientById({ defaultSender: mnoAccount.account.addr, appId: appID })

  const BoxMBRPay = await algorand.createTransaction.payment({
    sender: mnoAccount.account.addr,
    receiver: client.appAddress,
    amount: (1).algo(),
  })

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

  const boxIDs = await algorand.app.getBoxNames(appID)

  console.log('there are boxes', boxIDs)

  boxIDs.forEach(async (box) => {
    if (Object.keys(box.nameRaw).length === 32) {
      try {
        const extAddr = encodeAddress(box.nameRaw)
        const getParams = await (await client.send.getBoxValue({ args: { address: extAddr } })).return
        const paramHash = getParams?.paramHash
        const paramKey = getParams?.paramKey
        console.log('these are params for address', extAddr, 'hash - ', paramHash, 'paramskey -', paramKey)
      } catch (error) {
        console.error(`Error fetching box value for ${box.name}`, error)
      }
    } else {
      console.warn(`Skipped API call for box with name: ${box.name} due to being <32 for address type`)
    }
  })
}
