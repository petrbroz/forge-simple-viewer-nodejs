const TransformToolName = 'xform-tool';
const TransformToolOverlay = 'xform-tool-overlay';

class TransformTool extends Autodesk.Viewing.ToolInterface {
    constructor() {
        super();
        /** @type {THREE.TransformControls} */
        this._controls = null;
        /** @type {Autodesk.Viewing.Viewer3D} */
        this._viewer = null;
        this._fragments = [];
        this._startPosition = new THREE.Vector3();
        this._onCameraChange = this._onCameraChange.bind(this);
        this._onControlsChange = this._onControlsChange.bind(this);
        this._onSelectionChange = this._onSelectionChange.bind(this);

        this.names = [TransformToolName];
        // Hack: delete functions defined *on the instance* of the tool.
        // We want the tool controller to call our class methods instead.
        delete this.register;
        delete this.deregister;
        delete this.activate;
        delete this.deactivate;
        delete this.getPriority;
        delete this.handleMouseMove;
        delete this.handleButtonDown;
        delete this.handleButtonUp;
        delete this.handleSingleClick;
    }

    register() {
        console.log('TransformTool registered.');
    }

    deregister() {
        console.log('TransformTool unregistered.');
    }

    activate(name, viewer) {
        this._viewer = viewer;
        this._controls = new THREE.TransformControls(this._viewer.getCamera(), this._viewer.canvas, 'translate');
        this._controls.setSize(25.0);
        this._controls.visible = false;
        this._controls.addEventListener('change', this._onControlsChange);
        this._controls.attach(new THREE.Object3D()); // haaaack
        this._viewer.select(null);
        this._viewer.addEventListener(Autodesk.Viewing.CAMERA_CHANGE_EVENT, this._onCameraChange);
        this._viewer.addEventListener(Autodesk.Viewing.SELECTION_CHANGED_EVENT, this._onSelectionChange);
        this._viewer.overlays.addScene(TransformToolOverlay);
        this._viewer.overlays.addMesh(this._controls, TransformToolOverlay);
        console.log('TransformTool activated.');
    }

    deactivate(name) {
        this._viewer.overlays.removeMesh(this._controls, TransformToolOverlay);
        this._viewer.overlays.removeScene(TransformToolOverlay);
        this._viewer.removeEventListener(Autodesk.Viewing.CAMERA_CHANGE_EVENT, this._onCameraChange);
        this._viewer.removeEventListener(Autodesk.Viewing.SELECTION_CHANGED_EVENT, this._onSelectionChange);
        this._controls.removeEventListener('change', this._onControlsChange);
        this._viewer = null;
        this._controls = null;
        console.log('TransformTool deactivated.');
    }

    getPriority() {
        return 42; // Or feel free to use any number higher than 0 (which is the priority of all the default viewer tools)
    }

    update(highResTimestamp) {
        return false;
    }

    handleMouseMove(event) {
        if (this._dragging) {
            return this._controls.onPointerMove(event);
        } else {
            return this._controls.onPointerHover(event);
        }
    }

    handleButtonDown(event, button) {
        this._dragging = true;
        return this._controls.onPointerDown(event);
    }

    handleButtonUp(event, button) {
        this._dragging = false;
        return this._controls.onPointerUp(event);
    }

    handleSingleClick(event, button) {
        return false;
    }

    _onCameraChange() {
        this._controls.update();
    }

    _onControlsChange(ev) {
        const offset = new THREE.Vector3().subVectors(this._controls.position, this._startPosition);
        for (const fragment of this._fragments) {
            fragment.position.copy(offset);
            fragment.updateAnimTransform();
        }
        this._viewer.impl.invalidate(true, true, true);
    }

    _onSelectionChange(ev) {
        this._fragments = [];
        const selectedIds = this._viewer.getSelection();
        if (selectedIds.length === 1) {
            const bounds = this._computeBounds(ev.model, ev.fragIdsArray);
            this._controls.setPosition(bounds.getCenter());
            this._startPosition.copy(this._controls.position);
            this._controls.visible = true;
            this._fragments = ev.fragIdsArray.map(fragId => {
                const proxy = this._viewer.impl.getFragmentProxy(ev.model, fragId);
                proxy.position = new THREE.Vector3(0, 0, 0);
                return proxy;
            });
        } else {
            this._controls.visible = false;
        }
    }

    _computeBounds(model, fragIds) {
        const frags = model.getFragmentList();
        const totalBounds = new THREE.Box3(), fragBounds = new THREE.Box3();
        for (const fragId of fragIds) {
            frags.getWorldBounds(fragId, fragBounds);
            totalBounds.union(fragBounds);
        }
        return totalBounds;
    }
}

class TransformExtension extends Autodesk.Viewing.Extension {
    constructor(viewer, options) {
        super(viewer, options);
        this._group = null;
        this._button = null;
        this._tool = null;
    }

    load() {
        console.log('TransformExtension loaded.');
        return true;
    }

    unload() {
        this._removeUI();
        console.log('TransformExtension unloaded.');
        return true;
    }

    onToolbarCreated() {
        this._createUI();
    }

    _createUI() {
        if (!this._group) {
            this._group = new Autodesk.Viewing.UI.ControlGroup('xform-extension-toolbar');
            this.viewer.toolbar.addControl(this._group);
            this._button = new Autodesk.Viewing.UI.Button('xform-extension-button');
            this._button.onClick = () => {
                const { ACTIVE, INACTIVE } = Autodesk.Viewing.UI.Button.State;
                if (this._button.getState() !== ACTIVE) {
                    this._enableTransformTool();
                    this._button.setState(ACTIVE);
                } else {
                    this._disableTransformTool();
                    this._button.setState(INACTIVE);
                }
            };
            this._button.setToolTip('Transform selected objects');
            this._group.addControl(this._button);
        }
    }

    _removeUI() {
        if (this._group) {
            this.viewer.toolbar.removeControl(this._group);
            this._group = null;
        }
    }

    _enableTransformTool() {
        const controller = this.viewer.toolController;
        if (!this._tool) {
            this._tool = new TransformTool();
            controller.registerTool(this._tool);
        }
        if (!controller.isToolActivated(TransformToolName)) {
            controller.activateTool(TransformToolName);
        }
    }

    _disableTransformTool() {
        const controller = this.viewer.toolController;
        if (this._tool && controller.isToolActivated(TransformToolName)) {
            controller.deactivateTool(TransformToolName);
        }
    }
}

Autodesk.Viewing.theExtensionManager.registerExtension('TransformExtension', TransformExtension);
