import { initViewer, loadModel } from './viewer.js';
// import { ParametricGeometry } from 'three/addons/geometries/ParametricGeometry.js';

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
            loadModel(viewer, dropdown.value).then(() => addTestSceneInstancing(viewer));
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
    const normalsMaterial = new THREE.MeshNormalMaterial({ side: THREE.FrontSide });
    const sphere = new THREE.IcosahedronGeometry(12.0, THREE.REVISION <= 71 ? 4 : 8);
    const torus = new THREE.TorusGeometry(20.0, 4.0, 16, 64);
    scene.add(new THREE.Mesh(sphere, normalsMaterial));
    scene.add(new THREE.Mesh(torus, normalsMaterial));
    viewer.companions.add('my-scene', scene, Autodesk.Viewing.CompanionType.THREE_SCENE_BEFORE);
}

async function addTestSceneCollada(viewer) {
    const loader = new THREE.ColladaLoader();
    const normalsMaterial = new THREE.MeshNormalMaterial({ side: THREE.DoubleSide });
    loader.load('/abb_irb52_7_120.dae', function (collada) {
        let dae = collada.scene;
        dae.traverse(function (child) {
            if (child.isMesh) {
                child.material = normalsMaterial;
            }
        });
        dae.scale.x = dae.scale.y = dae.scale.z = 25.0;
        dae.updateMatrix();
        const grid = new THREE.GridHelper(20, 20, 0x888888, 0x444444);
        const scene = new THREE.Scene();
        scene.add(grid);
        scene.add(new THREE.AmbientLight(0x808080));
        scene.add(dae);
        viewer.companions.add('my-scene-collada', scene, Autodesk.Viewing.CompanionType.THREE_SCENE_BEFORE);
    });
}

/*
async function addTestSceneNURBS(viewer) {
    const nsControlPoints = [
        [
            new THREE.Vector4(- 200, - 200, 100, 1),
            new THREE.Vector4(- 200, - 100, - 200, 1),
            new THREE.Vector4(- 200, 100, 250, 1),
            new THREE.Vector4(- 200, 200, - 100, 1)
        ],
        [
            new THREE.Vector4(0, - 200, 0, 1),
            new THREE.Vector4(0, - 100, - 100, 5),
            new THREE.Vector4(0, 100, 150, 5),
            new THREE.Vector4(0, 200, 0, 1)
        ],
        [
            new THREE.Vector4(200, - 200, - 100, 1),
            new THREE.Vector4(200, - 100, 200, 1),
            new THREE.Vector4(200, 100, - 250, 1),
            new THREE.Vector4(200, 200, 100, 1)
        ]
    ];
    const degree1 = 2;
    const degree2 = 3;
    const knots1 = [0, 0, 0, 1, 1, 1];
    const knots2 = [0, 0, 0, 0, 1, 1, 1, 1];
    const nurbsSurface = new THREE.NURBSSurface(degree1, degree2, knots1, knots2, nsControlPoints);
    const map = new THREE.TextureLoader().load('/grid.png');
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.anisotropy = 16;
    function getSurfacePoint(u, v, target) {
        return nurbsSurface.getPoint(u, v, target);
    }
    const geometry = new ParametricGeometry(getSurfacePoint, 20, 20);
    const material = new THREE.MeshLambertMaterial({ map: map, side: THREE.DoubleSide });
    const object = new THREE.Mesh(geometry, material);
    object.position.set(- 200, 100, 0);
    object.scale.multiplyScalar(1);
    const scene = new THREE.Scene();
    scene.add(object);
    viewer.companions.add('my-scene-nurbs', scene, Autodesk.Viewing.CompanionType.THREE_SCENE_BEFORE);
}
*/

async function addTestSceneInstancing(viewer) {
    const randomizeMatrix = function () {
        const position = new THREE.Vector3();
        const rotation = new THREE.Euler();
        const quaternion = new THREE.Quaternion();
        const scale = new THREE.Vector3();
        return function (matrix) {
            position.x = Math.random() * 800 - 400;
            position.y = Math.random() * 800 - 400;
            position.z = Math.random() * 800 - 400;
            rotation.x = Math.random() * 2 * Math.PI;
            rotation.y = Math.random() * 2 * Math.PI;
            rotation.z = Math.random() * 2 * Math.PI;
            quaternion.setFromEuler(rotation);
            scale.x = scale.y = scale.z = Math.random() * 1;
            matrix.compose(position, quaternion, scale);
        };
    }();

    const count = 10000;
    const matrix = new THREE.Matrix4();
    const geometry = new THREE.TorusGeometry(10.0, 4.0, 16, 64);
    const material = new THREE.MeshNormalMaterial({ side: THREE.DoubleSide });
    // const material = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.5 });
    //const material = new THREE.MeshPhongMaterial({ color: 0x00ff00 });
    const mesh = new THREE.InstancedMesh(geometry, material, count);
    for (let i = 0; i < count; i++) {
        randomizeMatrix(matrix);
        mesh.setMatrixAt(i, matrix);
    }
    const scene = new THREE.Scene();
    scene.add(mesh);
    viewer.companions.add('my-scene-instancing', scene, Autodesk.Viewing.CompanionType.THREE_SCENE_BEFORE);
}