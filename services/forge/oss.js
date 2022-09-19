const { ObjectsApi } = require('forge-apis');
const { FORGE_BUCKET } = require('../../config.js');
const { getInternalToken } = require('./auth.js');

async function listObjects() {
    let resp = await new ObjectsApi().getObjects(FORGE_BUCKET, { limit: 64 }, null, await getInternalToken());
    let objects = resp.body.items;
    while (resp.body.next) {
        const startAt = new URL(resp.body.next).searchParams.get('startAt');
        resp = await new ObjectsApi().getObjects(FORGE_BUCKET, { limit: 64, startAt }, null, await getInternalToken());
        objects = objects.concat(resp.body.items);
    }
    return objects;
}

module.exports = {
    listObjects
};
