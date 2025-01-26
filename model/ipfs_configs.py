# type: ignore
import os

import requests
from dotenv import load_dotenv
import base64
from cryptography.fernet import Fernet

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

def retrieve_model(ipfs_hash):
  url = f"https://gateway.pinata.cloud/ipfs/{ipfs_hash}"
  response = requests.get(url, timeout=10)
  response.raise_for_status()

  folder_path = f'{ipfs_hash}_model'
  os.makedirs(folder_path, exist_ok=True)

  filepath = os.path.join(folder_path, f'model.ipynb')
  with open(filepath, 'wb') as f:
    f.write(response.content)
  return filepath

def retrieve_model_params(model_params_ipfs_hash, key):
  url = f"https://gateway.pinata.cloud/ipfs/{model_params_ipfs_hash}"
  response = requests.get(url, timeout=10)
  response.raise_for_status()

  decoded_key = base64.b64decode(key)
  f = Fernet(decoded_key)
  decrypted_content = f.decrypt(response.content)
  with open(f'{model_params_ipfs_hash}_params.txt', 'wb') as f:
    f.write(decrypted_content)
  return decrypted_content.decode()




