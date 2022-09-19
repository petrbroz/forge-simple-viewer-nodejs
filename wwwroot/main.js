import { initViewer, loadModel } from './viewer.js';

initViewer(document.getElementById('preview')).then(viewer => {
    const urn = window.location.hash?.substring(1);
    setupModelSelection(viewer, urn);
});

async function setupModelSelection(viewer, selectedUrn) {
    const dropdown = document.getElementById('models');
    dropdown.innerHTML = '';
    try {
        const resp = await fetch('/api/models');
        if (!resp.ok) {
            throw new Error(await resp.text());
        }
        const models = await resp.json();
        dropdown.innerHTML = models.map(model => `<option value=${model.urn} ${model.urn === selectedUrn ? 'selected' : ''}>${model.name}</option>`).join('\n');
        dropdown.onchange = () => {
            window.location.hash = dropdown.value;
            loadModel(viewer, dropdown.value).then(() => addTestScene(viewer));
        }
        if (dropdown.value) {
            dropdown.onchange();
        }
    } catch (err) {
        alert('Could not list models. See the console for more details.');
        console.error(err);
    }
}

async function addTestScene(viewer) {
    const scene = new THREE.Scene();
    const normalsMaterial =  new THREE.MeshNormalMaterial({ side: THREE.FrontSide });
    const sphere = new THREE.IcosahedronGeometry(12.0, THREE.REVISION <= 71 ? 4 : 8);
    const torus = new THREE.TorusGeometry(20.0, 4.0, 16, 64);
    scene.add(new THREE.Mesh(sphere, normalsMaterial));
    scene.add(new THREE.Mesh(torus, normalsMaterial));
    viewer.companions.add('my-scene', scene, Autodesk.Viewing.CompanionType.THREE_SCENE_BEFORE);
}
