import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_CLIENT")
client = MongoClient(MONGO_URI)
db = client['DMLCHAIN']
collection = db['users']

def create_user(address):
  try:
    formatted_record = {
      "address": address,
      "reputation": 100,
      "createdListings": [],
      "subscribedListings": []
    }
    result = collection.insert_one(formatted_record)
    return result.inserted_id
  except Exception as e:
    print(f"An error occurred: {e}")
    return None

def address_exists(address):
    try:
        result = collection.find_one({"address": address})
        return result is not None
    except Exception as e:
        print(f"An error occurred: {e}")
        return False

def get_user_by_address(address):
  try:
    user_record = collection.find_one({"address": address})
    return user_record
  except Exception as e:
    print(f"An error occurred: {e}")
    return None

def add_listing_to_created(address, contract_id, created_at, expires_at):
  listing = {
    "contractId": contract_id,
    "createdAt": created_at,
    "expiresAt": expires_at
  }
  try:
    collection.update_one(
      {"address": address},
      {"$push": {"createdListings": listing}}
    )
    return True
  except Exception as e:
    print(f"An error occurred: {e}")
    return None


