import os
import time
from pymongo import MongoClient
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_CLIENT")
client = MongoClient(MONGO_URI)
db = client['DMLCHAIN']
user_collection = db['users']
reported_listing_collection = db['reportedListings']

def create_user(address):
  try:
    formatted_record = {
      "address": address,
      "reputation": 100,
      "createdListings": [],
      "subscribedListings": []
    }
    result = user_collection.insert_one(formatted_record)
    return result.inserted_id
  except Exception as e:
    print(f"An error occurred: {e}")
    return None

def address_exists(address):
    try:
        result = user_collection.find_one({"address": address})
        return result is not None
    except Exception as e:
        print(f"An error occurred: {e}")
        return False

def get_user_by_address(address):
  try:
    user_record = user_collection.find_one({"address": address})
    return user_record
  except Exception as e:
    print(f"An error occurred: {e}")
    return None

def add_listing_to_created(address, contract_id, created_at, expires_at, url):
  listing = {
    "contractId": contract_id,
    "createdAt": created_at,
    "expiresAt": expires_at,
    "url": url
  }
  try:
    user_collection.update_one(
      {"address": address},
      {"$push": {"createdListings": listing}}
    )
    return True
  except Exception as e:
    print(f"An error occurred: {e}")
    return None

def add_listing_to_subscribed(address, contract_id, created_at, expires_at, url, creator_address, reputation):
  listing = {
    "creatorAddress": creator_address,
    "reputation": reputation,
    "contractId": contract_id,
    "createdAt": created_at,
    "expiresAt": expires_at,
    "url": url,
    "feedback": False
  }
  try:
    user = user_collection.find_one({
      "address": address,
      "subscribedListings.contractId": contract_id
    })

    if user:
      return False

    user_collection.update_one(
      {"address": address},
      {"$push": {"subscribedListings": listing}}
    )
    return True
  except Exception as e:
    print(f"An error occurred: {e}")
    return None

def get_subscribed_listings(address):
  try:
    user = get_user_by_address(address)
    if not user:
      return None

    subscribed_listings = user.get('subscribedListings', [])
    return subscribed_listings
  except Exception as e:
    print(f"An error occurred: {e}")
    return None

def get_filtered_listings(requested_address):
  try:
    user = get_user_by_address(requested_address)
    if not user:
      return None

    user_reputation = user.get('reputation', 0)
    current_time = int(time.time())

    all_users = user_collection.find({})
    filtered_listings = []

    for user in all_users:
      for listing in user.get('createdListings', []):
        expires_at = datetime.strptime(listing.get('expiresAt'), "%Y-%m-%dT%H:%M:%S.%fZ").timestamp()
        if int(expires_at) > current_time:
          creator_reputation = user.get('reputation', 0)
          if creator_reputation <= user_reputation:
            listing['creator'] = user['address']
            listing['reputation'] = creator_reputation
            filtered_listings.append(listing)

    return filtered_listings

  except Exception as e:
    print(f"An error occurred: {e}")
    return None

def update_user_reputation(address, new_reputation):
  try:
    result = user_collection.update_one(
      {"address": address},
      {"$set": {"reputation": new_reputation}}
    )
    return result.modified_count > 0
  except Exception as e:
    print(f"An error occurred: {e}")
    return False

def get_created_listings(address):
  try:
    user = get_user_by_address(address)
    if not user:
      return None

    created_listings = user.get('createdListings', [])
    return created_listings
  except Exception as e:
    print(f"An error occurred: {e}")
    return None


def mark_contract_as_paid(address, contract_id):
  try:
    result = user_collection.update_one(
      {"address": address, "createdListings.contractId": contract_id},
      {"$set": {"createdListings.$.paid": True}}
    )
    if result.modified_count > 0:
      return True
    else:
      print(f"No matching document found for address {address} and contract ID {contract_id}")
      return False
  except Exception as e:
    print(f"An error occurred while marking contract as paid: {e}")
    return False


def update_feedback(subscriber_address, contract_id, feedback_value):
  try:
    result = user_collection.update_one(
      {"address": subscriber_address, "subscribedListings.contractId": contract_id},
      {"$set": {"subscribedListings.$.feedback": feedback_value}}
    )
    if result.modified_count > 0:
      return True
    else:
      print(f"No matching subscription found for address {subscriber_address} and contract ID {contract_id}")
      return False
  except Exception as e:
    print(f"An error occurred while updating feedback: {e}")
    return None

def add_reported_listing(contract_id):
    try:
        existing_report = reported_listing_collection.find_one({"contractId": contract_id})
        if existing_report:
            return False

        creator = user_collection.find_one(
            {"createdListings.contractId": contract_id},
            {"address": 1}
        )

        if not creator:
            return False

        subscribers = user_collection.find(
            {"subscribedListings.contractId": contract_id},
            {"address": 1}
        )

        subscriber_addresses = [subscriber["address"] for subscriber in subscribers]

        if not subscriber_addresses:
            return False

        report_record = {
            "contractId": contract_id,
            "creatorAddress": creator["address"],
            "subscriberAddresses": subscriber_addresses,
            "reportedAt": datetime.now(),
            "status": "pending"
        }

        result = reported_listing_collection.insert_one(report_record)
        return result.inserted_id

    except Exception as e:
        print(f"An error occurred while reporting listing: {e}")
        return None

def get_reported_listings():
  try:
    reports = list(reported_listing_collection.find({}, {"_id": 0}))
    return reports
  except Exception as e:
    print(f"An error occurred while fetching reported listings: {e}")
    return None

def update_reported_listing_status(contract_id: int, status: str):
    try:
        # Update status in reported listings
        result = reported_listing_collection.update_one(
            {"contractId": contract_id},
            {"$set": {"status": status}}
        )

        if result.modified_count == 0:
            return False

        # Find all users with this contract in their created listings and update paid status
        user_collection.update_many(
            {"createdListings.contractId": contract_id},
            {"$set": {"createdListings.$.paid": True}}
        )

        return True
    except Exception as e:
        print(f"An error occurred while updating reported listing status: {e}")
        return False
