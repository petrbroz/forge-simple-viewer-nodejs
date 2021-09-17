export class AggregatesExtension extends Autodesk.Viewing.Extension {
    constructor(viewer, options) {
        super(viewer, options);
        this._group = null;
        // For now, the names of properties we want to compute the aggregates for are hard-coded.
        // In future these could be retrieved via the extension `options`, or perhaps set in the UI.
        this._properties = ['Length', 'Area', 'Volume', 'Density', 'Mass', 'Price'];
        this.update = this.update.bind(this);
    }

    async load() {
        await this.viewer.loadExtension('SummaryExtension');
        this.viewer.addEventListener(Autodesk.Viewing.SELECTION_CHANGED_EVENT, this.update);
        this.viewer.addEventListener(Autodesk.Viewing.ISOLATE_EVENT, this.update);
        console.log('AggregatesExtension loaded.');
        return true;
    }

    async unload() {
        this._removeUI();
        this.viewer.removeEventListener(Autodesk.Viewing.SELECTION_CHANGED_EVENT, this.update);
        this.viewer.removeEventListener(Autodesk.Viewing.ISOLATE_EVENT, this.update);
        console.log('AggregatesExtension unloaded.');
        return true;
    }

    onToolbarCreated() {
        this._createUI();
    }

    update() {
        if (this._aggregatesPanel) {
            const selectedIds = this.viewer.getSelection();
            const isolatedIds = this.viewer.getIsolatedNodes();
            if (selectedIds.length > 0) { // If any nodes are selected, compute the aggregates for them
                this._aggregatesPanel.update(this.viewer.model, selectedIds, this._properties);
            } else if (isolatedIds.length > 0) { // Or, if any nodes are isolated, compute the aggregates for those
                this._aggregatesPanel.update(this.viewer.model, isolatedIds, this._properties);
            } else { // Otherwise compute the aggregates for all nodes
                this._aggregatesPanel.update(this.viewer.model, [], this._properties);
            }
        }
    }

    _createUI() {
        this._group = this.viewer.toolbar.getControl('aggregates-group');
        if (!this._group) {
            this._group = new Autodesk.Viewing.UI.ControlGroup('aggregates-group');
            this.viewer.toolbar.addControl(this._group);
        }

        const aggregatesButton = new Autodesk.Viewing.UI.Button('aggregates-button');
        aggregatesButton.onClick = () => {
            if (!this._aggregatesPanel) {
                this._aggregatesPanel = new AggregatesPanel(this.viewer, 'aggregates-barchart', 'Property Aggregates');
                if (this.viewer.model) {
                    this._aggregatesPanel.update(this.viewer.model, this.viewer.getSelection(), this._properties);
                }
            }
            this._aggregatesPanel.setVisible(!this._aggregatesPanel.isVisible());
            const { ACTIVE, INACTIVE } = Autodesk.Viewing.UI.Button.State;
            aggregatesButton.setState(this._aggregatesPanel.isVisible() ? ACTIVE : INACTIVE);
        };
        aggregatesButton.setToolTip('Show Property Aggregates');
        this._group.addControl(aggregatesButton);
    }

    _removeUI() {
        if (this._aggregatesPanel) {
            this._aggregatesPanel.setVisible(false);
            this._aggregatesPanel = null;
        }
        if (this._group) {
            this.viewer.toolbar.removeControl(this._group);
            this._group = null;
        }
    }
}

class AggregatesPanel extends Autodesk.Viewing.UI.PropertyPanel {
    constructor(viewer, id, title) {
        super(viewer.container, id, title);
        this.viewer = viewer;
    }

    async update(model, dbids, propNames) {
        const summaryExt = this.viewer.getExtension('SummaryExtension');
        this.removeAllProperties();
        for (const propName of propNames) {
            const initialValue = { sum: 0, count: 0, min: Infinity, max: -Infinity, units: undefined };
            const aggregateFunc = (aggregate, value, property) => {
                if (aggregate.units && property.units && property.units !== aggregate.units) {
                    console.warn('Aggregating values with different units is not supported');
                }
                return {
                    sum: aggregate.sum + value,
                    count: aggregate.count + 1,
                    min: Math.min(aggregate.min, value),
                    max: Math.max(aggregate.max, value),
                    units: aggregate.units || property.units
                };
            };
            const { sum, count, min, max, units } = await summaryExt.aggregatePropertyValues(model, dbids, propName, aggregateFunc, initialValue);
            if (count > 0) {
                const category = propName;
                const suffix = units ? ' ' + units : '';
                this.addProperty('Count', count, category);
                this.addProperty('Sum', sum.toFixed(2) + suffix, category);
                this.addProperty('Avg', (sum / count).toFixed(2) + suffix, category);
                this.addProperty('Min', min.toFixed(2) + suffix, category);
                this.addProperty('Max', max.toFixed(2) + suffix, category);
            }
        }
    }
}
