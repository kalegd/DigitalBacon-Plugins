const { Assets, EditorHelpers, LibraryHandler, ProjectHandler, Scene, THREE, getCamera, isEditor, isImmersionDisabled } = window.DigitalBacon;
const { AssetEntity, CustomAssetEntity } = Assets;
const { CustomAssetEntityHelper, EditorHelperFactory } = EditorHelpers;

export default class CameraContainer extends CustomAssetEntity {
    constructor(params = {}) {
        params['assetId'] = CameraContainer.assetId;
        super(params);
        this._setupCamera();
        window.cc = this;
    }

    _setupCamera() {
        if(isImmersionDisabled()) {
            this._camera = getCamera();
        } else {
            this._camera = getCamera().clone();
            this._camera.position.set(0, 0, 0);
            this._camera.rotation.set(0, 0, 0);
            if(isEditor()) {
                window.addEventListener('resize', () => { this._onResize(); });
                this._cameraHelper = new THREE.CameraHelper(this._camera);
                Scene.object.add(this._cameraHelper);
                this.update = this._editorUpdate;
                this._createPreview();
            }
        }
        this._object.add(this._camera);
    }

    _createPreview() {
        this._renderer = new THREE.WebGLRenderer({ antialias : true });
        this._renderer.setSize(512, 512);
        this._texture = new THREE.CanvasTexture(this._renderer.domElement);
        this._texture.colorSpace = THREE.SRGBColorSpace;
        let geometry = new THREE.PlaneGeometry(0.5, 0.5);
        let material = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            map: this._texture,
            side: THREE.DoubleSide,
        });
        this._mesh = new THREE.Mesh(geometry, material);
        this._mesh.scale.set(getCamera().aspect, 1, 1);
        this._object.add(this._mesh);
    }

    _onResize() {
        let mainCamera = getCamera();
        this._camera.aspect = mainCamera.aspect;
        this._camera.updateProjectionMatrix();
        if(this._mesh) this._mesh.scale.set(mainCamera.aspect, 1, 1);
    }

    _getDefaultName() {
        return CameraContainer.assetName;
    }

    exportParams() {
        let params = super.exportParams();
        //params['something'] = this.something;
        return params;
    }

    _editorUpdate() {
        this._cameraHelper.update();
        this._renderer.render(Scene.object, this._camera);
        this._texture.needsUpdate = true;
    }

    static assetId = 'ac31b3c4-4d82-497a-bbda-2ba3617ed73f';
    static assetName = 'Camera Container';
}

ProjectHandler.registerAsset(CameraContainer);

class CameraContainerHelper extends CustomAssetEntityHelper {
    constructor(asset) {
        super(asset);
    }

    static fields = [
        "visualEdit",
        "position",
        "rotation",
        "scale",
    ];
}

EditorHelperFactory.registerEditorHelper(CameraContainerHelper,CameraContainer);
