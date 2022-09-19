const express = require('express');
const { listObjects } = require('../services/forge/oss.js');
const { urnify } = require('../services/forge/md.js');

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

module.exports = router;
