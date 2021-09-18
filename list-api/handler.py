#!/usr/bin/env python3

import json
import os
import boto3


def _handle():
    client = boto3.client("s3")
    objects = client.list_objects(Bucket=os.getenv("MEDIA_BUCKET"), Prefix="audio/")
    results = {"Bucket": os.getenv("MEDIA_BUCKET"), "Objects": list()}
    for s3obj in objects["Contents"]:
        results["Objects"].append({"Key": s3obj["Key"], "Size": s3obj["Size"]})
    return results


def handle(*unused):
    try:
        return _handle()
    except Exception as err:
        return {"statusCode": 500, "errorMessage": str(err)}


if __name__ == "__main__":
    print(json.dumps(handle(), indent=2))
