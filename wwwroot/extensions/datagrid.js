import { BaseExtension } from './base.js';

// Viewer extension providing a datagrid UI via a 3rd party library (http://tabulator.info)
class DataGridExtension extends BaseExtension {
    constructor(viewer, options) {
        super(viewer, options);
        this._button = null;
        this._panel = null;
    }

    async load() {
        super.load();
        await Promise.all([
            this.loadScript('https://cdn.jsdelivr.net/npm/moment@2.29.1/moment.min.js', 'moment'),
            this.loadScript('https://unpkg.com/tabulator-tables@4.9.3/dist/js/tabulator.min.js', 'Tabulator'),
            this.loadStylesheet('https://unpkg.com/tabulator-tables@4.9.3/dist/css/tabulator.min.css')
        ]);
        console.log('DataGridExtension loaded.');
        return true;
    }

    unload() {
        super.unload();
        if (this._button) {
            this.removeToolbarButton(this._button);
            this._button = null;
        }
        if (this._panel) {
            this._panel.setVisible(false);
            this._panel.uninitialize();
            this._panel = null;
        }
        console.log('DataGridExtension unloaded.');
        return true;
    }

    onToolbarCreated() {
        this._panel = new DataGridPanel(this, 'datagrid', 'Data Grid', { x: 10, y: 10 });
        this._button = this.createToolbarButton('datagrid-button', 'https://img.icons8.com/small/32/activity-grid.png', 'Show Data Grid');
        this._button.onClick = () => {
            this._panel.setVisible(!this._panel.isVisible());
            this._button.setState(this._panel.isVisible() ? Autodesk.Viewing.UI.Button.State.ACTIVE : Autodesk.Viewing.UI.Button.State.INACTIVE);
            if (this.viewer.model) {
                this._panel.setModel(this.viewer.model);
            }
        };
    }

    async onModelLoaded() {
        super.onModelLoaded();
        if (this._panel) {
            this._panel.setModel(this.viewer.model);
        }
    }
}

class DataGridPanel extends Autodesk.Viewing.UI.DockingPanel {
    constructor(ownerExtension, id, title, options) {
        super(ownerExtension.viewer.container, id, title, options);
        this.ownerExtension = ownerExtension;
        this.container.style.left = (options.x || 0) + 'px';
        this.container.style.top = (options.y || 0) + 'px';
        this.container.style.width = (options.width || 500) + 'px';
        this.container.style.height = (options.height || 400) + 'px';
        this.container.style.resize = 'none';
    }

    initialize() {
        this.title = this.createTitleBar(this.titleLabel || this.container.id);
        this.initializeMoveHandlers(this.title);
        this.container.appendChild(this.title);
        this.content = document.createElement('div');
        this.content.style.height = '350px';
        this.content.style.backgroundColor = 'white';
        this.content.innerHTML = `<div class="datagrid-container" style="position: relative; height: 350px;"></div>`;
        this.container.appendChild(this.content);
        this.table = new Tabulator('.datagrid-container', {
            height: '100%',
            layout: 'fitColumns',
            groupBy: 'material',
            columns: [
                { title: 'ID', field: 'dbid' },
                { title: 'Name', field: 'name', width: 150 },
                { title: 'Volume', field: 'volume', hozAlign: 'left', formatter: 'progress' },
                { title: 'Material', field: 'material' }
            ],
            rowClick: (e, row) => {
                const { dbid } = row.getData();
                this.ownerExtension.viewer.isolate([dbid]);
                this.ownerExtension.viewer.fitToView([dbid]);
            }
        });
    }

    async setModel(model) {
        this.updateTable(model);
    }

    async updateTable(model) {
        const getProps = (model, dbids, props) => new Promise(function (resolve, reject) {
            model.getBulkProperties(dbids, { propFilter: props }, resolve, reject);
        });
        const dbids = await this.ownerExtension.findLeafNodes(model);
        const results = await getProps(model, dbids, ['Name', 'Volume', 'Structural Material', 'name']);
        this.table.replaceData(results.map(result => {
            return {
                dbid: result.dbId,
                name: result.name,
                volume: result.properties.find(item => item.displayName === 'Volume')?.displayValue,
                material: result.properties.find(item => item.displayName === 'Structural Material')?.displayValue
            };
        }));
    }
}

Autodesk.Viewing.theExtensionManager.registerExtension('DataGridExtension', DataGridExtension);
