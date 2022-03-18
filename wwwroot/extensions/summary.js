class SummaryExtension extends Autodesk.Viewing.Extension {
    constructor(viewer, options) {
        super(viewer, options);
    }

    load() {
        console.log('SummaryExtension loaded.');
        return true;
    }

    unload() {
        console.log('SummaryExtension unloaded.');
        return true;
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

Autodesk.Viewing.theExtensionManager.registerExtension('SummaryExtension', SummaryExtension);
