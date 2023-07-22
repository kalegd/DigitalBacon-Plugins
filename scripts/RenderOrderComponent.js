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

export default class RenderOrderComponent extends Component {
    constructor(params = {}) {
        params['assetId'] = RenderOrderComponent.assetId;
        super(params);
        this._renderOrder = params['renderOrder'] || 0;
    }

    _getDefaultName() {
        return RenderOrderComponent.assetName;
    }

    exportParams() {
        let params = super.exportParams();
        params['renderOrder'] = this._renderOrder;
        return params;
    }

    getRenderOrder() {
        return this._renderOrder;
    }

    supports(asset) {
        return asset instanceof AssetEntity;
    }

    setRenderOrder(renderOrder) {
        this._renderOrder = renderOrder;
    }

    static assetId = 'f4e5b6a5-3712-4f0b-883a-197c26debf24';
    static assetName = 'Render Order Component';
}

ProjectHandler.registerAsset(RenderOrderComponent);

if(EditorHelpers) {
    class RenderOrderComponentHelper extends ComponentHelper {
        constructor(asset) {
            super(asset);
        }

        static fields = [
            { "parameter": "renderOrder", "name": "Render Order",
                "type": MenuInputs.NumberInput },
        ];
    }

    EditorHelperFactory.registerEditorHelper(RenderOrderComponentHelper,
        RenderOrderComponent);
}
