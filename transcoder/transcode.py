#!/usr/bin/env python3

import argparse
import subprocess
import os
import sys
import boto3

def transcode(filepath, bucket):
    encode_filepath = f'{os.path.splitext(filepath)[0]}.mp3'
    cmd = (
        'ffmpeg',
        '-i',
        filepath,
        '-q:a',
        '0',
        '-map',
        'a',
        encode_filepath
    )
    try:
        subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, check=True)
    except subprocess.CalledProcessError as err:
        sys.exit(f'Failed to encode {filepath} to {encode_filepath}: {err.stderr}\n') 

    bucket.upload_file(encode_filepath, f"audio/{os.path.basename(encode_filepath)}")

def process_message(msg, bucket_name):
    s3 = boto3.resource('s3')
    bucket = s3.Bucket(bucket_name)
    event = msg['body']['Records'][0]
    if not event['eventName'].startswith('ObjectCreated'):
        print(f"Skipping event {event['eventName']}", file=sys.stderr)
        sys.exit()
    object = event['s3']['object']
    local_filepath = os.path.basename(object['key'])
    bucket.download_file(object['key'], local_filepath)
    transcode(local_filepath, bucket)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('bucket', metavar='BUCKET', help='S3 Bucket')
    parser.add_argument('sqs_queue_url', metavar='SQS_QUEUE_URL', help='SQS Queue URL')
    args = parser.parse_args()
    sqs = boto3.client('sqs')
    process_message(sqs.receive_message(QueueUrl=args.sqs_queue_url), args.bucket)

if __name__ == '__main__':
    main()