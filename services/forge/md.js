function urnify(id) {
    return Buffer.from(id).toString('base64').replace(/=/g, '');
}

module.exports = {
    urnify
};
