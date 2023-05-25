import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { LogGroup } from 'aws-cdk-lib/aws-logs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';

export class PresignedUrlUsingTemporaryConditionalCredentialsForAmazonS3Stack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const bucket = this.createSharedBucket();
    const presignedUrlRole = this.createPresignedUrlRole(bucket);
    this.createPresignedUrlLambda(presignedUrlRole, bucket);
  }

  private createSharedBucket() {
    const accessLogsBucket = new s3.Bucket(this, 'AccessLogsBucket', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL
    });

    const fileBucket = new s3.Bucket(this, 'DemoBucket', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      serverAccessLogsBucket: accessLogsBucket,
      serverAccessLogsPrefix: 'logs'
    });

    new s3deploy.BucketDeployment(this, 'DeployTestFiles', {
      sources: [s3deploy.Source.asset('./demofiles')],
      destinationBucket: fileBucket
    });

    return fileBucket;
  }

  private createPresignedUrlRole(bucket: cdk.aws_s3.Bucket) {
    return new iam.Role(this, 'PresignedUrlRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      inlinePolicies: {
        'AllowS3BucketObjectAccess': new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                's3:GetObject',
              ],
              resources: [
                bucket.bucketArn + '/*'
              ]
            })
          ]
        })
      }
    });
  }

  private createPresignedUrlLambda(presignedUrlRole: cdk.aws_iam.Role, bucket: cdk.aws_s3.Bucket) {
    const presignedUrlLamnda = new lambda.Function(this, 'PresignedUrlLambda', {
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'presigned-url.handler',
      code: lambda.Code.fromAsset('lambda'),
      environment: {
        PRESIGN_URL_ROLE_ARN: presignedUrlRole.roleArn,
        BUCKET_ARN: bucket.bucketArn,
        BUCKET_NAME: bucket.bucketName
      }
    });
    presignedUrlRole.assumeRolePolicy?.addStatements(new iam.PolicyStatement({
      actions: ['sts:AssumeRole'],
      effect: iam.Effect.ALLOW,
      principals: [iam.Role.fromRoleArn(this, 'PresignedUrlRoleFromRoleArn', presignedUrlLamnda.role?.roleArn!)]
    }));

    new LogGroup(this, 'PresignedUrlLambdaLogGroup', {
      logGroupName: '/aws/lambda/' + presignedUrlLamnda.functionName,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    new cdk.CfnOutput(this, 'PresignedUrlLambdaFunctionName', { value: presignedUrlLamnda.functionName });
    new cdk.CfnOutput(this, 'PresignedUrlLambdaCLICommand', { value: 'aws lambda invoke --function-name ' + presignedUrlLamnda.functionName + ' --payload \'{ "objectKey": "demo.html", "sourceIp": "192.168.0.1" }\' --output text --cli-binary-format raw-in-base64-out output.txt' });
  }
}
