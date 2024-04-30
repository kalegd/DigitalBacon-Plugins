/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

const { Assets, EditorHelpers, ProjectHandler } = window.DigitalBacon;
const { Component, Texture } = Assets;
const { ComponentHelper, EditorHelperFactory } = EditorHelpers;

export default class TextureScrollComponent extends Component {
    constructor(params = {}) {
        params['assetId'] = TextureScrollComponent.assetId;
        super(params);
        this._scrollPercent = params['scrollPercent'] || [0,0];
        this._period = params['period'] || 1;
    }

    _getDefaultName() {
        return TextureScrollComponent.assetName;
    }

    exportParams() {
        let params = super.exportParams();
        params['scrollPercent'] = this._scrollPercent;
        params['period'] = this._period;
        return params;
    }

    get scrollPercent() { return this._scrollPercent; }
    get period() { return this._period; }

    set scrollPercent(scrollPercent) { this._scrollPercent = scrollPercent; }
    set period(period) { this._period = period; }

    supports(asset) {
        return asset instanceof Texture;
    }

    static assetId = 'a9d2e22f-ddf6-49fe-a420-5fffd5ee69a3';
    static assetName = 'Texture Scroll';
}

ProjectHandler.registerAsset(TextureScrollComponent);

if(EditorHelpers) {
    class TextureScrollComponentHelper extends ComponentHelper {
        constructor(asset) {
            super(asset);
        }

        static fields = [
            { "parameter": "scrollPercent", "name": "Scroll Percent",
                "type": ComponentHelper.FieldTypes.Vector2Field },
            { "parameter": "period", "name": "Period",
                "map": { "Per Second": 1, "Per Minute": 60 },
                "type": ComponentHelper.FieldTypes.EnumField, }
        ];
    }

    EditorHelperFactory.registerEditorHelper(TextureScrollComponentHelper,
        TextureScrollComponent);
}
