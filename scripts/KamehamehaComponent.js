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

export default class KamehamehaComponent extends Component {
    constructor(params = {}) {
        params['assetId'] = KamehamehaComponent.assetId;
        super(params);
        this._type = params['type'] || 'BLAST';
    }

    _getDefaultName() {
        return KamehamehaComponent.assetName;
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

    static assetId = '8df1c185-59be-49ce-862f-f3070a7f2088';
    static assetName = 'Kamehameha Component';
}

ProjectHandler.registerAsset(KamehamehaComponent);

if(EditorHelpers) {
    class KamehamehaComponentHelper extends ComponentHelper {
        constructor(asset) {
            super(asset);
        }

        static fields = [
            { "parameter": "type", "name": "Type",
                "map": { "Blast": "BLAST", "Charge Audio": "AUDIO_1",
                    "Wave Audio": "AUDIO_2" },
                "type": MenuInputs.EnumInput },
        ];
    }

    EditorHelperFactory.registerEditorHelper(KamehamehaComponentHelper,
        KamehamehaComponent);
}
