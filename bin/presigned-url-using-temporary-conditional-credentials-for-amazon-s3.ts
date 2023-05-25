#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { PresignedUrlUsingTemporaryConditionalCredentialsForAmazonS3Stack } from '../lib/presigned-url-using-temporary-conditional-credentials-for-amazon-s3-stack';

const app = new cdk.App();
new PresignedUrlUsingTemporaryConditionalCredentialsForAmazonS3Stack(app, process.env.CDK_SAMPLE_STACK_ID || 'PresignedUrlUsingTemporaryConditionalCredentialsForAmazonS3Stack', {
  env: {
    account: process.env.CDK_SAMPLE_ACCOUNT || process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_SAMPLE_REGION || process.env.CDK_DEFAULT_REGION
  }
});