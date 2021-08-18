const { AuthenticationClient, DataManagementClient, ModelDerivativeClient, DataRetentionPolicy, urnify } = require('forge-server-utils');

const { FORGE_CLIENT_ID, FORGE_CLIENT_SECRET, FORGE_BUCKET } = process.env;
if (!FORGE_CLIENT_ID || !FORGE_CLIENT_SECRET) {
    console.warn('Missing some of the environment variables.');
    process.exit(1);
}
const BUCKET = FORGE_BUCKET || `${FORGE_CLIENT_ID.toLowerCase()}-basic-app`;

let authenticationClient = new AuthenticationClient(FORGE_CLIENT_ID, FORGE_CLIENT_SECRET);
let dataManagementClient = new DataManagementClient({ client_id: FORGE_CLIENT_ID, client_secret: FORGE_CLIENT_SECRET });
let modelDerivativeClient = new ModelDerivativeClient({ client_id: FORGE_CLIENT_ID, client_secret: FORGE_CLIENT_SECRET });

async function getPublicToken() {
    return authenticationClient.authenticate(['viewables:read']);
}

async function listModels() {
    const objects = await dataManagementClient.listObjects(BUCKET);
    return objects.map(obj => ({
        name: obj.objectKey,
        urn: urnify(obj.objectId)
    }));
}

async function ensureBucketExists() {
    try {
        await dataManagementClient.getBucketDetails(BUCKET);
    } catch (err) {
        if (err.statusCode === 404) {
            await dataManagementClient.createBucket(BUCKET, DataRetentionPolicy.Temporary);
        } else {
            throw err;
        }
    }
}

async function uploadModel(objectName, buffer, rootFilename) {
    const object = await dataManagementClient.uploadObject(BUCKET, objectName, 'application/octet-stream', buffer);
    await modelDerivativeClient.submitJob(urnify(object.objectId), [{ type: 'svf', views: ['2d', '3d'] }], rootFilename);
}

module.exports = {
    getPublicToken,
    listModels,
    ensureBucketExists,
    uploadModel
};
