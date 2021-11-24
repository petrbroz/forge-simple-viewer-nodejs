import { initViewer, loadModel } from './viewer.js';

initViewer(document.getElementById('preview')).then(viewer => {
    const urn = window.location.hash ? window.location.hash.substr(1) : null;
    setupModelSelection(viewer, urn);

    document.getElementById('npr-white').addEventListener('click', async function () {
        viewer.setBackgroundColor(255, 255, 255, 255, 255, 255);
        const ext = await viewer.loadExtension('Autodesk.NPR');
        ext.setParameter('style', 'graphite');
        ext.setParameter('brightness', 1.0);
        viewer.setSelectionColor(new THREE.Color(1.0, 1.0, 1.0));
    });
    document.getElementById('npr-blue').addEventListener('click', async function () {
        viewer.setBackgroundColor(255, 255, 255, 255, 255, 255);
        const ext = await viewer.loadExtension('Autodesk.NPR');
        ext.setParameter('style', 'graphite');
        ext.setParameter('brightness', 1.0);
        viewer.setSelectionColor(new THREE.Color(0.3, 0.6, 0.9));
    });
});

async function setupModelSelection(viewer, selectedUrn) {
    const models = document.getElementById('models');
    models.innerHTML = '';
    const resp = await fetch('/api/models');
    if (resp.ok) {
        for (const model of await resp.json()) {
            const option = document.createElement('option');
            option.innerText = model.name;
            option.setAttribute('value', model.urn);
            if (model.urn === selectedUrn) {
                option.setAttribute('selected', 'true');
            }
            models.appendChild(option);
        }
    } else {
        alert('Could not list models. See the console for more details.');
        console.error(await resp.text());
    }
    models.onchange = () => {
        window.location.hash = models.value;
        loadModel(viewer, models.value);
    }
    if (!viewer.model && models.value) {
        models.onchange();
    }
}
