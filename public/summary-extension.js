export class SummaryExtension extends Autodesk.Viewing.Extension {
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

    findLeafNodes(model) {
        const tree = model.getInstanceTree();
        let leaves = [];
        tree.enumNodeChildren(tree.getRootId(), function (dbid) {
            if (tree.getChildCount(dbid) === 0) {
                leaves.push(dbid);
            }
        }, true);
        return leaves;
    }

    computeHistogram(model, propertyName) {
        const dbids = this.findLeafNodes(model);
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

    async findAllProperties(model) {
        const dbids = this.findLeafNodes(model);
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

    // Alternative implementation, more efficient but returning
    // many more properties that may not be relevant
    async findAllProperties2(model) {
        /**
         * Custom user function for querying the property database.
         * @param {object} pdb Property database (see https://forge.autodesk.com/en/docs/viewer/v6/reference/globals/PropertyDatabase).
         * @returns {string[]} List of all property names used throughout the database.
         */
        function userFunction(pdb) {
            let propNames = new Set();
            pdb.enumAttributes(function (attrId, attrDef) {
                if (attrDef.category && attrDef.category.startsWith('__')) { // skip internal attributes
                    return;
                }
                propNames.add(attrDef.name);
            })
            return Array.from(propNames.values());
        };
        const result = await model.getPropertyDb().executeUserFunction(userFunction);
        return result;
    }
}
