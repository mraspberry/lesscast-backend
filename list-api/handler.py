#!/usr/bin/env python3

import json
import os
import traceback

import boto3


def _handle():
    client = boto3.client("s3")
    objects = client.list_objects(Bucket=os.getenv("MEDIA_BUCKET"), Prefix="audio/")
    results = {"Bucket": os.getenv("MEDIA_BUCKET"), "Objects": list()}
    for s3obj in objects.get("Contents", list()):  # might be empty
        results["Objects"].append({"Key": s3obj["Key"], "Size": s3obj["Size"]})
    print(json.dumps(results, indent=2))
    return results


def handle(*unused):
    print("In handler")
    try:
        return {"statusCode": 200, "body": json.dumps(_handle())}
    except BaseException as err:
        traceback.print_exc()
        return {"statusCode": 500, "body": json.dumps({"errorMessage": str(err)})}


if __name__ == "__main__":
    print(json.dumps(handle(), indent=2))
