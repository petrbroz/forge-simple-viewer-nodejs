const fs = require('fs');
const { AuthenticationClient, OSSClient, ModelDerivativeClient, urnify } = require('simpler-forge-apis');

const { FORGE_CLIENT_ID, FORGE_CLIENT_SECRET, FORGE_BUCKET } = process.env;
if (!FORGE_CLIENT_ID || !FORGE_CLIENT_SECRET) {
    console.warn('Missing some of the environment variables.');
    process.exit(1);
}
const BUCKET = FORGE_BUCKET || `${FORGE_CLIENT_ID.toLowerCase()}-basic-app`;

const authenticationClient = new AuthenticationClient(FORGE_CLIENT_ID, FORGE_CLIENT_SECRET);
const ossClient = new OSSClient({ client_id: FORGE_CLIENT_ID, client_secret: FORGE_CLIENT_SECRET });
const modelDerivativeClient = new ModelDerivativeClient({ client_id: FORGE_CLIENT_ID, client_secret: FORGE_CLIENT_SECRET });

async function _ensureBucketExists() {
    try {
        await ossClient.getBucketDetails(BUCKET);
    } catch (err) {
        if (err.statusCode === 404) {
            await ossClient.createBucket(BUCKET, 'temporary');
        } else {
            throw err;
        }
    }
}

async function getPublicToken() {
    return authenticationClient.authenticate(['viewables:read']);
}

async function listModels() {
    await _ensureBucketExists(); // Remove this if we can assume the bucket to exist
    const objects = await ossClient.listObjects(BUCKET);
    return objects.map(obj => ({ name: obj.objectKey, urn: urnify(obj.objectId) }));
}

async function uploadModel(objectName, filePath, rootFilename) {
    await _ensureBucketExists(); // Remove this if we can assume the bucket to exist
    const obj = await ossClient.uploadObject(BUCKET, objectName, fs.readFileSync(filePath));
    await modelDerivativeClient.submitJob(urnify(obj.objectId), [{ type: 'svf', views: ['2d', '3d'] }], rootFilename);
}

module.exports = {
    getPublicToken,
    listModels,
    uploadModel
};
