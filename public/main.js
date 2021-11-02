/// import * as Autodesk from "@types/forge-viewer";

import { initViewer, loadModel } from './viewer.js';

const preview = document.getElementById('preview');

initViewer(preview, ['Autodesk.DataVisualization']).then(viewer => {
    const urn = window.location.hash ? window.location.hash.substr(1) : null;
    setupModelSelection(viewer, urn);
    preview.addEventListener('click', function (ev) {
        const rect = preview.getBoundingClientRect();
        const hit = viewer.hitTest(ev.clientX - rect.left, ev.clientY - rect.top);
        if (hit) {
            const color = new THREE.Color(Math.random(), Math.random(), Math.random());
            addStreamline(viewer, hit.point, 10.0, color);
        }
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
    models.onchange = async () => {
        window.location.hash = models.value;
        loadModel(viewer, models.value);
    }
    if (!viewer.model && models.value) {
        models.onchange();
    }
}

function addStreamline(viewer, origin, width, color, count = 64) {
    // Simple function generating points along a conical spiral
    function generatePoint(i) {
        const angle = 0.02 * Math.PI * i;
        return {
            x: origin.x + 0.01 * i * Math.cos(angle),
            y: origin.y + 0.01 * i * Math.sin(angle),
            z: origin.z + 0.005 * i
        };
    }

    // Generate a streamline with an initial set of points
    const dataVizExt = viewer.getExtension('Autodesk.DataVisualization');
    /** @type {Autodesk.DataVisualization.Core.StreamLineBuilder} */
    const streamlineBuilder = dataVizExt.streamLineBuilder;
    let i = 0;
    let points = [];
    for (i = 0; i < count; i++) {
        const { x, y, z } = generatePoint(i);
        points.push(x, y, z);
    }
    const streamline = streamlineBuilder.createStreamLine({
        lineWidth: width,
        lineColor: color,
        opacity: 0.8,
        lineData: {
            points: new Float32Array(points)
        }
    });

    // Advance the streamline by another point every 50ms
    const interval = setInterval(function () {
        const point = generatePoint(i++);
        streamline.advance(point);
        viewer.impl.invalidate(false, false, true);
        if (i > 512) {
            clearInterval(interval);
            streamlineBuilder.destroyStreamLine(streamline);
        }
    }, 50);
}
