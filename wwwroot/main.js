import { initViewer, loadModel } from './viewer.js';

initViewer(document.getElementById('preview')).then(viewer => {
    const overlay = document.getElementById('overlay');
    const urn = window.location.hash?.substring(1);
    if (urn) {
        overlay.style.display = 'none';
        console.time('svf2-loading-time');
        viewer.addEventListener(Autodesk.Viewing.GEOMETRY_LOADED_EVENT, function () {
            console.timeEnd('svf2-loading-time');
        });
        loadModel(viewer, urn);
    } else {
        overlay.style.display = 'block';
        overlay.innerHTML = `
            Provide the URN of your model in the URL separated by <code>#</code>, for example,
            <code>http://localhost:8080#dXJuOmFkc2sub2JqZWN0czpvcy5vYmplY3Q6YnJvenAtZGVidWctdG1wLzIwMjExMTEyJTIwSUZDLmlmYw</code>
        `;
    }
});
