const AWS = require('aws-sdk');
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
    let expireSeconds = 3600

    // Create temporary credentials using the policy
    var credentials = await new AWS.ChainableTemporaryCredentials({
        params: {
            RoleArn: roleToAssumeArn,
            Policy: JSON.stringify(s3Policy),
            DurationSeconds: expireSeconds
        },
        Credentials: {
            AccessKeyId: AWS.config.credentials.AccessKeyId,
            SecretAccessKey: AWS.config.credentials.SecretAccessKey,
            SessionToken: AWS.config.credentials.SessionToken
        }
    });

    // Create a new S3 client using the temporary credentials
    const s3 = new AWS.S3(new AWS.Config({
        credentials: credentials
    }));

    const s3Params = {
        Bucket: bucketName,
        Key: objectKey,
        Expires: expireSeconds
    };

    return await s3.getSignedUrlPromise('getObject', s3Params);
};