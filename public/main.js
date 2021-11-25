import { initViewer, loadModel } from './viewer.js';

document.addEventListener('DOMContentLoaded', async function () {
    const viewer1 = await initViewer(document.getElementById('preview1'));
    const viewer2 = await initViewer(document.getElementById('preview2'));
    const resp = await fetch('/api/models');
    if (!resp.ok) {
        alert('Could not list models. See the console for more details.');
        console.error(await resp.text());
        return;
    }
    const models = await resp.json();
    setupModelSelection(viewer1, document.getElementById('models1'), models);
    setupModelSelection(viewer2, document.getElementById('models2'), models);
});

async function setupModelSelection(viewer, dropdown, models) {
    dropdown.innerHTML = '';
    for (const model of models) {
        const option = document.createElement('option');
        option.innerText = model.name;
        option.setAttribute('value', model.urn);
        dropdown.appendChild(option);
    }
    dropdown.onchange = () => loadModel(viewer, dropdown.value);
    if (!viewer.model && dropdown.value) {
        dropdown.onchange();
    }
}
