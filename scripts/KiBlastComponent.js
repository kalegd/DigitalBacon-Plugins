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

export default class KiBlastComponent extends Component {
    constructor(params = {}) {
        params['assetId'] = KiBlastComponent.assetId;
        super(params);
        this._type = params['type'] || 'BLAST';
    }

    _getDefaultName() {
        return KiBlastComponent.assetName;
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

    static assetId = '38829fa8-c900-41e1-987c-69f3622be707';
    static assetName = 'Ki Blast Component';
}

ProjectHandler.registerAsset(KiBlastComponent);

if(EditorHelpers) {
    class KiBlastComponentHelper extends ComponentHelper {
        constructor(asset) {
            super(asset);
        }

        static fields = [
            { "parameter": "type", "name": "Type",
                "map": { "Blast": "BLAST", "Audio": "AUDIO" },
                "type": MenuInputs.EnumInput },
        ];
    }

    EditorHelperFactory.registerEditorHelper(KiBlastComponentHelper,
        KiBlastComponent);
}
