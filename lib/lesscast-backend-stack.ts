import * as cdk from '@aws-cdk/core';
import * as s3 from '@aws-cdk/aws-s3';
import * as s3n from '@aws-cdk/aws-s3-notifications';
import * as sqs from '@aws-cdk/aws-sqs';
import { Duration } from '@aws-cdk/core';

export class LesscastBackendStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const queue: sqs.Queue = new sqs.Queue(this, 's3_queue', {
      retentionPeriod: cdk.Duration.days(1),
      visibilityTimeout: cdk.Duration.hours(1),
    });
    const webBucket: s3.Bucket = new s3.Bucket(this, 'web', {
      publicReadAccess: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      websiteIndexDocument: "index.html"
    });
    const mediaBucket: s3.Bucket = new s3.Bucket(this, 'media', {
      publicReadAccess: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    mediaBucket.addObjectCreatedNotification(new s3n.SqsDestination(queue));
    
  }
}
