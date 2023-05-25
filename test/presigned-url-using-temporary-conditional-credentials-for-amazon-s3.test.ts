import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import * as PresignedUrlUsingTemporaryConditionalCredentialsForAmazonS3 from '../lib/presigned-url-using-temporary-conditional-credentials-for-amazon-s3-stack';

test('Resources created', () => {
    const app = new cdk.App();
    const stack = new PresignedUrlUsingTemporaryConditionalCredentialsForAmazonS3.PresignedUrlUsingTemporaryConditionalCredentialsForAmazonS3Stack(app, 'MyTestStack');
    const template = Template.fromStack(stack);
    template.hasResource('AWS::S3::Bucket', {
    });
    template.hasResource('AWS::Lambda::Function', {
    });
    template.hasResource('AWS::IAM::Policy', {
    });
});
