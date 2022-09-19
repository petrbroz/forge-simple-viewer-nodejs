let { FORGE_CLIENT_ID, FORGE_CLIENT_SECRET, FORGE_BUCKET, PORT } = process.env;
if (!FORGE_CLIENT_ID || !FORGE_CLIENT_SECRET || !FORGE_BUCKET) {
    console.warn('Missing some of the environment variables.');
    process.exit(1);
}
PORT = PORT || 8080;

module.exports = {
    FORGE_CLIENT_ID,
    FORGE_CLIENT_SECRET,
    FORGE_BUCKET,
    PORT
};
