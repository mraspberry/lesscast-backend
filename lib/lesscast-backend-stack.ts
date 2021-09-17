import * as cdk from "@aws-cdk/core";
import * as ecs from "@aws-cdk/aws-ecs";
import * as ecsPatterns from "@aws-cdk/aws-ecs-patterns";
import * as s3 from "@aws-cdk/aws-s3";
import * as s3n from "@aws-cdk/aws-s3-notifications";
import * as sqs from "@aws-cdk/aws-sqs";

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
    const ecsService = new ecsPatterns.QueueProcessingFargateService(
      this,
      "transcoder_service",
      {
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
        memoryLimitMiB: 1024,
      }
    );

    // Permission grants
    mediaBucket.addObjectCreatedNotification(new s3n.SqsDestination(queue), {
      prefix: "video/",
    });
    mediaBucket.grantReadWrite(ecsService.taskDefinition.taskRole);
  }
}
