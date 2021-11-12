import { initViewer } from './viewer.js';

initViewer(document.getElementById('preview')).then(viewer => {
    viewer.loadExtension('Autodesk.DWF').then(() => {
        viewer.loadModel('/sportscar.dwfx');
    });
});
