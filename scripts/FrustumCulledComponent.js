/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

if(!window.DigitalBacon) {
    console.error('Missing global DigitalBacon reference');
    throw new Error('Missing global DigitalBacon reference');
}

const { Assets, EditorHelpers, ProjectHandler, MenuInputs }=window.DigitalBacon;
const { AssetEntity, Component } = Assets;
const { ComponentHelper, EditorHelperFactory } = EditorHelpers;

export default class FrustumCulledComponent extends Component {
    constructor(params = {}) {
        params['assetId'] = FrustumCulledComponent.assetId;
        super(params);
        this._frustumCulled = params['frustumCulled'] || false;
    }

    _getDefaultName() {
        return FrustumCulledComponent.assetName;
    }

    exportParams() {
        let params = super.exportParams();
        params['frustumCulled'] = this._frustumCulled;
        return params;
    }

    getFrustumCulled() {
        return this._frustumCulled;
    }

    supports(asset) {
        return asset instanceof AssetEntity;
    }

    setFrustumCulled(frustumCulled) {
        this._frustumCulled = frustumCulled;
    }

    static assetId = 'ab72b23e-47c6-4406-b184-9d9a175394b0';
    static assetName = 'Frustum Culled Component';
}

ProjectHandler.registerAsset(FrustumCulledComponent);

if(EditorHelpers) {
    class FrustumCulledComponentHelper extends ComponentHelper {
        constructor(asset) {
            super(asset);
        }

        static fields = [
            { "parameter": "frustumCulled", "name": "Frustum Culled",
                "type": MenuInputs.CheckboxInput },
        ];
    }

    EditorHelperFactory.registerEditorHelper(FrustumCulledComponentHelper,
        FrustumCulledComponent);
}
