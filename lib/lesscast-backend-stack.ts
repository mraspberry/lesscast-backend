import * as cdk from '@aws-cdk/core';
import * as ecs from '@aws-cdk/aws-ecs';
import * as ecsPatterns from '@aws-cdk/aws-ecs-patterns';
import * as s3 from '@aws-cdk/aws-s3';
import * as s3n from '@aws-cdk/aws-s3-notifications';
import * as sqs from '@aws-cdk/aws-sqs';

export class LesscastBackendStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Basic objects
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

    const image: ecs.ContainerImage = ecs.ContainerImage.fromAsset('transcoder');
    const scalingSteps = [
      {change: -1, upper: 0},
      {change: 1, lower: 0},
    ];
    const command = [mediaBucket.bucketName, queue.queueUrl];
    const ecsServiceConfig = { image, command, scalingSteps, queue, cpu: 4096 };
    const ecsService = new ecsPatterns.QueueProcessingFargateService(
      this, "transcoder_service", ecsServiceConfig,
    );

    // Permission grants
    mediaBucket.addObjectCreatedNotification(new s3n.SqsDestination(queue), {
      prefix: 'video/'
    });
    mediaBucket.grantReadWrite(ecsService.taskDefinition.taskRole);
    
  }
}
