# type: ignore
import os

import requests
from dotenv import load_dotenv
import base64
from cryptography.fernet import Fernet
import pickle

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

def retrieve_model(ipfs_hash, contract_id):
  url = f"https://gateway.pinata.cloud/ipfs/{ipfs_hash}"
  response = requests.get(url, timeout=10)
  response.raise_for_status()

  folder_path = f'{contract_id}_model'
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
    cipher_suite = Fernet(decoded_key)
    decrypted_content = cipher_suite.decrypt(response.content)

    temp_file_path = f"{model_params_ipfs_hash}_params.pkl"
    try:
        with open(temp_file_path, 'wb') as temp_file:
            temp_file.write(decrypted_content)
        with open(temp_file_path, 'rb') as temp_file:
            decrypted_params = pickle.load(temp_file)
    finally:
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)

    return decrypted_params



