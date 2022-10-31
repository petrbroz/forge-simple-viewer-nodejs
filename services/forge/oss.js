const axios = require('axios');
const { BucketsApi, ObjectsApi } = require('forge-apis');
const { FORGE_BUCKET } = require('../../config.js');
const { getInternalToken } = require('./auth.js');

async function ensureBucketExists(bucketKey) {
    try {
        await new BucketsApi().getBucketDetails(bucketKey, null, await getInternalToken());
    } catch (err) {
        if (err.response.status === 404) {
            await new BucketsApi().createBucket({ bucketKey, policyKey: 'temporary' }, {}, null, await getInternalToken());
        } else {
            throw err;
        }
    }
}

async function listObjects() {
    await ensureBucketExists(FORGE_BUCKET);
    let resp = await new ObjectsApi().getObjects(FORGE_BUCKET, { limit: 64 }, null, await getInternalToken());
    let objects = resp.body.items;
    while (resp.body.next) {
        const startAt = new URL(resp.body.next).searchParams.get('startAt');
        resp = await new ObjectsApi().getObjects(FORGE_BUCKET, { limit: 64, startAt }, null, await getInternalToken());
        objects = objects.concat(resp.body.items);
    }
    return objects;
}

async function getUploadUrl(objectKey) {
    const auth = await getInternalToken();
    const resp = await axios.get(`https://developer.api.autodesk.com/oss/v2/buckets/${encodeURIComponent(FORGE_BUCKET)}/objects/${encodeURIComponent(objectKey)}/signeds3upload`, {
        headers: {
            'Authorization': 'Bearer ' + auth.access_token
        }
    });
    return resp.data;
}

async function finalizeUpload(objectKey, uploadKey) {
    const auth = await getInternalToken();
    const resp = await axios.post(`https://developer.api.autodesk.com/oss/v2/buckets/${encodeURIComponent(FORGE_BUCKET)}/objects/${encodeURIComponent(objectKey)}/signeds3upload`, { uploadKey }, {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + auth.access_token
        }
    });
    return resp.data;
}

module.exports = {
    listObjects,
    getUploadUrl,
    finalizeUpload
};
