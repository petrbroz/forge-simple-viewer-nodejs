import { initViewer, loadModel } from './viewer.js';
// import { ColladaLoader } from 'three/addons/loaders/ColladaLoader.js';

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
            loadModel(viewer, dropdown.value).then(() => addTestSceneCollada(viewer));
        }
        if (dropdown.value) {
            dropdown.onchange();
        }
    } catch (err) {
        alert('Could not list models. See the console for more details.');
        console.error(err);
    }
}

async function addTestSceneBasic(viewer) {
    const scene = new THREE.Scene();
    const normalsMaterial =  new THREE.MeshNormalMaterial({ side: THREE.FrontSide });
    const sphere = new THREE.IcosahedronGeometry(12.0, THREE.REVISION <= 71 ? 4 : 8);
    const torus = new THREE.TorusGeometry(20.0, 4.0, 16, 64);
    scene.add(new THREE.Mesh(sphere, normalsMaterial));
    scene.add(new THREE.Mesh(torus, normalsMaterial));
    viewer.companions.add('my-scene', scene, Autodesk.Viewing.CompanionType.THREE_SCENE_BEFORE);
}

async function addTestSceneCollada(viewer) {
    const loader = new THREE.ColladaLoader();
    loader.load('/abb_irb52_7_120.dae', function (collada) {
        let dae = collada.scene;
        dae.traverse(function (child) {
            if (child.isMesh) {
                child.material.flatShading = true; // model does not have normals
            }
        });
        dae.scale.x = dae.scale.y = dae.scale.z = 10.0;
        dae.updateMatrix();
        const grid = new THREE.GridHelper(20, 20, 0x888888, 0x444444);
        const scene = new THREE.Scene();
        scene.add(grid);
        scene.add(dae);
        viewer.companions.add('my-scene-collada', scene, Autodesk.Viewing.CompanionType.THREE_SCENE_BEFORE);
    });
}
