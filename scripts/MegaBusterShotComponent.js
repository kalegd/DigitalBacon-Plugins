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

export default class MegaBusterShotComponent extends Component {
    constructor(params = {}) {
        params['assetId'] = MegaBusterShotComponent.assetId;
        super(params);
        this._type = params['type'] || 'NORMAL';
    }

    _getDefaultName() {
        return MegaBusterShotComponent.assetName;
    }

    exportParams() {
        let params = super.exportParams();
        params['type'] = this._type;
        return params;
    }

    getType() {
        return this._type;
    }

    setType(type) {
        this._type = type;
    }

    supports(asset) {
        return asset instanceof AssetEntity;
    }

    static assetId = '6e93b955-8f30-4ca8-85db-7fe24e055975';
    static assetName = 'Mega Buster Shot Component';
}

ProjectHandler.registerAsset(MegaBusterShotComponent);

if(EditorHelpers) {
    class MegaBusterShotComponentHelper extends ComponentHelper {
        constructor(asset) {
            super(asset);
        }

        static fields = [
            { "parameter": "type", "name": "Type",
                "map": { "Normal": "NORMAL", "Half Charged": "HALF_CHARGED",
                    "Fully Charged": "FULLY_CHARGED",
                    "Fire Audio": "FIRE_AUDIO", "Charge Audio": "CHARGE_AUDIO"},
                "type": MenuInputs.EnumInput },
        ];
    }

    EditorHelperFactory.registerEditorHelper(MegaBusterShotComponentHelper,
        MegaBusterShotComponent);
}
