# type: ignore
import os

import requests
from dotenv import load_dotenv

load_dotenv()


def retrieve_from_pinata(filepath, jwt_token):
    url = "https://api.pinata.cloud/pinning/pinFileToIPFS"
    headers = {"Authorization": f"Bearer {jwt_token}"}

    with open(filepath, "rb") as file:
        response = requests.post(url, files={"file": file}, headers=headers)
        return response.json()


def upload_file_to_ipfs(filepath):
    PINATA_JWT_TOKEN = os.getenv("PINATA_JWT_TOKEN")
    ipfs_hash = retrieve_from_pinata(filepath, PINATA_JWT_TOKEN).get("IpfsHash")

    with open("model_hash", "w") as hash_file:
        hash_file.write(ipfs_hash)

    return ipfs_hash
