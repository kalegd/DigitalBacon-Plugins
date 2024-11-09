const { Assets, EditorHelpers, LibraryHandler, ProjectHandler, Scene, THREE, getCamera, getMenuController, isEditor, isImmersionDisabled } = window.DigitalBacon;
const { AssetEntity, CustomAssetEntity } = Assets;
const { CustomAssetEntityHelper, EditorHelperFactory } = EditorHelpers;

const euler = new THREE.Euler();
const quaternion = new THREE.Quaternion();
const vector3s = [new THREE.Vector3(), new THREE.Vector3()];

export default class CameraContainer extends CustomAssetEntity {
    constructor(params = {}) {
        params['assetId'] = CameraContainer.assetId;
        super(params);
        this._setupCamera();
    }

    _setupCamera() {
        if(isImmersionDisabled()) {
            this._camera = getCamera();
        } else {
            let userCamera = getCamera();
            this._camera = new THREE.PerspectiveCamera(userCamera.fov,
                userCamera.aspect, userCamera.near, userCamera.far);
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

class CameraPreview extends CustomAssetEntity {
    constructor(params = {}) {
        params['assetId'] = CameraPreview.assetId;
        super(params);
    }

    setupScreen(cameraContainer) {
        if(this._mesh) return;
        this._mesh = cameraContainer._mesh.clone();
        this._object.add(this._mesh);
        window.addEventListener('resize', () => {
            this._mesh.scale.set(getCamera().aspect, 1, 1);
        });
    }

    static assetId = '316309ee-d940-45c3-b4db-c9986d156b40';
    static assetName = 'Camera Preview';
    static isEphemeral = true;
    static isPrivate = true;
}

ProjectHandler.registerAsset(CameraPreview);
LibraryHandler.loadPrivate(CameraPreview);

class CameraContainerHelper extends CustomAssetEntityHelper {
    constructor(asset) {
        super(asset);
    }

    _addPreviewScreen() {
        let menuController = getMenuController();
        menuController.getPosition(vector3s[0]);
        menuController.getDirection(vector3s[1]).normalize()
            .divideScalar(4);
        vector3s[0].sub(vector3s[1]).roundWithPrecision(5);
        let position = vector3s[0].toArray();
        vector3s[0].set(0, 0, 1);
        vector3s[1].setY(0).normalize();
        quaternion.setFromUnitVectors(vector3s[0], vector3s[1]);
        euler.setFromQuaternion(quaternion).roundWithPrecision(5);
        let rotation = euler.toArray();
        let asset = ProjectHandler.addNewAsset(CameraPreview.assetId, {
            position: position,
            rotation: rotation,
            visualEdit: true,
        });
        asset.setupScreen(this._asset);
    }

    static fields = [
        "visualEdit",
        "parentId",
        { "parameter": "_addPreviewScreen", "name": "Add Detached Preview",
            "type": CustomAssetEntityHelper.FieldTypes.ButtonField },
        "position",
        "rotation",
        "scale",
    ];
}

EditorHelperFactory.registerEditorHelper(CameraContainerHelper,CameraContainer);
