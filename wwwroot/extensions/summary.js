import { BaseExtension } from './base.js';

class SummaryExtension extends BaseExtension {
    load() {
        super.load();
        console.log('SummaryExtension loaded.');
        return true;
    }

    unload() {
        super.unload();
        console.log('SummaryExtension unloaded.');
        return true;
    }

    async onModelLoaded() {
        const props = await this.findPropertyNames(this.viewer.model);
        console.log('New model has been loaded with the following properties:', props);
    }

    onSelectionChanged() {
        console.log('Selection has changed', this.viewer.getSelection());
    }

    onIsolationChanged() {
        console.log('Isolation has changed', this.viewer.getIsolatedNodes());
    }
}

Autodesk.Viewing.theExtensionManager.registerExtension('SummaryExtension', SummaryExtension);
