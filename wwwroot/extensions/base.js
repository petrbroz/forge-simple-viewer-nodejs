export class BaseExtension extends Autodesk.Viewing.Extension {
    constructor(viewer, options) {
        super(viewer, options);
        this._onObjectTreeCreated = () => this.onModelLoaded();
        this._onSelectionChanged = () => this.onSelectionChanged();
        this._onIsolationChanged = () => this.onIsolationChanged();
    }

    onModelLoaded() {
    }

    onSelectionChanged() {
    }

    onIsolationChanged() {
    }

    load() {
        this.viewer.addEventListener(Autodesk.Viewing.OBJECT_TREE_CREATED_EVENT, this._onObjectTreeCreated);
        this.viewer.addEventListener(Autodesk.Viewing.SELECTION_CHANGED_EVENT, this._onSelectionChanged);
        this.viewer.addEventListener(Autodesk.Viewing.ISOLATE_EVENT, this._onIsolationChanged);
        return true;
    }

    unload() {
        this.viewer.removeEventListener(Autodesk.Viewing.OBJECT_TREE_CREATED_EVENT, this._onObjectTreeCreated);
        this.viewer.removeEventListener(Autodesk.Viewing.SELECTION_CHANGED_EVENT, this._onSelectionChanged);
        this.viewer.removeEventListener(Autodesk.Viewing.ISOLATE_EVENT, this._onIsolationChanged);
        return true;
    }

    createToolbarButton(buttonId, buttonIconUrl, buttonTooltip) {
        let group = this.viewer.toolbar.getControl('dashboard-toolbar-group');
        if (!group) {
            group = new Autodesk.Viewing.UI.ControlGroup('dashboard-toolbar-group');
            this.viewer.toolbar.addControl(group);
        }
        const button = new Autodesk.Viewing.UI.Button(buttonId);
        button.setToolTip(buttonTooltip);
        group.addControl(button);
        const icon = button.container.querySelector('.adsk-button-icon');
        if (icon) {
            icon.style.backgroundImage = `url(${buttonIconUrl})`; 
            icon.style.backgroundSize = `24px`; 
            icon.style.backgroundRepeat = `no-repeat`; 
            icon.style.backgroundPosition = `center`; 
        }
        return button;
    }

    removeToolbarButton(button) {
        const group = this.viewer.toolbar.getControl('dashboard-toolbar-group');
        group.removeControl(button);
    }

    loadScript(url, namespace) {
        if (window[namespace] !== undefined) {
            return Promise.resolve();
        }
        return new Promise(function (resolve, reject) {
            const el = document.createElement('script');
            el.src = url;
            el.onload = resolve;
            el.onerror = reject;
            document.head.appendChild(el);
        });
    }

    loadStylesheet(url) {
        return new Promise(function (resolve, reject) {
            const el = document.createElement('link');
            el.rel = 'stylesheet';
            el.href = url;
            el.onload = resolve;
            el.onerror = reject;
            document.head.appendChild(el);
        });
    }

    /**
     * Finds all leaf objects (that is, objects that do not have any children)
     * in the object hierarchy of a model.
     * @async
     * @param {Autodesk.Viewing.Model} model Forge model.
     * @returns {Promise<number[]>} IDs of all leaf objects.
     */
    findLeafNodes(model) {
        return new Promise(function (resolve, reject) {
            model.getObjectTree(function (tree) {
                let leaves = [];
                tree.enumNodeChildren(tree.getRootId(), function (dbid) {
                    if (tree.getChildCount(dbid) === 0) {
                        leaves.push(dbid);
                    }
                }, true);
                resolve(leaves);
            }, reject);
        });
    }

    /**
     * Finds names of all properties available in a model.
     * @async
     * @param {Autodesk.Viewing.Model} model Forge model.
     * @returns {Promise<string[]>} List of property names.
     */
    async findPropertyNames(model) {
        const dbids = await this.findLeafNodes(model);
        return new Promise(function (resolve, reject) {
            model.getBulkProperties(dbids, {}, function (results) {
                let propNames = new Set();
                for (const result of results) {
                    for (const prop of result.properties) {
                        propNames.add(prop.displayName);
                    }
                }
                resolve(Array.from(propNames.values()));
            }, reject);
        });
    }

    /**
     * Finds all the different values that appear for a specific property,
     * together with a list of IDs of objects that contain these values.
     * @async
     * @param {Autodesk.Viewing.Model} model Forge model.
     * @param {string} propertyName Name of property to compute the histogram for.
     * @returns {Promise<Map<string, number[]>>} Mapping of property values to lists of object IDs that contain these values.
     */
    async computePropertyHistogram(model, propertyName) {
        const dbids = await this.findLeafNodes(model);
        return new Promise(function (resolve, reject) {
            model.getBulkProperties(dbids, { propFilter: [propertyName] }, function (results) {
                let histogram = new Map();
                for (const result of results) {
                    if (result.properties.length > 0) {
                        const key = result.properties[0].displayValue;
                        if (histogram.has(key)) {
                            histogram.get(key).push(result.dbId);
                        } else {
                            histogram.set(key, [result.dbId]);
                        }
                    }
                }
                resolve(histogram);
            }, reject);
        });
    }

    /**
     * Aggregates values of a specific property from a range of objects, using a specific aggregating function.
     * @async
     * @param {Autodesk.Viewing.Model} model Forge model.
     * @param {number[]} [dbids] Optional list of object IDs to include in the aggregation (by default, all objects are included).
     * @param {string} propertyName Name of property whose values will be aggregated.
     * @param {(aggregateValue: number, currentValue: number, property) => number} aggregateFunc Aggregating function for the property values.
     * For example, `(sum, current, prop) => { return sum + current; }`.
     * @param {number} initialValue Initial value for the aggregating function.
     * @returns {Promise<number>} Final aggregated value.
     */
    async aggregatePropertyValues(model, dbids, propertyName, aggregateFunc, initialValue = 0) {
        if (!dbids) {
            dbids = await this.findLeafNodes(model);
        }
        return new Promise(function (resolve, reject) {
            let aggregatedValue = initialValue;
            model.getBulkProperties(dbids, { propFilter: [propertyName] }, function (results) {
                for (const result of results) {
                    if (result.properties.length > 0) {
                        const prop = result.properties[0];
                        aggregatedValue = aggregateFunc(aggregatedValue, prop.displayValue, prop);
                    }
                }
                resolve(aggregatedValue);
            }, reject);
        });
    }
}
