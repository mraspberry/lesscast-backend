import * as apigateway from '@aws-cdk/aws-apigateway';
import * as cdk from "@aws-cdk/core";
import * as ec2 from '@aws-cdk/aws-ec2';
import * as ecs from "@aws-cdk/aws-ecs";
import * as ecsPatterns from "@aws-cdk/aws-ecs-patterns";
import * as lambda from '@aws-cdk/aws-lambda';
import * as s3 from "@aws-cdk/aws-s3";
import * as s3n from "@aws-cdk/aws-s3-notifications";
import * as sqs from "@aws-cdk/aws-sqs";
import * as path from 'path';

export class LesscastBackendStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Basic objects
    const queue: sqs.Queue = new sqs.Queue(this, "s3_queue", {
      retentionPeriod: cdk.Duration.days(1),
      visibilityTimeout: cdk.Duration.hours(1),
    });
    const mediaBucket: s3.Bucket = new s3.Bucket(this, "media", {
      publicReadAccess: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const containerImage: ecs.ContainerImage = ecs.ContainerImage.fromRegistry(
      "ghcr.io/mraspberry/lesscast-transcoder:0.9"
    );
    const vpc: ec2.Vpc = new ec2.Vpc(this, 'lcvpc', {natGateways: 1});
    const ecsService = new ecsPatterns.QueueProcessingFargateService(
      this,
      "transcoder_service",
      {
        vpc: vpc, 
        minScalingCapacity: 0,
        capacityProviderStrategies: [
          {
            capacityProvider: "FARGATE_SPOT",
            weight: 4,
          },
          {
            capacityProvider: "FARGATE",
            weight: 1,
          },
        ],
        image: containerImage,
        scalingSteps: [
          { change: -1, upper: 0 },
          { change: 1, lower: 1 },
        ],
        queue: queue,
        cpu: 512,
        memoryLimitMiB: 2048,
      }
    );
    const api: apigateway.RestApi = new apigateway.RestApi(this, 'backend-api',{
      description: 'API to interact with media'
    });
    new cdk.CfnOutput(this, 'api-url', {value: api.url});

    const listHandler: lambda.Function = new lambda.Function(this, 'list-api-handler',{
      handler: 'handler.handle',
      code: lambda.Code.fromAsset(path.join(__dirname, '../list-api')),
      runtime: lambda.Runtime.PYTHON_3_9,
      environment: {"MEDIA_BUCKET": mediaBucket.bucketName}
    });
    const listMedia: apigateway.Resource = api.root.addResource('list-media');
    listMedia.addMethod('GEt', new apigateway.LambdaIntegration(listHandler));

    // Permission grants
    mediaBucket.addObjectCreatedNotification(new s3n.SqsDestination(queue), {
      prefix: "video/",
    });
    mediaBucket.grantReadWrite(ecsService.taskDefinition.taskRole);
    mediaBucket.grantRead(listHandler);
  }
}
