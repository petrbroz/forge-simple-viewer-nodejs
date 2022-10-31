const express = require('express');
const { listObjects, getUploadUrl, finalizeUpload } = require('../services/forge/oss.js');
const { getManifest, urnify, translateObject } = require('../services/forge/md.js');

let router = express.Router();

// GET /api/models
// List all uploaded models.
router.get('/', async function (req, res, next) {
    try {
        const objects = await listObjects();
        res.json(objects.map(o => ({
            name: o.objectKey,
            urn: urnify(o.objectId)
        })));
    } catch (err) {
        next(err);
    }
});

// GET /api/models/:urn/status
// Get the translation status for specific model URN.
router.get('/:urn/status', async function (req, res, next) {
    try {
        const manifest = await getManifest(req.params.urn);
        if (manifest) {
            let messages = [];
            if (manifest.derivatives) {
                for (const derivative of manifest.derivatives) {
                    messages = messages.concat(derivative.messages || []);
                    if (derivative.children) {
                        for (const child of derivative.children) {
                            messages.concat(child.messages || []);
                        }
                    }
                }
            }
            res.json({ status: manifest.status, progress: manifest.progress, messages });
        } else {
            res.json({ status: 'n/a' });
        }
    } catch (err) {
        next(err);
    }
});

// POST /api/models/:objectKey[?uploadKey=...]
// Get a URL for direct upload to S3, or finalize the upload (if uploadKey is provided).
router.post('/:objectKey', async function (req, res, next) {
    try {
        const { objectKey } = req.params;
        const { uploadKey } = req.query;
        if (!uploadKey) {
            res.json(await getUploadUrl(objectKey));
        } else {
            const obj = await finalizeUpload(objectKey, uploadKey);
            await translateObject(urnify(obj.objectId));
            res.status(200).end();
        }
    } catch (err) {
        next(err);
    }
});

module.exports = router;
