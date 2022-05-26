const options = {
    env: 'AutodeskProduction2',
    api: 'streamingV2',
    getAccessToken
};

Autodesk.Viewing.Initializer(options, function () {
    const urn = window.location.hash?.substring(1);
    if (urn) {
        const viewer = new Autodesk.Viewing.GuiViewer3D(document.getElementById('preview'));
        viewer.start();
        loadModel(viewer, urn);
    } else {
        preview.innerHTML = `
            Provide the URN of your model in the URL separated by <code>#</code>, for example,
            <code>http://localhost:8080#dXJuOmFkc2sub2JqZWN0czpvcy5vYmplY3Q6YnJvenAtZGVidWctdG1wLzIwMjExMTEyJTIwSUZDLmlmYw</code>
        `;
        preview.style.setProperty('text-align', 'center');
    }
});

async function getAccessToken(callback) {
    try {
        const resp = await fetch('/api/auth/token');
        if (!resp.ok) {
            throw new Error(await resp.text());
        }
        const { access_token, expires_in } = await resp.json();
        callback(access_token, expires_in);
    } catch (err) {
        alert('Could not obtain access token. See the console for more details.');
        console.error(err);
    }
}

function loadModel(viewer, urn) {
    return new Promise(function (resolve, reject) {
        function onDocumentLoadSuccess(doc) {
            resolve(viewer.loadDocumentNode(doc, doc.getRoot().getDefaultGeometry()));
        }
        function onDocumentLoadFailure(code, message, errors) {
            reject({ code, message, errors });
        }
        Autodesk.Viewing.Document.load('urn:' + urn, onDocumentLoadSuccess, onDocumentLoadFailure);
    });
}
