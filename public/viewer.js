/// import * as Autodesk from "@types/forge-viewer";

import { SummaryExtension } from './extensions/summary.js';
import { HistogramExtension } from './extensions/histogram.js';
import { AggregatesExtension } from './extensions/aggregates.js';

Autodesk.Viewing.theExtensionManager.registerExtension('SummaryExtension', SummaryExtension);
Autodesk.Viewing.theExtensionManager.registerExtension('HistogramExtension', HistogramExtension);
Autodesk.Viewing.theExtensionManager.registerExtension('AggregatesExtension', AggregatesExtension);

export async function initViewer(container) {
    return new Promise(function (resolve, reject) {
        Autodesk.Viewing.Initializer({ getAccessToken }, async function () {
            const config = {
                extensions: ['HistogramExtension', 'AggregatesExtension']
            };
            const viewer = new Autodesk.Viewing.GuiViewer3D(container, config);
            viewer.start();
            viewer.setTheme('light-theme');
            resolve(viewer);
        });
    });
}

async function getAccessToken(callback) {
    const resp = await fetch('/api/auth/token');
    if (resp.ok) {
        const { access_token, expires_in } = await resp.json();
        callback(access_token, expires_in);
    } else {
        alert('Could not obtain access token. See the console for more details.');
        console.error(await resp.text());
    }
}

export function loadModel(viewer, urn) {
    function onDocumentLoadSuccess(doc) {
        viewer.loadDocumentNode(doc, doc.getRoot().getDefaultGeometry());
    }
    function onDocumentLoadFailure(code, message) {
        alert('Could not load model. See the console for more details.');
        console.error(message);
    }
    Autodesk.Viewing.Document.load('urn:' + urn, onDocumentLoadSuccess, onDocumentLoadFailure);
}
