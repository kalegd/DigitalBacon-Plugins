const { Assets, EditorHelpers, ProjectHandler } = window.DigitalBacon;
const { CustomAssetEntity } = Assets;
const { CustomAssetEntityHelper, EditorHelperFactory } = EditorHelpers;
const { AssetEntityField } = CustomAssetEntityHelper.FieldTypes;

import * as THREE from 'three';

const PiggyImageUrl = 'https://cdn.jsdelivr.net/gh/kalegd/digitalbacon-plugins@latest/textures/Digital_Bacon_Piggy.jpg';
var piggyTexture;

export default class PathPoint extends CustomAssetEntity {
    constructor(params = {}) {
        params['assetId'] = PathPoint.assetId;
        super(params);
        this._inlet = params['inlet'];
        this._outlet = params['outlet'];
    }

    _getDefaultName() {
        return PathPoint.assetName;
    }

    exportParams() {
        let params = super.exportParams();
        params['inlet'] = this._inlet;
        params['outlet'] = this._outlet;
        return params;
    }

    get inlet() { return this._inlet; }
    get outlet() { return this._outlet; }

    set inlet(inlet) {
        let oldInlet = this._inlet;
        this._inlet = inlet;
        if(inlet && inlet != oldInlet) {
            let inlet = ProjectHandler.getAsset(inlet);
            inlet.endPoint = this._id;
        }
    }

    set outlet(outlet) {
        let oldOutlet = this._outlet;
        this._outlet = outlet;
        if(outlet && outlet != oldOutlet) {
            let outlet = ProjectHandler.getAsset(outlet);
            outlet.endPoint = this._id;
        }
    }

    static assetId = '22a06e27-f65c-40f8-8995-4ef22546d795';
    static assetName = 'Path Point';
}

ProjectHandler.registerAsset(PathPoint);

if(EditorHelpers) {
    let pathAssetIds = [];
    function assetFilter(asset) {
        return pathAssetIds.includes(asset.assetId);
    }

    class PathPointHelper extends CustomAssetEntityHelper {
        constructor(asset) {
            super(asset);
            this._createMesh();
        }

        _createMesh() {
            if(!piggyTexture) {
                piggyTexture = new THREE.TextureLoader().load(PiggyImageUrl);
                piggyTexture.repeat.x = 10;
                piggyTexture.repeat.y = 5;
                piggyTexture.offset.x = -7;
                piggyTexture.offset.y = -2;
            }
            let geometry = new THREE.SphereGeometry(0.05);
            let material = new THREE.MeshBasicMaterial({
                color: 0xffffff,
                map: piggyTexture,
            });
            this._mesh = new THREE.Mesh(geometry, material);
            if(this._asset.visualEdit) this._object.add(this._mesh);
        }

        updateVisualEdit(isVisualEdit) {
            if(isVisualEdit) {
                this._object.add(this._mesh);
            } else {
                this._object.remove(this._mesh);
                fullDispose(this._mesh);
            }
            super.updateVisualEdit(isVisualEdit);
        }

        static fields = [
            "visualEdit",
            { "parameter": "inlet", "name": "Inlet", "filter": assetFilter,
                "type": AssetEntityField },
            { "parameter": "outlet", "name": "Outlet", "filter": assetFilter,
                "type": AssetEntityField },
            "position",
            "rotation",
        ];
    }

    EditorHelperFactory.registerEditorHelper(PathPointHelper,
        PathPoint);
}
