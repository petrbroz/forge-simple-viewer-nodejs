/// import * as Autodesk from "@types/forge-viewer";

/**
 * Initializes new viewer.
 * @param {HTMLElement} container Container element.
 * @returns {Promise<Autodesk.Viewing.GuiViewer3D>}
 */
export async function initViewer(container, extensions) {
    async function getAccessToken(callback) {
        const resp = await fetch('/api/auth/token');
        if (resp.ok) {
            const { access_token, expires_in } = await resp.json();
            callback(access_token, expires_in);
        } else {
            alert('Could not obtain access token. See the console for more details.');
            console.error(await resp.text());
        }
    }
    return new Promise(function (resolve, reject) {
        Autodesk.Viewing.Initializer({ getAccessToken }, async function () {
            const viewer = new Autodesk.Viewing.GuiViewer3D(container, { extensions });
            viewer.start();
            viewer.setTheme('light-theme');
            resolve(viewer);
        });
    });
}

export function loadModel(viewer, urn) {
    return new Promise(function (resolve, reject) {
        function onDocumentLoadSuccess(doc) {
            viewer.loadDocumentNode(doc, doc.getRoot().getDefaultGeometry()).then(model => resolve(model));
        }
        function onDocumentLoadFailure(code, message) {
            reject(message);
        }
        Autodesk.Viewing.Document.load('urn:' + urn, onDocumentLoadSuccess, onDocumentLoadFailure);
    });
}
