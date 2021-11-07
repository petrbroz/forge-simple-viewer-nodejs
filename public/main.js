import { initViewer, loadModel } from './viewer.js';

initViewer(document.getElementById('preview')).then(viewer => {
    // Setup model loading checkboxes
    const models = new Map();
    const checkboxes = document.querySelectorAll('#header > input');
    for (const checkbox of checkboxes) {
        checkbox.addEventListener('change', async function (el) {
            const urn = el.target.getAttribute('data-urn');
            if (el.target.checked) {
                const model = await loadModel(viewer, urn, {
                    keepCurrentModels: true,
                    preserveView: models.size > 0
                });
                models.set(urn, model);
            } else {
                viewer.unloadModel(models.get(urn));
                models.delete(urn);
            }
        });
    }

    // Dump properties of selected objects to the console
    viewer.addEventListener(Autodesk.Viewing.AGGREGATE_SELECTION_CHANGED_EVENT, function (ev) {
        for (const selection of ev.selections) {
            const { model, dbIdArray } = selection;
            for (const dbid of dbIdArray) {
                model.getProperties(dbid, function (props) {
                    console.log(props);
                }, function (err) {
                    console.error(err);
                });
            }
        }
    });
});
