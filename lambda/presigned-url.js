const { STSClient, AssumeRoleCommand, GetCallerIdentityCommand } = require('@aws-sdk/client-sts');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const roleToAssumeArn = process.env.PRESIGN_URL_ROLE_ARN;
const bucketArn = process.env.BUCKET_ARN;
const bucketName = process.env.BUCKET_NAME;

exports.handler = async (event) => {
    console.log(event);

    const objectKey = event.objectKey;
    const ipAddress = event.sourceIp;

    // Policy that will restrict access to the object to the source IP address
    const s3Policy = {
        Version: '2012-10-17',
        Statement: [{
            Effect: 'Allow',
            Action: 's3:GetObject',
            Resource: bucketArn + '/' + objectKey,
            Condition: {
                IpAddress: {
                    'aws:SourceIp': ipAddress
                }
            }
        }]
    };

    // Temp credentials created this way have a max session lifetime of 1 hr (3600 seconds)
    let expireSeconds = 3600;

    // Create temporary credentials using the policy
    const stsClient = new STSClient();
    const callerIdentity = await stsClient.send(new GetCallerIdentityCommand({}));
    const assumedRoleCredentials = await stsClient.send(new AssumeRoleCommand({
        RoleArn: roleToAssumeArn,
        Policy: JSON.stringify(s3Policy),
        DurationSeconds: expireSeconds,
        RoleSessionName: callerIdentity.Arn.split('/')[1]
    }));

    // Create a new S3 client using the temporary credentials
    const s3 = new S3Client({
        credentials: {
            accessKeyId: assumedRoleCredentials.Credentials.AccessKeyId,
            secretAccessKey: assumedRoleCredentials.Credentials.SecretAccessKey,
            sessionToken: assumedRoleCredentials.Credentials.SessionToken,
            expiration: assumedRoleCredentials.Credentials.Expiration
        }
    });

    const s3Params = {
        Bucket: bucketName,
        Key: objectKey
    };

    const signedUrl = await getSignedUrl(
        s3,
        new GetObjectCommand(s3Params),
        { expiresIn: expireSeconds }
    );

    return signedUrl;
};