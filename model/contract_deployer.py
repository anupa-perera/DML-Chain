import sys
from pathlib import Path

project_root = Path(__file__).parent.parent.parent
sys.path.append(str(project_root))



import algokit_utils
from algokit_utils.beta.algorand_client import AlgorandClient, PayParams

from smart_contracts.artifacts.moderator.moderator_client import (
    ModeratorClient,
)


def deploy(
    ipfsHash: str,
    modelParameters: str,
) -> None:
    algorand = AlgorandClient.default_local_net()
    algorand.set_default_validity_window(1000)

    dispenser = algorand.account.dispenser()

    acct = algorand.account.random()

    algorand.send.payment(
        PayParams(sender=dispenser.address, receiver=acct.address, amount=10_000_000),
    )

    app_client = ModeratorClient(
        algod_client=algorand.client.algod,
        creator=acct.address,
        indexer_client=algorand.client.indexer,
        signer=acct.signer,
    )

    print(f"deploying: {app_client.app_id}")

    app_client.deploy(
        on_schema_break=algokit_utils.OnSchemaBreak.AppendApp,
        on_update=algokit_utils.OnUpdate.AppendApp,
    )

    response = app_client.hash(ipfsHash=ipfsHash)
    params = app_client.model_parameters(modelParameters=modelParameters)
    print(f"{app_client.app_id} received: {response.return_value}")
    print(f"{app_client.app_id} received: {params.return_value}")
