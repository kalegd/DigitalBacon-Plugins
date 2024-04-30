/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

const { Assets, EditorHelpers, ProjectHandler } = window.DigitalBacon;
const { AssetEntity, Component } = Assets;
const { ComponentHelper, EditorHelperFactory } = EditorHelpers;

export default class AddComponent extends Component {
    constructor(params = {}) {
        params['assetId'] = AddComponent.assetId;
        super(params);
        this._topic = params['topic'] || '';
    }

    _getDefaultName() {
        return AddComponent.assetName;
    }

    exportParams() {
        let params = super.exportParams();
        params['topic'] = this._topic;
        return params;
    }

    get topic() { return this._topic; }

    set topic(topic) { this._topic = topic; }

    supports(asset) {
        return asset instanceof AssetEntity;
    }

    static assetId = '9339a01f-73de-490a-b81b-78ad3a155bb1';
    static assetName = 'Add Component';
}

ProjectHandler.registerAsset(AddComponent);

if(EditorHelpers) {
    class AddComponentHelper extends ComponentHelper {
        constructor(asset) {
            super(asset);
        }

        static fields = [
            { "parameter": "topic", "name": "Event", "singleLine": true,
                "type": ComponentHelper.FieldTypes.TextField },
        ];
    }

    EditorHelperFactory.registerEditorHelper(AddComponentHelper,
        AddComponent);
}
